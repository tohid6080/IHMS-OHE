'use client'

// ─── نمای پذیرش: ویزارد ۲ مرحله‌ای (مشخصات فردی → اطلاعات مراجعه) ───
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Alert, AlertDescription, AlertTitle,
} from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, Plus, Search, Trash2, UserPlus,
} from 'lucide-react'
import { JalaliDateInput } from '@/components/common/JalaliDateInput'
import { PhotoCapture } from '@/components/common/PhotoCapture'
import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toEn, toFa, todayJalali } from '@/lib/jalali'
import {
  EDUCATION_OPTIONS, EXAM_TYPE_LABELS, GENDER_LABELS, GROUP_TYPE_LABELS, MARITAL_LABELS, MILITARY_LABELS,
} from '@/lib/constants'
import type { JobHistoryRow } from '@/lib/types'

interface PersonSearchItem {
  id: string
  nationalId: string
  firstName: string
  lastName: string
  fatherName?: string | null
  gender?: string | null
  birthYear?: string | null
  birthDate?: string | null
  maritalStatus?: string | null
  childrenCount?: number | null
  education?: string | null
  phone?: string | null
  insuranceNo?: string | null
  militaryStatus?: string | null
  militaryUnit?: string | null
  militaryExemption?: string | null
  photo?: string | null
  casesCount: number
}

interface OrgOption { id: string; name: string }

const emptyRow = (): JobHistoryRow => ({ position: '', duties: '', fromDate: '', toDate: '', changeReason: '' })

function ProgressSteps({ step }: { step: 1 | 2 }) {
  const labels = ['مشخصات فردی', 'اطلاعات مراجعه']
  return (
    <div className="flex flex-wrap items-center gap-2">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2
        const active = step === n
        const done = step > n
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex size-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
                done
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : active
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-slate-300 bg-white text-slate-400'
              }`}
            >
              {done ? <CheckCircle2 className="size-4" /> : toFa(n)}
            </div>
            <span className={`text-sm ${active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{label}</span>
            {i < labels.length - 1 && <span className="h-px w-6 bg-border sm:w-14" />}
          </div>
        )
      })}
    </div>
  )
}

