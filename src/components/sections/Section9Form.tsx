'use client'

// ─── بخش ۹: نظریه نهایی پزشک — endpoint مجزا: POST /api/cases/[id]/final ───
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Loader2, RotateCcw, Stamp } from 'lucide-react'
import { JalaliDateInput } from '@/components/common/JalaliDateInput'
import { SignaturePad } from '@/components/common/SignaturePad'
import { FinalOpinionBadge } from '@/components/common/StatusBadge'
import { apiPost } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toFa, todayJalali } from '@/lib/jalali'
import { FINAL_OPINION_LABELS } from '@/lib/constants'
import type { CaseDetailDTO, SectionDTO } from '@/lib/types'

interface Props {
  caseId: string
  section: SectionDTO | undefined
  caseData: CaseDetailDTO
  onSaved: () => void
}

const OPINION_META: Record<string, { desc: string; cls: string }> = {
  FIT: { desc: 'شاغل از نظر پزشکی برای انجام کار در این شغل بلامانع است', cls: 'border-emerald-300 bg-emerald-50' },
  CONDITIONAL: { desc: 'صلاحیت مشروط به رعایت شرط یا محدودیت اعلام‌شده', cls: 'border-amber-300 bg-amber-50' },
  UNFIT: { desc: 'عدم صلاحیت یا عدم تناسب پزشکی با شغل فعلی', cls: 'border-rose-300 bg-rose-50' },
  INCOMPLETE: { desc: 'پرونده ناتمام — نیازمند تکمیل اقدامات یا پیگیری ارجاع‌ها', cls: 'border-slate-300 bg-slate-100' },
}

const WORKER_DECLARATION_TEXT =
  'کلیه مندرجات پرونده را مطالعه نموده و توضیحات و شروط به من اعلام شد. عواقب بروز هرگونه مشکل ناشی از عدم رعایت موارد فوق را به عهده می‌گیرم.'

