'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle as AlertIcon,
  CheckCircle2 as CheckCircleIcon,
  Clock as ClockIcon,
  FileDown,
  FolderOpen as FolderOpenIcon,
  Loader2,
  Printer,
  Share2 as ShareIcon,
  Users as UsersIcon,
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
import { toFa, todayJalali } from '@/lib/jalali'
import { DEFAULT_CENTER, EXAM_TYPE_LABELS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { JalaliDateInput } from '@/components/common/JalaliDateInput'

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
  openItems: { key: string; label: string; responsibleRole: string; responsibleLabel: string; count: number }[]
  sectionsMatrix: MatrixRow[]
}

interface OrgOption {
  id: string
  name: string
}

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

const OPINION_COLORS: Record<string, string> = {
  FIT: '#059669',
  CONDITIONAL: '#d97706',
  UNFIT: '#e11d48',
  INCOMPLETE: '#64748b',
  NONE: '#cbd5e1',
}

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

export function ReportsView() {
  const refreshKey = useAppStore((s) => s.refreshKey)

  // ─── فیلترها ───
  const [companyId, setCompanyId] = useState('')
  const [contractorId, setContractorId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [examType, setExamType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [companies, setCompanies] = useState<OrgOption[]>([])
  const [contractors, setContractors] = useState<OrgOption[]>([])
  const [projects, setProjects] = useState<OrgOption[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  // اطلاعات مرکز برای سربرگ چاپ (قرارداد: localStorage 'hoyateb_center')
  const [center, setCenter] = useState(DEFAULT_CENTER)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hoyateb_center')
      if (raw) setCenter({ ...DEFAULT_CENTER, ...JSON.parse(raw) })
    } catch {
      /* پیش‌فرض */
    }
  }, [])

  useEffect(() => {
    apiGet<OrgOption[]>('/api/companies').then(setCompanies).catch(() => setCompanies([]))
    apiGet<OrgOption[]>('/api/contractors').then(setContractors).catch(() => setContractors([]))
    apiGet<OrgOption[]>('/api/projects').then(setProjects).catch(() => setProjects([]))
  }, [refreshKey])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
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
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyId, contractorId, projectId, examType, from, to, refreshKey])

  const filterText = useMemo(() => {
    const parts: string[] = []
    const c = companies.find((x) => x.id === companyId)?.name
    const ct = contractors.find((x) => x.id === contractorId)?.name
    const pj = projects.find((x) => x.id === projectId)?.name
    if (c) parts.push(`شرکت: ${c}`)
    if (ct) parts.push(`پیمانکار: ${ct}`)
    if (pj) parts.push(`پروژه: ${pj}`)
    if (examType) parts.push(`نوع معاینه: ${EXAM_TYPE_LABELS[examType]}`)
    if (from) parts.push(`از تاریخ: ${toFa(from)}`)
    if (to) parts.push(`تا تاریخ: ${toFa(to)}`)
    return parts.length ? parts.join(' — ') : 'همه پرونده‌ها (بدون فیلتر)'
  }, [companies, contractors, projects, companyId, contractorId, projectId, examType, from, to])

  // ─── خروجی PowerPoint ───
  const [pptLoading, setPptLoading] = useState(false)
  async function exportPptx() {
    if (!stats) return
    setPptLoading(true)
    try {
      const { default: PptxGenJS } = await import('pptxgenjs')
      const pptx = new PptxGenJS()
      pptx.rtlMode = true

      const teal = '0F766E'
      const slate = '475569'
      const border = { type: 'solid' as const, pt: 0.5, color: 'CBD5E1' }

      // ── اسلاید ۱: عنوان + شاخص‌های کلیدی ──
      const s1 = pptx.addSlide()
      s1.addText(center.orgLine1, { x: 0.5, y: 0.25, w: 9, h: 0.35, align: 'center', fontFace: 'Tahoma', fontSize: 11, color: slate, rtlMode: true })
      s1.addText('گزارش آماری معاینات طب کار', { x: 0.5, y: 0.6, w: 9, h: 0.7, align: 'center', fontFace: 'Tahoma', fontSize: 24, bold: true, color: teal, rtlMode: true })
      s1.addText(`تاریخ گزارش: ${toFa(todayJalali())}  |  ${filterText}`, { x: 0.5, y: 1.3, w: 9, h: 0.4, align: 'center', fontFace: 'Tahoma', fontSize: 10, color: '64748B', rtlMode: true })

      const kpiRows: [string, string][] = [
        ['تعداد پرونده‌ها', toFa(stats.totals.cases)],
        ['پرونده‌های تکمیل‌شده', toFa(stats.totals.completed)],
        ['در جریان / ناتمام', toFa(stats.totals.incomplete)],
        ['موارد باز', toFa(stats.totals.openItems)],
        ['ارجاع‌های در انتظار', toFa(stats.totals.pendingReferrals)],
        ['مراجعه‌کنندگان یکتا', toFa(stats.totals.persons)],
      ]
      s1.addTable(
        [
          [
            { text: 'شاخص', options: { bold: true, fill: { color: teal }, color: 'FFFFFF', align: 'center' as const, fontFace: 'Tahoma' } },
            { text: 'مقدار', options: { bold: true, fill: { color: teal }, color: 'FFFFFF', align: 'center' as const, fontFace: 'Tahoma' } },
          ],
          ...kpiRows.map(([k, v]) => [
            { text: k, options: { align: 'right' as const, fontFace: 'Tahoma', rtlMode: true } },
            { text: v, options: { align: 'center' as const, fontFace: 'Tahoma' } },
          ]),
        ],
        { x: 2.5, y: 1.9, w: 5, colW: [3, 2], fontFace: 'Tahoma', fontSize: 12, border, valign: 'middle' as const },
      )

      // ── اسلاید ۲: مقایسه پیمانکاران ──
      const s2 = pptx.addSlide()
      s2.addText('مقایسه پیمانکاران', { x: 0.5, y: 0.4, w: 9, h: 0.6, align: 'center', fontFace: 'Tahoma', fontSize: 20, bold: true, color: teal, rtlMode: true })
      const contractorRows = [
        ['پیمانکار', 'تعداد پرونده', 'تکمیل‌شده', 'نرخ تکمیل'].map((t) => ({
          text: t,
          options: { bold: true, fill: { color: teal }, color: 'FFFFFF', align: 'center' as const, fontFace: 'Tahoma' },
        })),
        ...stats.byContractor.map((c) => {
          const rate = c.count ? Math.round((c.completed / c.count) * 100) : 0
          return [
            { text: c.name, options: { align: 'right' as const, fontFace: 'Tahoma', rtlMode: true } },
            { text: toFa(c.count), options: { align: 'center' as const, fontFace: 'Tahoma' } },
            { text: toFa(c.completed), options: { align: 'center' as const, fontFace: 'Tahoma' } },
            { text: `${toFa(rate)}٪`, options: { align: 'center' as const, fontFace: 'Tahoma' } },
          ]
        }),
      ]
      if (stats.byContractor.length === 0) {
        s2.addText('داده‌ای برای مقایسه پیمانکاران وجود ندارد', { x: 1, y: 2.5, w: 8, h: 0.6, align: 'center', fontFace: 'Tahoma', fontSize: 14, color: slate, rtlMode: true })
      } else {
        s2.addTable(contractorRows, { x: 0.7, y: 1.4, w: 8.6, colW: [3.8, 1.7, 1.6, 1.5], fontFace: 'Tahoma', fontSize: 11, border, valign: 'middle' as const })
      }

      // ── اسلاید ۳: توزیع نظریه نهایی ──
      const s3 = pptx.addSlide()
      s3.addText('توزیع نظریه نهایی', { x: 0.5, y: 0.4, w: 9, h: 0.6, align: 'center', fontFace: 'Tahoma', fontSize: 20, bold: true, color: teal, rtlMode: true })
      stats.byFinalOpinion.forEach((d, i) => {
        const hex = (OPINION_COLORS[d.key] || '#334155').replace('#', '').toUpperCase()
        s3.addText(`${d.label}: ${toFa(d.count)} پرونده`, {
          x: 2,
          y: 1.5 + i * 0.75,
          w: 6,
          h: 0.6,
          align: 'center',
          fontFace: 'Tahoma',
          fontSize: 16,
          bold: d.key !== 'NONE',
          color: hex,
          rtlMode: true,
        })
      })

      await pptx.writeFile({ fileName: `occupational-report-${Date.now()}.pptx` })
      toast.success('فایل PowerPoint با موفقیت ساخته شد')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'خطا در ساخت فایل PowerPoint')
    } finally {
      setPptLoading(false)
    }
  }

  const tooltipStyle = {
    direction: 'rtl' as const,
    fontFamily: 'inherit',
    fontSize: 12,
    borderRadius: 10,
    border: '1px solid #e2e8f0',
  }

  const thCls = 'px-3 py-2 text-right text-xs font-medium text-muted-foreground'

  return (
    <div dir="rtl" className="space-y-6">
      {/* ─── سربرگ صفحه (چاپ نمی‌شود) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <h1 className="text-xl font-bold text-teal-950">گزارش‌ها و آمار</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="no-print" onClick={() => window.print()} disabled={loading || !stats}>
            <Printer className="size-4" /> چاپ / PDF
          </Button>
          <Button size="sm" className="bg-teal-700 hover:bg-teal-800" onClick={exportPptx} disabled={pptLoading || loading || !stats}>
            {pptLoading ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            خروجی PowerPoint
          </Button>
        </div>
      </div>

      {/* ─── فیلترها (چاپ نمی‌شود) ─── */}
      <Card className="no-print gap-3 py-4">
        <CardContent className="grid grid-cols-2 gap-3 px-4 md:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">شرکت</span>
            <Select value={companyId || ALL} onValueChange={(v) => setCompanyId(v === ALL ? '' : v)}>
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
            <Select value={contractorId || ALL} onValueChange={(v) => setContractorId(v === ALL ? '' : v)}>
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
            <Select value={projectId || ALL} onValueChange={(v) => setProjectId(v === ALL ? '' : v)}>
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
            <Select value={examType || ALL} onValueChange={(v) => setExamType(v === ALL ? '' : v)}>
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
            <JalaliDateInput value={from} onChange={setFrom} />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">تا تاریخ</span>
            <JalaliDateInput value={to} onChange={setTo} />
          </div>
        </CardContent>
      </Card>

      {/* ═══ محدوده چاپ ═══ */}
      <div id="print-area" className="space-y-6">
        {/* سربرگ چاپ */}
        <div className="hidden border-b border-slate-300 pb-3 text-center print:block">
          <p className="text-sm font-bold text-slate-700">{center.orgLine1}</p>
          <p className="text-sm text-slate-600">{center.orgLine2}</p>
          <p className="text-xs text-slate-500">{center.orgLine3}</p>
          {(center.address || center.phone) && (
            <p className="mt-1 text-xs text-slate-500">
              {center.address}
              {center.address && center.phone ? ' — ' : ''}
              {center.phone ? `تلفن: ${toFa(center.phone)}` : ''}
            </p>
          )}
        </div>

        <div className="text-center">
          <h2 className="text-lg font-bold text-teal-900">گزارش آماری معاینات طب کار</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            تاریخ گزارش: {toFa(todayJalali())} — {filterText}
          </p>
        </div>

        {/* KPI */}
        {loading || !stats ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard icon={FolderOpenIcon} label="پرونده‌ها" value={stats.totals.cases} tone="teal" />
            <KpiCard icon={CheckCircleIcon} label="تکمیل‌شده" value={stats.totals.completed} tone="emerald" />
            <KpiCard icon={ClockIcon} label="در جریان / ناتمام" value={stats.totals.incomplete} tone="amber" />
            <KpiCard icon={AlertIcon} label="موارد باز" value={stats.totals.openItems} tone="rose" />
            <KpiCard icon={ShareIcon} label="ارجاع‌های در انتظار" value={stats.totals.pendingReferrals} tone="cyan" />
            <KpiCard icon={UsersIcon} label="مراجعه‌کنندگان یکتا" value={stats.totals.persons} tone="slate" />
          </div>
        )}

        {/* نمودار ماهانه */}
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">روند ماهانه (۷ ماه اخیر)</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {loading || !stats ? (
              <Skeleton className="h-[220px] rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.byMonth} margin={{ top: 8, left: 0, right: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" reversed tickFormatter={(v: string) => toFa(v)} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis orientation="right" allowDecimals={false} tickFormatter={(v: number) => toFa(v)} fontSize={11} tickLine={false} axisLine={false} width={36} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => toFa(Number(v))} labelFormatter={(l) => toFa(String(l))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" name="پرونده‌ها" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="completed" name="تکمیل‌شده" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* مقایسه پیمانکاران */}
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">مقایسه پیمانکاران</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              {loading || !stats ? (
                <Skeleton className="h-40 rounded-lg" />
              ) : stats.byContractor.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">پیمانکاری دارای پرونده یافت نشد</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/70">
                      <tr>
                        <th className={thCls}>پیمانکار</th>
                        <th className={thCls}>تعداد</th>
                        <th className={thCls}>تکمیل‌شده</th>
                        <th className={thCls}>نرخ تکمیل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {stats.byContractor.map((c) => {
                        const rate = c.count ? Math.round((c.completed / c.count) * 100) : 0
                        return (
                          <tr key={c.name} className="hover:bg-muted/40">
                            <td className="px-3 py-2 font-medium">{c.name}</td>
                            <td className="px-3 py-2 tabular-nums">{toFa(c.count)}</td>
                            <td className="px-3 py-2 tabular-nums">{toFa(c.completed)}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Progress value={rate} className="h-2 w-20" />
                                <span className="text-xs tabular-nums text-muted-foreground">{toFa(rate)}٪</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* توزیع نظریه نهایی */}
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">توزیع نظریه نهایی</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              {loading || !stats ? (
                <Skeleton className="h-[220px] rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={stats.byFinalOpinion} dataKey="count" nameKey="label" innerRadius={45} outerRadius={78} paddingAngle={2} strokeWidth={1}>
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

        <div className="grid gap-4 lg:grid-cols-2">
          {/* پرتکرارترین مشاغل */}
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">پرتکرارترین مشاغل</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              {loading || !stats ? (
                <Skeleton className="h-40 rounded-lg" />
              ) : stats.byJob.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">داده‌ای موجود نیست</p>
              ) : (
                <div className="max-h-72 overflow-y-auto scrollbar-thin rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                      <tr>
                        <th className={thCls}>شغل</th>
                        <th className={thCls}>تعداد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {stats.byJob.map((j) => (
                        <tr key={j.name} className="hover:bg-muted/40">
                          <td className="px-3 py-2">{j.name}</td>
                          <td className="px-3 py-2 tabular-nums font-semibold text-teal-700">{toFa(j.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* آمار به تفکیک شرکت */}
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">آمار به تفکیک شرکت</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              {loading || !stats ? (
                <Skeleton className="h-40 rounded-lg" />
              ) : stats.byCompany.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">داده‌ای موجود نیست</p>
              ) : (
                <div className="max-h-72 overflow-y-auto scrollbar-thin rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                      <tr>
                        <th className={thCls}>شرکت</th>
                        <th className={thCls}>تعداد پرونده</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {stats.byCompany.map((c) => (
                        <tr key={c.name} className="hover:bg-muted/40">
                          <td className="px-3 py-2">{c.name}</td>
                          <td className="px-3 py-2 tabular-nums font-semibold text-teal-700">{toFa(c.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          صادرشده از سامانه مدیریت معاینات طب کار — نسخه ۱.۰
        </p>
      </div>

      {/* فیلترهای فعال به‌صورت چیپ (خارج از چاپ) */}
      <div className="no-print flex flex-wrap gap-1.5">
        {filterText !== 'همه پرونده‌ها (بدون فیلتر)' &&
          filterText.split(' — ').map((f) => (
            <Badge key={f} variant="secondary" className="font-normal">{f}</Badge>
          ))}
      </div>
    </div>
  )
}
