'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  FolderOpen,
  ListChecks,
  Share2,
  Users,
  type LucideIcon,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { apiGet, ApiError } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toFa } from '@/lib/jalali'
import { EXAM_TYPE_LABELS, SECTION_DEFS } from '@/lib/constants'
import { sectionTitle } from '@/lib/case-utils'
import type { CaseListItem, Role, SectionKey } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { JalaliDateInput } from '@/components/common/JalaliDateInput'
import { FinalOpinionBadge } from '@/components/common/StatusBadge'

// ─── انواع داده stats (مطابق قرارداد GET /api/stats) ───
interface StatsData {
  totals: {
    cases: number
    completed: number
    incomplete: number
    openItems: number
    pendingReferrals: number
    persons: number
  }
  byFinalOpinion: { key: string; label: string; count: number }[]
  byExamType: { key: string; label: string; count: number }[]
  byMonth: { label: string; count: number; completed: number }[]
  byCompany: { name: string; count: number }[]
  byContractor: { name: string; count: number; completed: number }[]
  byJob: { name: string; count: number }[]
  openItems: {
    key: string
    label: string
    responsibleRole: string
    responsibleLabel: string
    count: number
  }[]
  sectionsMatrix: MatrixRow[]
}

interface OrgOption {
  id: string
  name: string
}

type MatrixStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SENT_FOR_REVIEW'
  | 'NEEDS_CORRECTION'
  | 'APPROVED'
  | 'NOT_APPLICABLE'

interface MatrixRow {
  key: string
  title: string
  NOT_STARTED: number
  IN_PROGRESS: number
  SENT_FOR_REVIEW: number
  NEEDS_CORRECTION: number
  APPROVED: number
  NOT_APPLICABLE: number
}

const ALL = '__all__'

// نقش‌های کارشناسی: کارت «کارهای من» فقط برای آن‌ها نمایش داده می‌شود
const SPECIALIST_ROLES: Role[] = ['HSE', 'AUDIOLOGIST', 'OPTOMETRIST', 'LAB']
// وضعیت‌هایی که بخش هنوز «کار باز» محسوب می‌شود
const PENDING_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'NEEDS_CORRECTION', 'SENT_FOR_REVIEW']

const OPINION_COLORS: Record<string, string> = {
  FIT: '#059669',
  CONDITIONAL: '#d97706',
  UNFIT: '#e11d48',
  INCOMPLETE: '#64748b',
  NONE: '#cbd5e1',
}

const MATRIX_COLORS: { key: MatrixStatus; label: string; cls: string; text: string }[] = [
  { key: 'APPROVED', label: 'تأیید شده', cls: 'bg-emerald-500', text: 'text-white' },
  { key: 'SENT_FOR_REVIEW', label: 'ارسال برای بررسی', cls: 'bg-cyan-400', text: 'text-slate-900' },
  { key: 'IN_PROGRESS', label: 'در حال انجام', cls: 'bg-amber-400', text: 'text-slate-900' },
  { key: 'NEEDS_CORRECTION', label: 'نیازمند اصلاح', cls: 'bg-rose-400', text: 'text-white' },
  { key: 'NOT_STARTED', label: 'انجام نشده', cls: 'bg-slate-300', text: 'text-slate-700' },
  { key: 'NOT_APPLICABLE', label: 'نامرتبط', cls: 'bg-slate-200', text: 'text-slate-500' },
]

const KPI_TONES: Record<string, string> = {
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
}