export function Section9Form({ caseId, section, caseData, onSaved }: Props) {
  const user = useAppStore((s) => s.user)
  const role = user?.role
  const c = caseData.case
  const status = section?.status ?? 'NOT_STARTED'
  const isDoctorSide = role === 'DOCTOR' || role === 'ADMIN'
  const formActive = isDoctorSide && status !== 'APPROVED'
  // امضای تأییدشده پزشک ثبت‌شده توسط مدیر: درج خودکار امضا و مهر بدون بوم دستی
  const hasAutoSignature = isDoctorSide && !!user?.signatureApproved && !!user?.signatureData

  const [finalOpinion, setFinalOpinion] = useState('')
  const [finalText, setFinalText] = useState('')
  const [finalCondition, setFinalCondition] = useState('')
  const [finalReason, setFinalReason] = useState('')
  const [finalAdvice, setFinalAdvice] = useState('')
  const [finalDoctorName, setFinalDoctorName] = useState(role === 'DOCTOR' ? user?.fullName || '' : '')
  const [finalDoctorCode, setFinalDoctorCode] = useState('')
  const [finalDate, setFinalDate] = useState(todayJalali())
  const [finalSignature, setFinalSignature] = useState('')
  const [workerName, setWorkerName] = useState('')
  const [workerDeclaration, setWorkerDeclaration] = useState('')
  const [blockers, setBlockers] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [reopenBusy, setReopenBusy] = useState(false)

  // الزامات باقی‌مانده برای ثبت نظریه قطعی (همیشه نمایش داده می‌شود)
  const finalizeBlockers = caseData.canFinalize.blockers

  const submit = async () => {
    setBusy(true)
    setBlockers([])
    try {
      // فراخوانی مستقیم fetch برای دسترسی به blockers در پاسخ 400
      const res = await fetch(`/api/cases/${caseId}/final`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finalOpinion,
          finalText: finalText || undefined,
          finalCondition: finalCondition || undefined,
          finalReason: finalReason || undefined,
          finalAdvice: finalAdvice || undefined,
          finalDoctorName: finalDoctorName.trim(),
          finalDoctorCode: finalDoctorCode || undefined,
          finalDate,
          finalSignature: hasAutoSignature ? (user?.signatureData || undefined) : (finalSignature || undefined),
          stamp: hasAutoSignature ? (user?.stampData || undefined) : undefined,
          workerDeclaration: workerDeclaration || undefined,
          workerDeclarationName: workerName.trim() || undefined,
        }),
      })
      const body = (await res.json().catch(() => null)) as { error?: string; blockers?: string[] } | null
      if (!res.ok) {
        if (Array.isArray(body?.blockers) && body.blockers.length > 0) setBlockers(body.blockers)
        toast.error(body?.error || 'خطا در ثبت نظریه نهایی')
        return
      }
      toast.success('نظریه نهایی با موفقیت ثبت شد')
      onSaved()
    } catch {
      toast.error('خطا در ارتباط با سرور')
    } finally {
      setBusy(false)
    }
  }

  const reopen = async () => {
    setReopenBusy(true)
    try {
      await apiPost(`/api/cases/${caseId}/final`, {
        finalOpinion: 'INCOMPLETE',
        finalReason: 'بازگشایی برای اصلاح',
        finalDoctorName: c.finalDoctorName || user?.fullName || '',
        finalDate: todayJalali(),
      })
      toast.success('نظریه نهایی بازگشایی شد (وضعیت: ناتمام)')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطای نامشخص')
    } finally {
      setReopenBusy(false)
    }
  }

  const canSubmit =
    !!finalOpinion &&
    !!finalDoctorName.trim() &&
    !!finalDate &&
    (finalOpinion !== 'CONDITIONAL' || !!finalCondition.trim()) &&
    (finalOpinion !== 'UNFIT' || !!finalReason.trim()) &&
    (finalOpinion !== 'INCOMPLETE' || !!finalReason.trim())

  const hasResult = !!c.finalOpinion

  return (
    <div className="space-y-4">
      {/* الزامات باقی‌مانده برای نظریه قطعی */}
      {!caseData.canFinalize.ok && finalizeBlockers.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800">
          <AlertTriangle className="size-4" />
          <AlertTitle>الزامات باقی‌مانده برای ثبت نظریه قطعی</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-0.5 pe-4">
              {finalizeBlockers.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* خطای blockers حاصل از تلاش ثبت (400) */}
      {blockers.length > 0 && (
        <Alert className="border-rose-200 bg-rose-50 text-rose-800">
          <AlertTriangle className="size-4" />
          <AlertTitle>امکان ثبت نظریه قطعی وجود ندارد</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-0.5 pe-4">
              {blockers.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* فرم فعال ثبت نظریه (پزشک/ادمین و بخش تأییدنشده) */}
      {formActive && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stamp className="size-4 text-teal-600" />
              ثبت نظریه نهایی
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>نظریه نهایی</Label>
              <RadioGroup value={finalOpinion || undefined} onValueChange={(v) => setFinalOpinion(v)} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Object.entries(FINAL_OPINION_LABELS).map(([key, label]) => (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors ${
                      finalOpinion === key ? OPINION_META[key].cls : 'bg-background hover:bg-slate-50'
                    }`}
                  >
                    <RadioGroupItem value={key} className="mt-0.5" disabled={busy} />
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs text-muted-foreground">{OPINION_META[key]?.desc}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {finalOpinion === 'FIT' && (
              <div className="space-y-1.5">
                <Label>توضیحات</Label>
                <Textarea value={finalText} onChange={(e) => setFinalText(e.target.value)} rows={2} disabled={busy} />
              </div>
            )}
            {finalOpinion === 'CONDITIONAL' && (
              <div className="space-y-1.5">
                <Label>شرط / محدودیت (اجباری)</Label>
                <Textarea value={finalCondition} onChange={(e) => setFinalCondition(e.target.value)} rows={2} disabled={busy} placeholder="مثلاً: صلاحیت مشروط به استفاده از حفاظ شنوایی و کنترل دوره‌ای فشار خون" />
              </div>
            )}
            {finalOpinion === 'UNFIT' && (
              <div className="space-y-1.5">
                <Label>علت عدم صلاحیت (اجباری)</Label>
                <Textarea value={finalReason} onChange={(e) => setFinalReason(e.target.value)} rows={2} disabled={busy} />
              </div>
            )}
            {finalOpinion === 'INCOMPLETE' && (
              <div className="space-y-1.5">
                <Label>علت ناتمام بودن پرونده (اجباری)</Label>
                <Textarea value={finalReason} onChange={(e) => setFinalReason(e.target.value)} rows={2} disabled={busy} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>توصیه‌های پزشکی</Label>
              <Textarea value={finalAdvice} onChange={(e) => setFinalAdvice(e.target.value)} rows={2} disabled={busy} placeholder="مثلاً: کنترل سالانه شنوایی‌سنجی، رژیم غذایی و ورزش منظم" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>نام پزشک</Label>
                <Input value={finalDoctorName} onChange={(e) => setFinalDoctorName(e.target.value)} disabled={busy} />
              </div>
              <div className="space-y-1.5">
                <Label>کد معاینات سلامت شغلی</Label>
                <Input value={finalDoctorCode} onChange={(e) => setFinalDoctorCode(e.target.value)} disabled={busy} dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>تاریخ نظریه</Label>
                <JalaliDateInput value={finalDate} onChange={setFinalDate} disabled={busy} />
              </div>
            </div>
            {hasAutoSignature ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                {user?.signatureData && (
                  <img src={user.signatureData} alt="امضای تأییدشده پزشک" className="h-8 rounded border bg-white" />
                )}
                {user?.stampData && (
                  <img src={user.stampData} alt="مهر تأییدشده پزشک" className="h-10 rounded border bg-white" />
                )}
                <span className="text-xs text-emerald-800">امضای تأییدشده شما به‌طور خودکار درج می‌شود</span>
              </div>
            ) : (
              <SignaturePad value={finalSignature} onChange={setFinalSignature} label="امضای پزشک (اختیاری)" disabled={busy} />
            )}

            {/* اظهار شاغل */}
            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <div className="text-sm font-medium">اظهار شاغل</div>
              <p className="text-xs leading-6 text-muted-foreground">{WORKER_DECLARATION_TEXT}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">نام شاغل</Label>
                  <Input value={workerName} onChange={(e) => setWorkerName(e.target.value)} disabled={busy} />
                </div>
              </div>
              <SignaturePad value={workerDeclaration} onChange={setWorkerDeclaration} label="امضای شاغل (اختیاری)" disabled={busy} />
            </div>

            <Button
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
              onClick={submit}
              disabled={busy || !canSubmit}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Stamp className="size-4" />}
              {hasAutoSignature ? 'ثبت امضا و مهر پزشک' : 'ثبت نظریه نهایی'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* کارت نتیجه ثبت‌شده */}
      {hasResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              نظریه نهایی ثبت‌شده
              <FinalOpinionBadge opinion={c.finalOpinion} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {c.finalText && (
              <div>
                <span className="text-muted-foreground">توضیحات: </span>
                {c.finalText}
              </div>
            )}
            {c.finalCondition && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
                <span className="font-medium text-amber-800">شرط / محدودیت: </span>
                {c.finalCondition}
              </div>
            )}
            {c.finalReason && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2">
                <span className="font-medium text-rose-800">دلیل: </span>
                {c.finalReason}
              </div>
            )}
            {c.finalAdvice && (
              <div className="rounded-md border border-teal-200 bg-teal-50 p-2">
                <span className="font-medium text-teal-800">توصیه‌های پزشکی: </span>
                {c.finalAdvice}
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <div>پزشک: <span className="text-foreground">{c.finalDoctorName || '—'}</span></div>
              <div>کد معاینات سلامت شغلی: <span className="text-foreground" dir="ltr">{c.finalDoctorCode ? toFa(c.finalDoctorCode) : '—'}</span></div>
              <div>تاریخ: <span className="text-foreground">{c.finalDate ? toFa(c.finalDate) : '—'}</span></div>
            </div>
            {(c.finalSignature || c.finalStamp) && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">امضا و مهر پزشک</div>
                <div className="flex flex-wrap items-center gap-3">
                  {c.finalSignature && (
                    <img src={c.finalSignature} alt="امضای پزشک" className="h-14 rounded border bg-white" />
                  )}
                  {c.finalStamp && (
                    <img src={c.finalStamp} alt="مهر پزشک" className="h-16 rounded border bg-white" />
                  )}
                </div>
              </div>
            )}
            <Separator />
            <div className="space-y-1.5">
              <div className="text-xs font-medium">اظهار شاغل</div>
              <p className="text-xs leading-6 text-muted-foreground">{WORKER_DECLARATION_TEXT}</p>
              <div className="text-xs text-muted-foreground">
                نام شاغل: <span className="text-foreground">{c.workerDeclarationName || '—'}</span>
              </div>
              {c.workerDeclaration && (
                <img src={c.workerDeclaration} alt="امضای شاغل" className="h-14 rounded border bg-white" />
              )}
            </div>
            {(role === 'ADMIN' || role === 'MANAGER') && c.finalOpinion !== 'INCOMPLETE' && (
              <Button variant="outline" size="sm" onClick={reopen} disabled={reopenBusy}>
                {reopenBusy ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                بازگشایی نظریه
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* راهنما برای نقش‌های غیرپزشکی وقتی نظریه ثبت نشده */}
      {!formActive && !hasResult && (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          نظریه نهایی توسط پزشک متخصص طب کار ثبت می‌شود.
        </div>
      )}
    </div>
  )
}