export function ReceptionView() {
  const openCase = useAppStore((s) => s.openCase)

  const [step, setStep] = useState<1 | 2>(1)
  const [busy, setBusy] = useState(false)
  const [searching, setSearching] = useState(false)
  const [foundPerson, setFoundPerson] = useState<PersonSearchItem | null>(null)
  const [notFound, setNotFound] = useState(false)

  // ── مرحله ۱: مشخصات فردی ──
  const [nationalId, setNationalId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [gender, setGender] = useState('MALE')
  const [birthYear, setBirthYear] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [maritalStatus, setMaritalStatus] = useState('')
  const [childrenCount, setChildrenCount] = useState('')
  const [education, setEducation] = useState('')
  const [phone, setPhone] = useState('')
  const [insuranceNo, setInsuranceNo] = useState('')
  const [militaryStatus, setMilitaryStatus] = useState('')
  const [militaryUnit, setMilitaryUnit] = useState('')
  const [militaryExemption, setMilitaryExemption] = useState('')
  const [photo, setPhoto] = useState('')

  // ── مرحله ۲: اطلاعات مراجعه ──
  const [examType, setExamType] = useState('PRE_EMPLOYMENT')
  const [visitDate, setVisitDate] = useState(todayJalali())
  const [workPlace, setWorkPlace] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [workUnit, setWorkUnit] = useState('')
  const [groupType, setGroupType] = useState('CONTRACTOR')
  const [companyId, setCompanyId] = useState('')
  const [contractorId, setContractorId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [companies, setCompanies] = useState<OrgOption[]>([])
  const [contractors, setContractors] = useState<OrgOption[]>([])
  const [projects, setProjects] = useState<OrgOption[]>([])
  const [jobRows, setJobRows] = useState<JobHistoryRow[]>([emptyRow()])

  useEffect(() => {
    apiGet<OrgOption[]>('/api/companies').then(setCompanies).catch(() => {})
    apiGet<OrgOption[]>('/api/contractors').then(setContractors).catch(() => {})
    apiGet<OrgOption[]>('/api/projects').then(setProjects).catch(() => {})
  }, [])

  const searchPerson = async () => {
    const q = toEn(nationalId).replace(/\D/g, '')
    if (q.length < 2) {
      toast.error('کد ملی یا نام را برای جست‌وجو وارد کنید')
      return
    }
    setSearching(true)
    setNotFound(false)
    try {
      const r = await apiGet<{ items: PersonSearchItem[] }>(`/api/persons?q=${encodeURIComponent(q)}`)
      const exact = (r.items || []).find((p) => p.nationalId === q)
      if (exact) {
        setFoundPerson(exact)
        // پیش‌پر کردن فرم از پرونده قبلی
        setNationalId(exact.nationalId)
        setFirstName(exact.firstName || '')
        setLastName(exact.lastName || '')
        setFatherName(exact.fatherName || '')
        setGender(exact.gender || 'MALE')
        setBirthYear(exact.birthYear || '')
        setBirthDate(exact.birthDate || '')
        setMaritalStatus(exact.maritalStatus || '')
        setChildrenCount(exact.childrenCount !== null && exact.childrenCount !== undefined ? String(exact.childrenCount) : '')
        setEducation(exact.education || '')
        setPhone(exact.phone || '')
        setInsuranceNo(exact.insuranceNo || '')
        setMilitaryStatus(exact.militaryStatus || '')
        setMilitaryUnit(exact.militaryUnit || '')
        setMilitaryExemption(exact.militaryExemption || '')
        setPhoto(exact.photo || '')
        toast.success('اطلاعات از پرونده قبلی بارگذاری شد')
      } else {
        setFoundPerson(null)
        setNotFound(true)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در جست‌وجو')
    } finally {
      setSearching(false)
    }
  }

  const goStep2 = () => {
    const nid = toEn(nationalId).replace(/\D/g, '')
    if (!/^\d{8,12}$/.test(nid)) {
      toast.error('کد ملی باید بین ۸ تا ۱۲ رقم باشد')
      return
    }
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('نام و نام خانوادگی الزامی است')
      return
    }
    setStep(2)
  }

  const updateJobRow = (i: number, patch: Partial<JobHistoryRow>) =>
    setJobRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const submit = async () => {
    if (!examType || !groupType) {
      toast.error('نوع معاینه و گروه هدف را انتخاب کنید')
      return
    }
    if (!visitDate || !workPlace.trim() || !jobTitle.trim()) {
      toast.error('تاریخ مراجعه، محل کار و عنوان شغل الزامی است')
      return
    }
    if (!jobRows.some((r) => r.position?.trim())) {
      toast.error('حداقل یک شغل فعلی با عنوان شغل وارد کنید (سوابق شغلی بخش ۲)')
      return
    }
    setBusy(true)
    try {
      const payload: Record<string, unknown> = {
        examType,
        groupType,
        visitDate,
        workPlace: workPlace.trim(),
        jobTitle: jobTitle.trim(),
        workUnit: workUnit.trim() || undefined,
        companyId: companyId || undefined,
        contractorId: contractorId || undefined,
        projectId: projectId || undefined,
        section2: {
          current: jobRows.filter((r) => r.position?.trim() || r.duties?.trim() || r.fromDate || r.toDate || r.changeReason?.trim()),
          previous: [],
        },
      }
      if (foundPerson?.id) {
        payload.personId = foundPerson.id
        // به‌روزرسانی مشخصات و عکس فرد موجود پیش از تشکیل پرونده
        // (POST /api/cases برای فرد موجود فقط پرونده می‌سازد و عکس/مشخصات را به‌روز نمی‌کند)
        await apiPatch(`/api/persons/${foundPerson.id}`, {
          photo: photo || '', // رشته خالی یعنی حذف عکس
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fatherName: fatherName.trim(),
          gender,
          birthYear,
          birthDate,
          maritalStatus,
          childrenCount,
          education,
          phone,
          insuranceNo,
          militaryStatus: gender === 'MALE' ? militaryStatus : '',
          militaryUnit: gender === 'MALE' ? militaryUnit.trim() : '',
          militaryExemption: gender === 'MALE' ? militaryExemption.trim() : '',
        })
      } else {
        payload.person = {
          nationalId: toEn(nationalId).replace(/\D/g, ''),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fatherName: fatherName.trim() || undefined,
          gender,
          birthYear: birthYear || undefined,
          birthDate: birthDate || undefined,
          maritalStatus: maritalStatus || undefined,
          childrenCount: childrenCount || undefined,
          education: education || undefined,
          phone: phone || undefined,
          insuranceNo: insuranceNo || undefined,
          militaryStatus: gender === 'MALE' ? militaryStatus || undefined : undefined,
          militaryUnit: gender === 'MALE' ? militaryUnit.trim() || undefined : undefined,
          militaryExemption: gender === 'MALE' ? militaryExemption.trim() || undefined : undefined,
          photo: photo || undefined,
        }
      }
      const r = await apiPost<{ id: string; caseNumber: string }>('/api/cases', payload)
      toast.success(`پرونده ${toFa(r.caseNumber)} ایجاد شد`)
      openCase(r.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطای نامشخص'
      toast.error(msg)
      // کد ملی تکراری: فرد موجود را پیدا و prefill می‌کنیم تا با personId ثبت شود
      if (msg.includes('قبلاً ثبت شده')) {
        setStep(1)
        await searchPerson()
        toast.info('اطلاعات فرد موجود بارگذاری شد؛ دوباره «ثبت پذیرش» را بزنید')
      }
    } finally {
      setBusy(false)
    }
  }

  const nid = toEn(nationalId).replace(/\D/g, '')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <UserPlus className="size-5 text-teal-600" />
            پذیرش جدید
          </h1>
          <p className="text-sm text-muted-foreground">تشکیل پرونده پزشکی شاغل</p>
        </div>
        <ProgressSteps step={step} />
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">مشخصات فردی</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {foundPerson && (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                <CheckCircle2 className="size-4" />
                <AlertTitle>پرونده قبلی یافت شد</AlertTitle>
                <AlertDescription>
                  {toFa(foundPerson.casesCount)} مراجعه ثبت‌شده — سوابق قابل مشاهده در صفحه پرونده‌ها است.
                </AlertDescription>
              </Alert>
            )}
            {!foundPerson && notFound && (
              <Alert className="border-slate-200 bg-slate-50 text-slate-600">
                <AlertDescription>پرونده قبلی با این کد ملی یافت نشد — اطلاعات جدید ثبت می‌شود.</AlertDescription>
              </Alert>
            )}

            {/* کد ملی + جست‌وجو */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label>کد ملی (اجباری)</Label>
                <Input
                  value={nationalId}
                  onChange={(e) => setNationalId(toEn(e.target.value).replace(/\D/g, '').slice(0, 12))}
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="مثلاً 1234567890"
                  className="max-w-[240px]"
                />
                {nid && !/^\d{8,12}$/.test(nid) && (
                  <p className="text-xs text-rose-600">کد ملی باید بین ۸ تا ۱۲ رقم باشد</p>
                )}
              </div>
              <Button variant="outline" onClick={searchPerson} disabled={searching}>
                {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                جست‌وجوی پرونده قبلی
              </Button>
            </div>

            <Separator />

            {/* عکس پرسنلی + نام */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
              <div className="space-y-2">
                <Label className="text-xs">عکس پرسنلی</Label>
                <PhotoCapture value={photo} onChange={setPhoto} disabled={busy} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>نام (اجباری)</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>نام خانوادگی (اجباری)</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>نام پدر</Label>
                  <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>جنسیت</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent dir="rtl">
                      {Object.entries(GENDER_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>سال تولد (۴ رقم)</Label>
                  <Input
                    value={birthYear}
                    onChange={(e) => setBirthYear(toEn(e.target.value).replace(/\D/g, '').slice(0, 4))}
                    inputMode="numeric"
                    dir="ltr"
                    placeholder="1362"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">تاریخ تولد (اختیاری)</Label>
                  <JalaliDateInput value={birthDate} onChange={setBirthDate} />
                </div>
                <div className="space-y-1.5">
                  <Label>وضعیت تأهل</Label>
                  <Select value={maritalStatus || undefined} onValueChange={setMaritalStatus}>
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
                    value={childrenCount}
                    onChange={(e) => setChildrenCount(toEn(e.target.value).replace(/\D/g, '').slice(0, 2))}
                    inputMode="numeric"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>تحصیلات</Label>
                  <Select value={education || undefined} onValueChange={setEducation}>
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
                    value={phone}
                    onChange={(e) => setPhone(toEn(e.target.value).replace(/[^\d+]/g, '').slice(0, 13))}
                    inputMode="tel"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>شماره بیمه</Label>
                  <Input
                    value={insuranceNo}
                    onChange={(e) => setInsuranceNo(toEn(e.target.value).replace(/\D/g, '').slice(0, 20))}
                    inputMode="numeric"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* نظام وظیفه — فقط آقایان */}
            {gender === 'MALE' && (
              <div className="grid grid-cols-1 gap-3 rounded-lg border bg-slate-50/40 p-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">وضعیت نظام وظیفه</Label>
                  <Select value={militaryStatus || undefined} onValueChange={setMilitaryStatus}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب" /></SelectTrigger>
                    <SelectContent dir="rtl">
                      {Object.entries(MILITARY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">واحد خدمت</Label>
                  <Input value={militaryUnit} onChange={(e) => setMilitaryUnit(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">نوع معافیت</Label>
                  <Input value={militaryExemption} onChange={(e) => setMilitaryExemption(e.target.value)} />
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={goStep2} disabled={busy}>
                مرحله بعد
                <ArrowLeft className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">اطلاعات مراجعه</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* نوع معاینه */}
            <div className="space-y-2">
              <Label>نوع معاینه</Label>
              <RadioGroup value={examType} onValueChange={setExamType} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {Object.entries(EXAM_TYPE_LABELS).map(([k, v]) => (
                  <label
                    key={k}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                      examType === k ? 'border-teal-300 bg-teal-50 text-teal-800' : 'bg-background hover:bg-slate-50'
                    }`}
                  >
                    <RadioGroupItem value={k} disabled={busy} />
                    {v}
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label>تاریخ مراجعه</Label>
                <JalaliDateInput value={visitDate} onChange={setVisitDate} />
              </div>
              <div className="space-y-1.5">
                <Label>محل کار (اجباری)</Label>
                <Input value={workPlace} onChange={(e) => setWorkPlace(e.target.value)} placeholder="مثلاً کارخانه نیرنگوتراکم" />
              </div>
              <div className="space-y-1.5">
                <Label>عنوان شغل (اجباری)</Label>
                <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="مثلاً اپراتور تراک" />
              </div>
              <div className="space-y-1.5">
                <Label>واحد کاری</Label>
                <Input value={workUnit} onChange={(e) => setWorkUnit(e.target.value)} />
              </div>
            </div>

            {/* گروه هدف */}
            <div className="space-y-2">
              <Label>گروه هدف</Label>
              <RadioGroup value={groupType} onValueChange={setGroupType} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {Object.entries(GROUP_TYPE_LABELS).map(([k, v]) => (
                  <label
                    key={k}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                      groupType === k ? 'border-teal-300 bg-teal-50 text-teal-800' : 'bg-background hover:bg-slate-50'
                    }`}
                  >
                    <RadioGroupItem value={k} disabled={busy} />
                    {v}
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* شرکت / پیمانکار / پروژه */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>شرکت (اختیاری)</Label>
                <Select value={companyId || undefined} onValueChange={(v) => setCompanyId(v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب شرکت" /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>پیمانکار (اختیاری)</Label>
                <Select value={contractorId || undefined} onValueChange={(v) => setContractorId(v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب پیمانکار" /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {contractors.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>پروژه (اختیاری)</Label>
                <Select value={projectId || undefined} onValueChange={(v) => setProjectId(v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب پروژه" /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* سوابق شغلی (بخش ۲) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">سوابق شغلی (بخش ۲)</span>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">مشاغل فعلی</Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => setJobRows((prev) => [...prev, emptyRow()])}>
                  <Plus className="size-4" /> افزودن ردیف
                </Button>
              </div>
              {jobRows.map((r, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border bg-slate-50/40 p-3 sm:grid-cols-2 lg:grid-cols-12">
                  <div className="space-y-1 lg:col-span-3">
                    <Label className="text-xs">عنوان / سمت</Label>
                    <Input value={r.position || ''} onChange={(e) => updateJobRow(i, { position: e.target.value })} disabled={busy} />
                  </div>
                  <div className="space-y-1 lg:col-span-5">
                    <Label className="text-xs">وظایف محوله</Label>
                    <Textarea value={r.duties || ''} onChange={(e) => updateJobRow(i, { duties: e.target.value })} rows={2} disabled={busy} />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-xs">از تاریخ</Label>
                    <JalaliDateInput value={r.fromDate || ''} onChange={(v) => updateJobRow(i, { fromDate: v })} disabled={busy} />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-xs">تا تاریخ</Label>
                    <Input value={r.toDate || ''} onChange={(e) => updateJobRow(i, { toDate: e.target.value })} placeholder="اکنون یا تاریخ" disabled={busy} />
                  </div>
                  <div className="flex items-end justify-between gap-2 sm:col-span-2 lg:col-span-12">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">علت تغییر شغل</Label>
                      <Input value={r.changeReason || ''} onChange={(e) => updateJobRow(i, { changeReason: e.target.value })} disabled={busy} />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => setJobRows((prev) => prev.filter((_, idx) => idx !== i))}
                      disabled={busy || jobRows.length === 1}
                      aria-label="حذف ردیف"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {!jobRows.some((r) => r.position?.trim()) && (
                <p className="text-xs text-amber-600">حداقل یک ردیف با عنوان شغل پر شده لازم است.</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(1)} disabled={busy}>
                <ArrowRight className="size-4" />
                مرحله قبل
              </Button>
              <Button onClick={submit} disabled={busy} className="bg-teal-600 hover:bg-teal-700">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                ثبت پذیرش و تشکیل پرونده
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
