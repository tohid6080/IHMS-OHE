'use client'

// ─── نمای جزئیات پرونده: هدر + بخش ۱ + آکاردئون بخش‌های ۲ تا ۹ + تاریخچه ───
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Alert, AlertDescription, AlertTitle,
} from '@/components/ui/alert'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertTriangle, ArrowRight, Briefcase, Building2, CalendarDays, CheckCircle2,
  DoorClosed, Factory, FileText, FolderKanban, HardHat, Hash, Info, Loader2, Save, ShieldAlert, Stamp, Trash2,
} from 'lucide-react'
import { JalaliDateInput } from '@/components/common/JalaliDateInput'
import { StatusBadge, FinalOpinionBadge } from '@/components/common/StatusBadge'
import { Section2Form } from '@/components/sections/Section2Form'
import { Section3Form } from '@/components/sections/Section3Form'
import { Section4Form } from '@/components/sections/Section4Form'
import { Section5Form } from '@/components/sections/Section5Form'
import { Section6Form } from '@/components/sections/Section6Form'
import { Section7AForm } from '@/components/sections/Section7AForm'
import { Section7BForm } from '@/components/sections/Section7BForm'
import { Section7CForm } from '@/components/sections/Section7CForm'
import { Section7DForm } from '@/components/sections/Section7DForm'
import { Section8Form } from '@/components/sections/Section8Form'
import { Section9Form } from '@/components/sections/Section9Form'
import { ApiError, apiGet, apiPatch } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { calcAge, formatJalaliDateTime, toEn, toFa } from '@/lib/jalali'
import { sectionTitle, visibleSectionsFor } from '@/lib/case-utils'
import {
  EDUCATION_OPTIONS, EXAM_TYPE_LABELS, GENDER_LABELS, GROUP_TYPE_LABELS, MARITAL_LABELS,
  MILITARY_LABELS, ROLE_LABELS, SECTION_DEFS, SECTION_RESPONSIBLE,
} from '@/lib/constants'
import type { CaseDetailDTO, Role, SectionDTO, SectionKey } from '@/lib/types'

interface OrgOption { id: string; name: string }

// نقش‌های کارشناسی: فقط بخش‌های مرتبط با نقش خود را می‌بینند
const SPECIALIST_ROLES: Role[] = ['HSE', 'AUDIOLOGIST', 'OPTOMETRIST', 'LAB']

// ─── تبدیل عکس به dataURL با بیشینه ۲۴۰ پیکسل ───
function resizePhoto(file: File, done: (dataUrl: string) => void) {
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const max = 240
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, w, h)
      done(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = String(reader.result)
  }
  reader.readAsDataURL(file)
}

// ─── سوئیچ فرم متناظر هر بخش ───
function SectionForm({
  sectionKey, caseId, section, caseData, onSaved,
}: {
  sectionKey: SectionKey
  caseId: string
  section: SectionDTO | undefined
  caseData: CaseDetailDTO
  onSaved: () => void
}) {
  const props = { caseId, section, caseData, onSaved }
  switch (sectionKey) {
    case 'S2': return <Section2Form {...props} />
    case 'S3': return <Section3Form {...props} />
    case 'S4': return <Section4Form {...props} />
    case 'S5': return <Section5Form {...props} />
    case 'S6': return <Section6Form {...props} />
    case 'S7A': return <Section7AForm {...props} />
    case 'S7B': return <Section7BForm {...props} />
    case 'S7C': return <Section7CForm {...props} />
    case 'S7D': return <Section7DForm {...props} />
    case 'S8': return <Section8Form {...props} />
    case 'S9': return <Section9Form {...props} />
    default: return null
  }
}

// ─── کارت بخش ۱: مشخصات فردی و پذیرش ───
interface S1State {
  nationalId: string; firstName: string; lastName: string; fatherName: string
  gender: string; birthYear: string; birthDate: string; maritalStatus: string
  childrenCount: string; education: string; phone: string; insuranceNo: string
  militaryStatus: string; militaryUnit: string; militaryExemption: string; photo: string
  examType: string; visitDate: string; workPlace: string; jobTitle: string; workUnit: string
  groupType: string; companyId: string; contractorId: string; projectId: string
}