function KpiCard({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone: string }) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${KPI_TONES[tone]}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold tabular-nums leading-none">{toFa(value)}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardView() {
  const user = useAppStore((s) => s.user)
  const role = user?.role
  const refreshKey = useAppStore((s) => s.refreshKey)
  const openCase = useAppStore((s) => s.openCase)
  const setView = useAppStore((s) => s.setView)
  const isSpecialist = !!role && SPECIALIST_ROLES.includes(role)

  // بخش‌هایی که نقش من ثبت‌کننده آن‌هاست (HSE→۳، اپتومتری→۷-الف، ادیولوژی→۷-ب، آزمایشگاه→۶/۷-ج/۷-د)
  const mySectionKeys = useMemo(() => {
    if (!role) return new Set<string>()
    return new Set(SECTION_DEFS.filter((d) => d.editorRoles.includes(role)).map((d) => d.key as string))
  }, [role])

  // ─── فیلترها ───
  const [companyId, setCompanyId] = useState('')
  const [contractorId, setContractorId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [examType, setExamType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // ─── داده‌ها ───
  const [companies, setCompanies] = useState<OrgOption[]>([])
  const [contractors, setContractors] = useState<OrgOption[]>([])
  const [projects, setProjects] = useState<OrgOption[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [recentCases, setRecentCases] = useState<CaseListItem[]>([])
  const [loadingCases, setLoadingCases] = useState(true)
  const [myCases, setMyCases] = useState<CaseListItem[]>([])
  const [loadingMyCases, setLoadingMyCases] = useState(true)

  // لیست سازمان‌ها برای فیلترها
  useEffect(() => {
    apiGet<OrgOption[]>('/api/companies').then(setCompanies).catch(() => setCompanies([]))
    apiGet<OrgOption[]>('/api/contractors').then(setContractors).catch(() => setContractors([]))
    apiGet<OrgOption[]>('/api/projects').then(setProjects).catch(() => setProjects([]))
  }, [refreshKey])

  // آماره‌ها
  useEffect(() => {
    let cancelled = false
    const p = new URLSearchParams()
    if (companyId) p.set('companyId', companyId)
    if (contractorId) p.set('contractorId', contractorId)
    if (projectId) p.set('projectId', projectId)
    if (examType) p.set('examType', examType)
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    const qs = p.toString()
    apiGet<StatsData>(`/api/stats${qs ? `?${qs}` : ''}`)
      .then((d) => {
        if (!cancelled) setStats(d)
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(e instanceof ApiError ? e.message : 'خطا در دریافت آمار')
          setStats(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStats(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyId, contractorId, projectId, examType, from, to, refreshKey])

  // آخرین پرونده‌ها
  useEffect(() => {
    let cancelled = false
    apiGet<{ items: CaseListItem[] }>('/api/cases?limit=8')
      .then((d) => {
        if (!cancelled) setRecentCases(d.items || [])
      })
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof ApiError ? e.message : 'خطا در دریافت پرونده‌ها')
      })
      .finally(() => {
        if (!cancelled) setLoadingCases(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  // کارهای من (کارشناسان): پرونده‌هایی که حداقل یکی از بخش‌های من در آن‌ها کار باز دارد
  useEffect(() => {
    if (!isSpecialist) return
    let cancelled = false
    apiGet<{ items: CaseListItem[] }>('/api/cases')
      .then((d) => {
        if (cancelled) return
        setMyCases(
          (d.items || []).filter((it) =>
            it.sections.some((s) => mySectionKeys.has(s.key) && PENDING_STATUSES.includes(s.status)),
          ),
        )
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(e instanceof ApiError ? e.message : 'خطا در دریافت کارهای من')
          setMyCases([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMyCases(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey, isSpecialist, mySectionKeys])

  const tooltipStyle = {
    direction: 'rtl' as const,
    fontFamily: 'inherit',
    fontSize: 12,
    borderRadius: 10,
    border: '1px solid #e2e8f0',
  }

  const activeFilters = useMemo(
    () =>
      [
        companies.find((c) => c.id === companyId)?.name,
        contractors.find((c) => c.id === contractorId)?.name,
        projects.find((c) => c.id === projectId)?.name,
        examType ? EXAM_TYPE_LABELS[examType] : '',
        from ? `از ${toFa(from)}` : '',
        to ? `تا ${toFa(to)}` : '',
      ].filter(Boolean) as string[],
    [companies, contractors, projects, companyId, contractorId, projectId, examType, from, to],
  )

  return (
    <div dir="rtl" className="space-y-6">
      {/* ─── عنوان و فیلترها ─── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-teal-950">داشبورد</h1>
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeFilters.map((f) => (
                <Badge key={f} variant="secondary" className="font-normal">
                  {f}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Card className="gap-3 py-4">
          <CardContent className="grid grid-cols-2 gap-3 px-4 md:grid-cols-3 xl:grid-cols-6">
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">شرکت</span>
              <Select value={companyId || ALL} onValueChange={(v) => { setCompanyId(v === ALL ? '' : v); setLoadingCases(true) }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="همه شرکت‌ها" /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value={ALL}>همه شرکت‌ها</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">پیمانکار</span>
              <Select value={contractorId || ALL} onValueChange={(v) => { setContractorId(v === ALL ? '' : v); setLoadingCases(true) }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="همه پیمانکاران" /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value={ALL}>همه پیمانکاران</SelectItem>
                  {contractors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">پروژه</span>
              <Select value={projectId || ALL} onValueChange={(v) => { setProjectId(v === ALL ? '' : v); setLoadingCases(true) }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="همه پروژه‌ها" /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value={ALL}>همه پروژه‌ها</SelectItem>
                  {projects.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">نوع معاینه</span>
              <Select value={examType || ALL} onValueChange={(v) => { setExamType(v === ALL ? '' : v); setLoadingCases(true) }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="همه انواع" /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value={ALL}>همه انواع</SelectItem>
                  {Object.entries(EXAM_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">از تاریخ</span>
              <JalaliDateInput value={from} onChange={(v) => { setFrom(v); setLoadingCases(true) }} />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">تا تاریخ</span>
              <JalaliDateInput value={to} onChange={(v) => { setTo(v); setLoadingCases(true) }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── کارت‌های KPI ─── */}
      {loadingStats || !stats ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard icon={FolderOpen} label="پرونده‌ها" value={stats.totals.cases} tone="teal" />
          <KpiCard icon={CheckCircle2} label="تکمیل‌شده" value={stats.totals.completed} tone="emerald" />
          <KpiCard icon={Clock} label="در جریان / ناتمام" value={stats.totals.incomplete} tone="amber" />
          <KpiCard icon={AlertTriangle} label="موارد باز" value={stats.totals.openItems} tone="rose" />
          <KpiCard icon={Share2} label="ارجاع‌های در انتظار" value={stats.totals.pendingReferrals} tone="cyan" />
          <KpiCard icon={Users} label="مراجعه‌کنندگان یکتا" value={stats.totals.persons} tone="slate" />
        </div>
      )}

      {/* ─── کارهای من (فقط کارشناسان) ─── */}
      {isSpecialist && (
        <Card className="gap-3 border-teal-200 py-4">
          <CardHeader className="px-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ListChecks className="size-4 text-teal-600" />
                کارهای من
                {!loadingMyCases && myCases.length > 0 && (
                  <Badge className="bg-teal-600 px-1.5 text-white hover:bg-teal-600">{toFa(myCases.length)}</Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-teal-700 hover:bg-teal-50 hover:text-teal-800"
                onClick={() => setView('cases')}
              >
                مشاهده همه
                <ArrowLeft className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4">
            {loadingMyCases ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : myCases.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">مورد باز برای شما وجود ندارد</p>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto scrollbar-thin">
                {myCases.slice(0, 10).map((c) => {
                  const pending = c.sections
                    .filter((s) => mySectionKeys.has(s.key) && PENDING_STATUSES.includes(s.status))
                    .map((s) => sectionTitle(s.key as SectionKey))
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => openCase(c.id)}
                      className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg border bg-slate-50/60 p-3 text-right transition-colors hover:border-teal-300 hover:bg-teal-50/60"
                      title="باز کردن پرونده"
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-slate-500" dir="ltr">{toFa(c.caseNumber)}</span>
                        <span className="text-sm font-medium">
                          {c.person.firstName} {c.person.lastName}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {pending.map((p) => (
                          <Badge
                            key={p}
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-[10px] font-normal text-amber-700"
                          >
                            {p}
                          </Badge>
                        ))}
                        <Eye className="size-4 shrink-0 text-teal-600" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── نمودارها ─── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">روند ماهانه (۷ ماه اخیر)</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {loadingStats || !stats ? (
              <Skeleton className="h-[220px] rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.byMonth} margin={{ top: 8, left: 0, right: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    reversed
                    tickFormatter={(v: string) => toFa(v)}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    orientation="right"
                    allowDecimals={false}
                    tickFormatter={(v: number) => toFa(v)}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => toFa(Number(v))}
                    labelFormatter={(l) => toFa(String(l))}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" name="پرونده‌ها" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="completed" name="تکمیل‌شده" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">توزیع نظریه نهایی</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {loadingStats || !stats ? (
              <Skeleton className="h-[220px] rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stats.byFinalOpinion}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={78}
                    paddingAngle={2}
                    strokeWidth={1}
                  >
                    {stats.byFinalOpinion.map((d) => (
                      <Cell key={d.key} fill={OPINION_COLORS[d.key] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => toFa(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── ماتریس وضعیت بخش‌ها ─── */}
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-sm">وضعیت بخش‌های پرونده‌ها</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 px-4">
          {loadingStats || !stats ? (
            <div className="space-y-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 rounded-md" />
              ))}
            </div>
          ) : (
            stats.sectionsMatrix.map((row) => {
              const total = MATRIX_COLORS.reduce((sum, c) => sum + row[c.key], 0)
              return (
                <div key={row.key} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-xs text-muted-foreground sm:w-44" title={row.title}>
                    {row.title}
                  </span>
                  <div className="flex h-5 flex-1 overflow-hidden rounded-md bg-slate-100" dir="rtl">
                    {MATRIX_COLORS.map((c) => {
                      const count = row[c.key]
                      if (!count || !total) return null
                      return (
                        <div
                          key={c.key}
                          className={`flex items-center justify-center ${c.cls} ${c.text} overflow-hidden whitespace-nowrap transition-all`}
                          style={{ width: `${(count / total) * 100}%` }}
                          title={`${c.label}: ${toFa(count)}`}
                        >
                          {(count / total) > 0.08 && (
                            <span className="text-[10px] font-semibold">{toFa(count)}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <span className="w-10 shrink-0 text-left text-xs font-bold tabular-nums text-slate-600">
                    {toFa(total)}
                  </span>
                </div>
              )
            })
          )}
          {/* راهنمای رنگ‌ها */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px] text-muted-foreground">
            {MATRIX_COLORS.map((c) => (
              <span key={c.key} className="flex items-center gap-1.5">
                <span className={`inline-block size-2.5 rounded-sm ${c.cls}`} />
                {c.label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─── موارد باز ─── */}
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-sm">موارد باز نیازمند پیگیری</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {loadingStats || !stats ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : stats.openItems.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">مورد بازی وجود ندارد ✨</p>
          ) : (
            <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto scrollbar-thin sm:grid-cols-2 lg:grid-cols-3">
              {stats.openItems.map((it) => (
                <div
                  key={it.key}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-slate-50/60 p-3"
                  title="برای پیگیری، پرونده مربوطه را باز کنید"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="truncate text-xs font-medium text-slate-700" title={it.label}>
                      {it.label}
                    </div>
                    <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 text-[10px]">
                      {it.responsibleLabel}
                    </Badge>
                  </div>
                  <span className="shrink-0 text-xl font-bold tabular-nums text-rose-600">{toFa(it.count)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── آخرین پرونده‌ها ─── */}
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-sm">آخرین پرونده‌ها</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {loadingCases ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-md" />
              ))}
            </div>
          ) : recentCases.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">پرونده‌ای ثبت نشده است</p>
          ) : (
            <div className="max-h-96 overflow-y-auto scrollbar-thin rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-right font-medium">شماره</th>
                    <th className="px-3 py-2 text-right font-medium">نام</th>
                    <th className="hidden md:table-cell px-3 py-2 text-right font-medium">نوع معاینه</th>
                    <th className="hidden lg:table-cell px-3 py-2 text-right font-medium">شرکت / پیمانکار</th>
                    <th className="hidden sm:table-cell px-3 py-2 text-right font-medium">تاریخ مراجعه</th>
                    <th className="px-3 py-2 text-right font-medium">پیشرفت</th>
                    <th className="px-3 py-2 text-right font-medium">نظریه</th>
                    <th className="px-3 py-2 text-center font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentCases.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-3 py-2 font-mono text-xs" dir="ltr">{toFa(c.caseNumber)}</td>
                      <td className="px-3 py-2 font-medium">
                        {c.person.firstName} {c.person.lastName}
                      </td>
                      <td className="hidden md:table-cell px-3 py-2 text-xs text-muted-foreground">
                        {EXAM_TYPE_LABELS[c.examType] || c.examType}
                      </td>
                      <td className="hidden lg:table-cell px-3 py-2 text-xs text-muted-foreground">
                        {c.company?.name || c.contractor?.name || c.project?.name || '—'}
                      </td>
                      <td className="hidden sm:table-cell px-3 py-2 text-xs tabular-nums">{toFa(c.visitDate)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Progress value={c.progress} className="h-2 w-16" />
                          <span className="text-[10px] tabular-nums text-muted-foreground">{toFa(c.progress)}٪</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <FinalOpinionBadge opinion={c.finalOpinion} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button variant="ghost" size="icon" className="size-7 text-teal-700 hover:text-teal-800 hover:bg-teal-50" onClick={() => openCase(c.id)} aria-label="مشاهده پرونده">
                          <Eye className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
