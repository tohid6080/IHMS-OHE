'use client'

// ─── نمای فهرست پرونده‌ها با فیلتر و پیشرفت ───
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, FolderOpen, ListChecks, Printer, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { FinalOpinionBadge } from '@/components/common/StatusBadge'
import { Toggle } from '@/components/ui/toggle'
import { apiGet } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toFa } from '@/lib/jalali'
import { EXAM_TYPE_LABELS, GROUP_TYPE_LABELS, SECTION_DEFS } from '@/lib/constants'
import type { CaseListItem, Role } from '@/lib/types'

interface OrgOption { id: string; name: string }

const OUTSIDE_ROLES = ['EMPLOYER', 'CONTRACTOR']
// نقش‌های کارشناسی: فیلتر «فقط کارهای من» فقط برای آن‌ها نمایش داده می‌شود
const SPECIALIST_ROLES: Role[] = ['HSE', 'AUDIOLOGIST', 'OPTOMETRIST', 'LAB']
// وضعیت‌هایی که بخش هنوز «کار باز» محسوب می‌شود
const PENDING_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'NEEDS_CORRECTION', 'SENT_FOR_REVIEW']

export function CasesView() {
  const user = useAppStore((s) => s.user)
  const refreshKey = useAppStore((s) => s.refreshKey)
  const openCase = useAppStore((s) => s.openCase)
  const openPrint = useAppStore((s) => s.openPrint)
  const setView = useAppStore((s) => s.setView)
  const role = user?.role
  const isCentral = !!role && !OUTSIDE_ROLES.includes(role)
  const isSpecialist = !!role && SPECIALIST_ROLES.includes(role)

  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [examType, setExamType] = useState('all')
  const [status, setStatus] = useState('all')
  const [companyId, setCompanyId] = useState('all')
  const [contractorId, setContractorId] = useState('all')
  const [items, setItems] = useState<CaseListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [myOnly, setMyOnly] = useState(true) // فیلتر «فقط کارهای من» — پیش‌فرض روشن برای کارشناسان
  const [companies, setCompanies] = useState<OrgOption[]>([])
  const [contractors, setContractors] = useState<OrgOption[]>([])

  // debounce ساده جست‌وجو
  useEffect(() => {
    const t = setTimeout(() => {
      const v = qInput.trim()
      if (v !== q) {
        setQ(v)
        setLoading(true)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [qInput, q])

  useEffect(() => {
    let alive = true
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (examType !== 'all') params.set('examType', examType)
    if (status !== 'all') params.set('status', status)
    if (companyId !== 'all') params.set('companyId', companyId)
    if (contractorId !== 'all') params.set('contractorId', contractorId)
    apiGet<{ items: CaseListItem[] }>(`/api/cases?${params.toString()}`)
      .then((r) => {
        if (alive) setItems(r.items || [])
      })
      .catch((e) => {
        if (alive) toast.error(e instanceof Error ? e.message : 'خطا در دریافت پرونده‌ها')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [q, examType, status, companyId, contractorId, refreshKey])

  useEffect(() => {
    if (!isCentral) return
    apiGet<OrgOption[]>('/api/companies').then(setCompanies).catch(() => {})
    apiGet<OrgOption[]>('/api/contractors').then(setContractors).catch(() => {})
  }, [isCentral])

  const canCreate = role === 'ADMIN' || role === 'MANAGER'

  // بخش‌هایی که نقش من ثبت‌کننده آن‌هاست (HSE→۳، اپتومتری→۷-الف، ادیولوژی→۷-ب، آزمایشگاه→۶/۷-ج/۷-د)
  const mySectionKeys = useMemo(() => {
    if (!role) return new Set<string>()
    return new Set(SECTION_DEFS.filter((d) => d.editorRoles.includes(role)).map((d) => d.key as string))
  }, [role])

  // فهرست نمایش‌داده‌شده: در حالت «فقط کارهای من» پرونده‌هایی که کار باز برای من دارند
  const visibleItems = useMemo(() => {
    if (!isSpecialist || !myOnly) return items
    return items.filter((it) =>
      it.sections.some((s) => mySectionKeys.has(s.key) && PENDING_STATUSES.includes(s.status)),
    )
  }, [items, isSpecialist, myOnly, mySectionKeys])

  // شمار کارهای باز برای من (نشان شمارنده)
  const myPendingCount = useMemo(() => {
    if (!isSpecialist) return 0
    return items.filter((it) =>
      it.sections.some((s) => mySectionKeys.has(s.key) && PENDING_STATUSES.includes(s.status)),
    ).length
  }, [items, isSpecialist, mySectionKeys])

  const total = useMemo(() => visibleItems.length, [visibleItems])

  const printDraft = (it: CaseListItem) => !it.finalOpinion || it.finalOpinion === 'INCOMPLETE'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">پرونده‌ها</h1>
          {!loading && (
            <p className="text-sm text-muted-foreground">
              {toFa(total)} پرونده {total > 0 ? 'یافت شد' : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSpecialist && (
            <Toggle
              pressed={myOnly}
              onPressedChange={(v) => setMyOnly(v)}
              variant="outline"
              size="sm"
              aria-label="فقط کارهای من"
              className="data-[state=on]:border-teal-300 data-[state=on]:bg-teal-50 data-[state=on]:text-teal-800"
            >
              <ListChecks className="size-4" />
              فقط کارهای من
              <Badge className="bg-teal-600 px-1.5 text-white hover:bg-teal-600">{toFa(myPendingCount)}</Badge>
            </Toggle>
          )}
          {canCreate && (
            <Button onClick={() => setView('reception')} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="size-4" />
              پذیرش جدید
            </Button>
          )}
        </div>
      </div>

      {/* فیلترها */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="نام، کدملی یا شماره پرونده"
          className="lg:col-span-1"
        />
        <Select value={examType} onValueChange={(v) => { setExamType(v); setLoading(true) }}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">همه انواع معاینه</SelectItem>
            {Object.entries(EXAM_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setLoading(true) }}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            <SelectItem value="completed">تکمیل‌شده</SelectItem>
            <SelectItem value="inProgress">در جریان</SelectItem>
          </SelectContent>
        </Select>
        {isCentral && (
          <div className="grid grid-cols-2 gap-2 lg:col-span-1">
            <Select value={companyId} onValueChange={(v) => { setCompanyId(v); setLoading(true) }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="شرکت" /></SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">همه شرکت‌ها</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={contractorId} onValueChange={(v) => { setContractorId(v); setLoading(true) }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="پیمانکار" /></SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">همه پیمانکاران</SelectItem>
                {contractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* جدول */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead>شماره پرونده</TableHead>
              <TableHead>شاغل</TableHead>
              <TableHead>نوع معاینه</TableHead>
              <TableHead>محل کار / شغل</TableHead>
              <TableHead>شرکت / پیمانکار</TableHead>
              <TableHead>تاریخ مراجعه</TableHead>
              <TableHead className="w-32">پیشرفت</TableHead>
              <TableHead>نظریه</TableHead>
              <TableHead className="text-left">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                    <FolderOpen className="size-10 text-slate-300" />
                    <div className="text-sm">پرونده‌ای یافت نشد</div>
                    {canCreate && <div className="text-xs">برای شروع، یک پذیرش جدید ثبت کنید.</div>}
                  </div>
                </TableCell>
              </TableRow>
            ) : visibleItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                    <ListChecks className="size-10 text-slate-300" />
                    <div className="text-sm">مورد بازی برای شما وجود ندارد</div>
                    <div className="text-xs">برای مشاهده همه پرونده‌ها، فیلتر «فقط کارهای من» را خاموش کنید.</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              visibleItems.map((it) => (
                <TableRow
                  key={it.id}
                  className="cursor-pointer"
                  onClick={() => openCase(it.id)}
                >
                  <TableCell className="font-mono text-xs" dir="ltr">{toFa(it.caseNumber)}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{it.person.firstName} {it.person.lastName}</div>
                    <div className="font-mono text-xs text-muted-foreground" dir="ltr">{toFa(it.person.nationalId)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                      {EXAM_TYPE_LABELS[it.examType] || it.examType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{it.workPlace}</div>
                    <div className="text-xs text-muted-foreground">{it.jobTitle}</div>
                  </TableCell>
                  <TableCell>
                      <div className="text-sm">{it.company?.name || '—'}</div>
                      <div className="text-xs text-muted-foreground">
                        {it.contractor ? `${it.contractor.name} — ${GROUP_TYPE_LABELS[it.groupType] || ''}` : GROUP_TYPE_LABELS[it.groupType] || '—'}
                      </div>
                    </TableCell>
                  <TableCell className="text-sm">{toFa(it.visitDate)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={it.progress} className="w-24" />
                      <span className="text-xs text-muted-foreground">{toFa(it.progress)}٪</span>
                    </div>
                  </TableCell>
                  <TableCell><FinalOpinionBadge opinion={it.finalOpinion} /></TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" aria-label="مشاهده پرونده" onClick={() => openCase(it.id)}>
                        <Eye className="size-4" />
                      </Button>
                      { (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="چاپ گزارش"
                          onClick={() => openPrint(it.id, printDraft(it))}
                        >
                          <Printer className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