function initS1(c: CaseDetailDTO['case']): S1State {
  return {
    nationalId: c.person.nationalId || '',
    firstName: c.person.firstName || '',
    lastName: c.person.lastName || '',
    fatherName: c.person.fatherName || '',
    gender: c.person.gender || 'MALE',
    birthYear: c.person.birthYear || '',
    birthDate: c.person.birthDate || '',
    maritalStatus: c.person.maritalStatus || '',
    childrenCount: c.person.childrenCount !== null && c.person.childrenCount !== undefined ? String(c.person.childrenCount) : '',
    education: c.person.education || '',
    phone: c.person.phone || '',
    insuranceNo: c.person.insuranceNo || '',
    militaryStatus: c.person.militaryStatus || '',
    militaryUnit: c.person.militaryUnit || '',
    militaryExemption: c.person.militaryExemption || '',
    photo: c.person.photo || '',
    examType: c.examType,
    visitDate: c.visitDate,
    workPlace: c.workPlace || '',
    jobTitle: c.jobTitle || '',
    workUnit: c.workUnit || '',
    groupType: c.groupType,
    companyId: c.company?.id || '',
    contractorId: c.contractor?.id || '',
    projectId: c.project?.id || '',
  }
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value || '—'}</div>
    </div>
  )
}

function S1Card({
  caseData, canEdit, orgs, onSaved,
}: {
  caseData: CaseDetailDTO
  canEdit: boolean
  orgs: { companies: OrgOption[]; contractors: OrgOption[]; projects: OrgOption[] }
  onSaved: () => void
}) {
  const c = caseData.case
  const [form, setForm] = useState<S1State>(() => initS1(c))
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<S1State>) => setForm((prev) => ({ ...prev, ...patch }))
  const age = calcAge(c.person.birthYear)

  const save = async () => {
    const nid = toEn(form.nationalId).replace(/\D/g, '')
    if (!/^\d{8,12}$/.test(nid)) {
      toast.error('کد ملی باید بین ۸ تا ۱۲ رقم باشد')
      return
    }
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('نام و نام خانوادگی الزامی است')
      return
    }
    if (!form.workPlace.trim() || !form.jobTitle.trim()) {
      toast.error('محل کار و عنوان شغل الزامی است')
      return
    }
    setBusy(true)
    try {
      await apiPatch(`/api/cases/${c.id}`, {
        person: {
          nationalId: nid,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          fatherName: form.fatherName.trim() || null,
          gender: form.gender,
          birthYear: form.birthYear || null,
          birthDate: form.birthDate || null,
          maritalStatus: form.maritalStatus || null,
          childrenCount: form.childrenCount || null,
          education: form.education || null,
          phone: form.phone || null,
          insuranceNo: form.insuranceNo || null,
          militaryStatus: form.gender === 'MALE' ? form.militaryStatus || null : null,
          militaryUnit: form.gender === 'MALE' ? form.militaryUnit.trim() || null : null,
          militaryExemption: form.gender === 'MALE' ? form.militaryExemption.trim() || null : null,
          photo: form.photo || null,
        },
        examType: form.examType,
        visitDate: form.visitDate,
        workPlace: form.workPlace.trim(),
        jobTitle: form.jobTitle.trim(),
        workUnit: form.workUnit.trim() || null,
        companyId: form.companyId || null,
        contractorId: form.contractorId || null,
        projectId: form.projectId || null,
        groupType: form.groupType,
      })
      toast.success('اطلاعات پذیرش به‌روزرسانی شد')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطای نامشخص')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          بخش ۱ - مشخصات فردی و پذیرش
          <Badge variant="outline" className="text-[10px] text-muted-foreground">همیشه باز</Badge>
          {!canEdit && <Badge variant="outline" className="text-[10px] text-muted-foreground">فقط نمایش</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canEdit ? (
          <>
            {/* عکس پرسنلی */}
            <div className="flex flex-wrap items-center gap-3">
              <Avatar className="size-20 border">
                {form.photo ? <AvatarImage src={form.photo} alt="عکس پرسنلی" /> : null}
                <AvatarFallback className="bg-teal-50 text-teal-700 text-lg">
                  {form.firstName ? form.firstName[0] : '؟'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <Input
                  type="file"
                  accept="image/*"
                  className="w-56 text-xs"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) resizePhoto(f, (dataUrl) => set({ photo: dataUrl }))
                  }}
                />
                {form.photo && (
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-rose-600" onClick={() => set({ photo: '' })}>
                    <Trash2 className="size-3" /> حذف عکس
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>کد ملی</Label>
                <Input
                  value={form.nationalId}
                  onChange={(e) => set({ nationalId: toEn(e.target.value).replace(/\D/g, '').slice(0, 12) })}
                  inputMode="numeric"
                  dir="ltr"
                  disabled={busy}
                />
              </div>
              <div className="space-y-1.5">
                <Label>نام</Label>
                <Input value={form.firstName} onChange={(e) => set({ firstName: e.target.value })} disabled={busy} />
              </div>
              <div className="space-y-1.5">
                <Label>نام خانوادگی</Label>
                <Input value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} disabled={busy} />
              </div>
              <div className="space-y-1.5">
                <Label>نام پدر</Label>
                <Input value={form.fatherName} onChange={(e) => set({ fatherName: e.target.value })} disabled={busy} />
              </div>
              <div className="space-y-1.5">
                <Label>جنسیت</Label>
                <Select value={form.gender} onValueChange={(v) => set({ gender: v })} disabled={busy}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {Object.entries(GENDER_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>سال تولد</Label>
                <Input
                  value={form.birthYear}
                  onChange={(e) => set({ birthYear: toEn(e.target.value).replace(/\D/g, '').slice(0, 4) })}
                  inputMode="numeric"
                  dir="ltr"
                  disabled={busy}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">تاریخ تولد</Label>
                <JalaliDateInput value={form.birthDate} onChange={(v) => set({ birthDate: v })} disabled={busy} />
              </div>
              <div className="space-y-1.5">
                <Label>وضعیت تأهل</Label>
                <Select value={form.maritalStatus || undefined} onValueChange={(v) => set({ maritalStatus: v })} disabled={busy}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب" /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {Object.entries(MARITAL_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>تعداد فرزند</Label>
                <Input
                  value={form.childrenCount}
                  onChange={(e) => set({ childrenCount: toEn(e.target.value).replace(/\D/g, '').slice(0, 2) })}
                  inputMode="numeric"
                  dir="ltr"
                  disabled={busy}
                />
              </div>
              <div className="space-y-1.5">
                <Label>تحصیلات</Label>
                <Select value={form.education || undefined} onValueChange={(v) => set({ education: v })} disabled={busy}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب" /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {EDUCATION_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>تلفن همراه</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => set({ phone: toEn(e.target.value).replace(/[^\d+]/g, '').slice(0, 13) })}
                  inputMode="tel"
                  dir="ltr"
                  disabled={busy}
                />
              </div>
              <div className="space-y-1.5">
                <Label>شماره بیمه</Label>
                <Input
                  value={form.insuranceNo}
                  onChange={(e) => set({ insuranceNo: toEn(e.target.value).replace(/\D/g, '').slice(0, 20) })}
                  inputMode="numeric"
                  dir="ltr"
                  disabled={busy}
                />
              </div>
              {form.gender === 'MALE' && (
                <>
                  <div className="space-y-1.5">
                    <Label>نظام وظیفه</Label>
                    <Select value={form.militaryStatus || undefined} onValueChange={(v) => set({ militaryStatus: v })} disabled={busy}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب" /></SelectTrigger>
                      <SelectContent dir="rtl">
                        {Object.entries(MILITARY_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>واحد خدمت</Label>
                    <Input value={form.militaryUnit} onChange={(e) => set({ militaryUnit: e.target.value })} disabled={busy} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>نوع معافیت</Label>
                    <Input value={form.militaryExemption} onChange={(e) => set({ militaryExemption: e.target.value })} disabled={busy} />
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>نوع معاینه</Label>
                <Select value={form.examType} onValueChange={(v) => set({ examType: v })} disabled={busy}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {Object.entries(EXAM_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">تاریخ مراجعه</Label>
                <JalaliDateInput value={form.visitDate} onChange={(v) => set({ visitDate: v })} disabled={busy} />
              </div>
              <div className="space-y-1.5">
                <Label>محل کار</Label>
                <Input value={form.workPlace} onChange={(e) => set({ workPlace: e.target.value })} disabled={busy} />
              </div>
              <div className="space-y-1.5">
                <Label>عنوان شغل</Label>
                <Input value={form.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} disabled={busy} />
              </div>
              <div className="space-y-1.5">
                <Label>واحد کاری</Label>
                <Input value={form.workUnit} onChange={(e) => set({ workUnit: e.target.value })} disabled={busy} />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label>گروه هدف</Label>
                <RadioGroup value={form.groupType} onValueChange={(v) => set({ groupType: v })} className="flex flex-wrap gap-2" disabled={busy}>
                  {Object.entries(GROUP_TYPE_LABELS).map(([k, v]) => (
                    <label
                      key={k}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition-colors ${
                        form.groupType === k ? 'border-teal-300 bg-teal-50 text-teal-800' : 'bg-background hover:bg-slate-50'
                      }`}
                    >
                      <RadioGroupItem value={k} disabled={busy} />
                      {v}
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>شرکت</Label>
                <Select value={form.companyId || undefined} onValueChange={(v) => set({ companyId: v })} disabled={busy}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب شرکت" /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {orgs.companies.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>پیمانکار</Label>
                <Select value={form.contractorId || undefined} onValueChange={(v) => set({ contractorId: v })} disabled={busy}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب پیمانکار" /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {orgs.contractors.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>پروژه</Label>
                <Select value={form.projectId || undefined} onValueChange={(v) => set({ projectId: v })} disabled={busy}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب پروژه" /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {orgs.projects.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={save} disabled={busy} className="bg-teal-600 hover:bg-teal-700">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                ذخیره تغییرات
              </Button>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <ReadOnlyField label="نام و نام خانوادگی" value={`${c.person.firstName} ${c.person.lastName}`} />
            <ReadOnlyField label="نام پدر" value={c.person.fatherName || ''} />
            <ReadOnlyField label="کد ملی" value={toFa(c.person.nationalId)} />
            <ReadOnlyField label="جنسیت" value={GENDER_LABELS[c.person.gender] || c.person.gender} />
            <ReadOnlyField label="سال تولد" value={toFa(c.person.birthYear || '')} />
            <ReadOnlyField label="تاریخ تولد" value={toFa(c.person.birthDate || '')} />
            <ReadOnlyField label="سن" value={age !== null ? `${toFa(age)} سال` : ''} />
            <ReadOnlyField label="وضعیت تأهل" value={c.person.maritalStatus ? MARITAL_LABELS[c.person.maritalStatus] || c.person.maritalStatus : ''} />
            <ReadOnlyField label="تعداد فرزند" value={c.person.childrenCount !== null && c.person.childrenCount !== undefined ? toFa(c.person.childrenCount) : ''} />
            <ReadOnlyField label="تحصیلات" value={c.person.education || ''} />
            <ReadOnlyField label="تلفن همراه" value={toFa(c.person.phone || '')} />
            <ReadOnlyField label="شماره بیمه" value={toFa(c.person.insuranceNo || '')} />
            {c.person.gender === 'MALE' && (
              <>
                <ReadOnlyField label="نظام وظیفه" value={c.person.militaryStatus ? MILITARY_LABELS[c.person.militaryStatus] || c.person.militaryStatus : ''} />
                <ReadOnlyField label="واحد خدمت" value={toFa(c.person.militaryUnit || '')} />
                <ReadOnlyField label="نوع معافیت" value={toFa(c.person.militaryExemption || '')} />
              </>
            )}
            <ReadOnlyField label="نوع معاینه" value={EXAM_TYPE_LABELS[c.examType] || c.examType} />
            <ReadOnlyField label="تاریخ مراجعه" value={toFa(c.visitDate)} />
            <ReadOnlyField label="محل کار" value={c.workPlace} />
            <ReadOnlyField label="عنوان شغل" value={c.jobTitle} />
            <ReadOnlyField label="واحد کاری" value={c.workUnit || ''} />
            <ReadOnlyField label="گروه هدف" value={GROUP_TYPE_LABELS[c.groupType] || c.groupType} />
            <ReadOnlyField label="شرکت" value={c.company?.name || ''} />
            <ReadOnlyField label="پیمانکار" value={c.contractor?.name || ''} />
            <ReadOnlyField label="پروژه" value={c.project?.name || ''} />
            <ReadOnlyField label="پذیرش توسط" value={c.createdByName} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── نمای اصلی ───
export function CaseDetailView() {
  const user = useAppStore((s) => s.user)
  const currentCaseId = useAppStore((s) => s.currentCaseId)
  const refreshKey = useAppStore((s) => s.refreshKey)
  const refresh = useAppStore((s) => s.refresh)
  const backToCases = useAppStore((s) => s.backToCases)
  const openPrint = useAppStore((s) => s.openPrint)

  const [data, setData] = useState<CaseDetailDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<OrgOption[]>([])
  const [contractors, setContractors] = useState<OrgOption[]>([])
  const [projects, setProjects] = useState<OrgOption[]>([])

  const role = user?.role
  const canEditCase = role === 'ADMIN' || role === 'MANAGER'
  // بخش‌های قابل مشاهده بر اساس نقش: مدیر/پزشک/کارفرما/پیمانکار همه؛ کارشناسان فقط بخش‌های خودشان
  const visibleKeys = role ? visibleSectionsFor(role) : new Set<SectionKey>()
  const isSpecialist = !!role && SPECIALIST_ROLES.includes(role)

  const load = useCallback(async () => {
    if (!currentCaseId) return
    setLoading(true)
    try {
      const d = await apiGet<CaseDetailDTO>(`/api/cases/${currentCaseId}`)
      setData(d)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در بارگذاری پرونده'
      if (e instanceof ApiError && e.status === 404) {
        toast.error(msg)
        backToCases()
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }, [currentCaseId, backToCases])

  useEffect(() => {
    // تغییر پرونده: پاک‌سازی داده قبلی برای جلوگیری از نمایش پرونده پیشین
    setData(null)
  }, [currentCaseId])

  useEffect(() => {
    load()
    // بارگذاری مجدد با تغییر refreshKey (پس از هر ذخیره‌سازی)
  }, [load, refreshKey])

  useEffect(() => {
    if (!canEditCase) return
    apiGet<OrgOption[]>('/api/companies').then(setCompanies).catch(() => {})
    apiGet<OrgOption[]>('/api/contractors').then(setContractors).catch(() => {})
    apiGet<OrgOption[]>('/api/projects').then(setProjects).catch(() => {})
  }, [canEditCase])

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  const c = data.case
  const age = calcAge(c.person.birthYear)
  const openItems = data.openItems
  const onSaved = () => refresh()

  // اولین بخش ناتمامِ قابل‌مشاهده به‌عنوان مقدار پیش‌فرض آکاردئون
  const visibleDefs = SECTION_DEFS.filter((def) => visibleKeys.has(def.key))
  const firstOpenKey =
    visibleDefs.find((def) => {
      const st = data.sections.find((s) => s.key === def.key)?.status || 'NOT_STARTED'
      return st !== 'APPROVED' && st !== 'NOT_APPLICABLE'
    })?.key || visibleDefs[0]?.key || SECTION_DEFS[0].key

  const chips: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <Building2 className="size-3" />, label: 'محل کار', value: c.workPlace },
    { icon: <Briefcase className="size-3" />, label: 'شغل', value: c.jobTitle },
    { icon: <DoorClosed className="size-3" />, label: 'واحد', value: c.workUnit || '' },
    { icon: <Factory className="size-3" />, label: 'شرکت', value: c.company?.name || '' },
    { icon: <HardHat className="size-3" />, label: 'پیمانکار', value: c.contractor?.name || '' },
    { icon: <FolderKanban className="size-3" />, label: 'پروژه', value: c.project?.name || '' },
  ].filter((x) => x.value)

  return (
    <div className="space-y-4">
      {/* ── هدر پرونده ── */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start gap-4">
            <Button variant="outline" size="icon" onClick={backToCases} aria-label="بازگشت به پرونده‌ها">
              <ArrowRight className="size-4" />
            </Button>
            <Avatar className="size-20 border">
              {c.person.photo ? <AvatarImage src={c.person.photo} alt={c.person.firstName} /> : null}
              <AvatarFallback className="bg-teal-50 text-xl text-teal-700">
                {c.person.firstName ? c.person.firstName[0] : '؟'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold">{c.person.firstName} {c.person.lastName}</h1>
                <Badge className="bg-teal-600 text-white hover:bg-teal-600">{EXAM_TYPE_LABELS[c.examType] || c.examType}</Badge>
                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                  {GROUP_TYPE_LABELS[c.groupType] || c.groupType}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {c.person.fatherName && <span>نام پدر: {c.person.fatherName}</span>}
                <span className="font-mono" dir="ltr">{toFa(c.person.nationalId)}</span>
                {age !== null && <span>سن: {toFa(age)} سال</span>}
                <span className="flex items-center gap-1 font-mono" dir="ltr">
                  <Hash className="size-3" />
                  {toFa(c.caseNumber)}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3" />
                  {toFa(c.visitDate)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <Badge key={chip.label} variant="outline" className="gap-1 bg-slate-50 text-slate-600 border-slate-200">
                {chip.icon}
                <span className="text-[10px] text-slate-400">{chip.label}:</span>
                {chip.value}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-[200px] flex-1 items-center gap-2">
              <Progress value={data.progress} className="flex-1" />
              <span className="text-xs font-medium text-muted-foreground">{toFa(data.progress)}٪</span>
            </div>
            <FinalOpinionBadge opinion={c.finalOpinion} />
          </div>

          {/* هشدار موارد باز / تکمیل */}
          {openItems.length > 0 ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800">
              <AlertTriangle className="size-4" />
              <AlertTitle>موارد باز و الزامات باقی‌مانده</AlertTitle>
              <AlertDescription>
                <ul className="space-y-1">
                  {openItems.map((it, i) => (
                    <li key={`${it.key}-${i}`} className="flex flex-wrap items-center gap-2 text-xs">
                      <span>{it.label}</span>
                      <Badge variant="outline" className="border-amber-300 bg-white text-[10px] text-amber-700">
                        مسئول: {it.responsibleLabel}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
              <CheckCircle2 className="size-4" />
              <AlertTitle>همه مراحل معاینه تکمیل و تأیید شده است</AlertTitle>
            </Alert>
          )}

          {/* دکمه‌های چاپ */}
          <div className="flex flex-wrap items-center gap-2">

                <Button
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700"
                  disabled={!data.canFinalize.ok}
                  title={data.canFinalize.ok ? 'چاپ گزارش نهایی تأییدشده' : 'تا تکمیل و تأیید همه بخش‌ها غیرفعال است'}
                  onClick={() => openPrint(c.id, false)}
                >
                  <Stamp className="size-4" />
                  چاپ گزارش نهایی
                </Button>
                <Button size="sm" variant="outline" onClick={() => openPrint(c.id, true)}>
                  <FileText className="size-4" />
                  پیش‌نمایش پیش‌نویس
                </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── تب‌ها ── */}
      <Tabs defaultValue="sections">
        <TabsList>
          <TabsTrigger value="sections">بخش‌های پرونده</TabsTrigger>
          <TabsTrigger value="history">تاریخچه</TabsTrigger>
        </TabsList>

        <TabsContent value="sections" className="space-y-4">
          {/* اطلاع‌رسانی دید نقشی برای کارشناسان */}
          {isSpecialist && (
            <Alert className="border-cyan-200 bg-cyan-50 text-cyan-800">
              <Info className="size-4" />
              <AlertTitle>نمای محدود به نقش</AlertTitle>
              <AlertDescription>فقط بخش‌های مرتبط با نقش شما در این پرونده نمایش داده می‌شود.</AlertDescription>
            </Alert>
          )}

          {/* بخش ۱ — همیشه باز (برای کارشناسان فقط‌نمایش) */}
          <S1Card caseData={data} canEdit={canEditCase} orgs={{ companies, contractors, projects }} onSaved={onSaved} />

          {data.restricted && (
            <Alert className="border-slate-200 bg-slate-50 text-slate-600">
              <ShieldAlert className="size-4" />
              <AlertDescription>بخش‌های پزشکی تفصیلی برای نقش شما محرمانه است.</AlertDescription>
            </Alert>
          )}

          {/* بخش‌های ۲ تا ۹ — فقط بخش‌های مجاز نقش فعلی */}
          <Accordion type="single" collapsible defaultValue={firstOpenKey} className="space-y-3">
            {visibleDefs.map((def) => {
              const sec = data.sections.find((s) => s.key === def.key)
              return (
                <AccordionItem
                  key={def.key}
                  value={def.key}
                  className="rounded-xl border bg-card px-4 last:border-b"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold">بخش {def.number} — {def.title}</span>
                      <StatusBadge status={sec?.status || 'NOT_STARTED'} />
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        مسئول: {ROLE_LABELS[SECTION_RESPONSIBLE[def.key]]}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-1">
                    <SectionForm
                      sectionKey={def.key}
                      caseId={c.id}
                      section={sec}
                      caseData={data}
                      onSaved={onSaved}
                    />
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">تاریخچه پرونده</CardTitle>
            </CardHeader>
            <CardContent>
              {data.history.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">رویدادی ثبت نشده است</div>
              ) : (
                <div className="max-h-96 space-y-0 overflow-y-auto pe-1">
                  {data.history.map((h, i) => (
                    <div key={h.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < data.history.length - 1 && (
                        <span className="absolute bottom-0 start-[7px] top-5 w-px bg-border" />
                      )}
                      <span className="mt-1.5 size-3.5 shrink-0 rounded-full border-2 border-teal-500 bg-background" />
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">
                          {h.action}
                          {h.sectionKey ? (
                            <span className="text-muted-foreground"> — {sectionTitle(h.sectionKey as SectionKey)}</span>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatJalaliDateTime(h.createdAt)} • {h.userName}
                        </div>
                        {h.detail && <div className="text-xs text-muted-foreground">{h.detail}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
