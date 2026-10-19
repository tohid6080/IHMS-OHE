'use client'

// ─── اکشن‌های مشترک هر بخش پرونده: ذخیره / ارسال برای بررسی / تأیید / نیازمند اصلاح / نامرتبط / بازگشایی ───
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Save, Send, CheckCircle2, CircleAlert, Ban, Undo2, Loader2, Info, ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { JalaliDateInput } from '@/components/common/JalaliDateInput'
import { SignaturePad } from '@/components/common/SignaturePad'
import { apiPost } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { todayJalali } from '@/lib/jalali'
import { canApproveSection, canEditSection } from '@/lib/case-utils'
import type { Role, SectionDTO, SectionKey } from '@/lib/types'

export const EDITABLE_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'NEEDS_CORRECTION']

// قواعد مشترک ویرایش/تأیید هر بخش — در همه فرم‌های بخش‌ها استفاده می‌شود
export function useSectionFlow(sectionKey: SectionKey, section: SectionDTO | undefined) {
  const user = useAppStore((s) => s.user)
  const role = user?.role
  const canEdit = !!role && canEditSection(role, sectionKey)
  const canApprove = !!role && canApproveSection(role, sectionKey)
  const status = section?.status ?? 'NOT_STARTED'
  const isFinal = status === 'APPROVED' || status === 'NOT_APPLICABLE'
  // ویرایش‌پذیر: کاربر اجازه ثبت دارد و بخش در وضعیت قابل ویرایش است
  // (نقش هم‌زمان ویرایشگر و تأییدکننده حتی در «ارسال برای بررسی» می‌تواند ویرایش کند)
  const editable = canEdit && !isFinal && (EDITABLE_STATUSES.includes(status) || canApprove)
  const restricted = (section?.data as Record<string, unknown> | undefined)?.__restricted === true
  return { user, role: role as Role | undefined, canEdit, canApprove, status, isFinal, editable, restricted }
}

interface SectionActionsProps {
  caseId: string
  sectionKey: SectionKey
  section: SectionDTO | undefined
  canEdit: boolean
  canApprove: boolean
  /** بار اضافه همراه اکشن‌های save/submit/approve — فرم‌ها داده بخش را از این طریق می‌فرستند (مثل { data }) */
  extraApprovePayload?: Record<string, unknown>
  onSaved: () => void
  approvalLabel?: string
}

export function SectionActions({
  caseId, sectionKey, section, canEdit, canApprove, extraApprovePayload, onSaved, approvalLabel,
}: SectionActionsProps) {
  const user = useAppStore((s) => s.user)
  const status: string = section?.status ?? 'NOT_STARTED'
  const isFinal = status === 'APPROVED' || status === 'NOT_APPLICABLE'
  const editable = canEdit && !isFinal && (EDITABLE_STATUSES.includes(status) || canApprove)
  const canSend = canEdit && !canApprove

  const [name, setName] = useState(user?.fullName || '')
  const [signature, setSignature] = useState('')
  const [note, setNote] = useState('')
  const [confirmChecked, setConfirmChecked] = useState(false)
  const [panel, setPanel] = useState<'approve' | 'reject' | 'na' | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (action: string, payload: Record<string, unknown>, successMsg: string) => {
    setBusy(action)
    try {
      await apiPost(`/api/cases/${caseId}/section/${sectionKey}`, payload)
      toast.success(successMsg)
      setPanel(null)
      setNote('')
      setConfirmChecked(false)
      setSignature('')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطای نامشخص')
    } finally {
      setBusy(null)
    }
  }

  const doSave = () => run('save', { action: 'save', ...(extraApprovePayload ?? {}) }, 'اطلاعات بخش ذخیره شد')
  const doSubmit = () => run('submit', { action: 'submit', ...(extraApprovePayload ?? {}) }, 'بخش برای بررسی ارسال شد')
  const doApprove = () =>
    run('approve', { action: 'approve', name: name.trim(), signature: signature || '', ...(extraApprovePayload ?? {}) }, 'بخش تأیید و امضا شد')
  const doReject = () =>
    run('reject', { action: 'reject', note: note.trim() }, 'بخش «نیازمند اصلاح» علامت‌گذاری شد')
  const doNa = () => run('na', { action: 'na', note: note.trim() }, 'بخش نامرتبط اعلام شد')
  const doReopen = () => run('reopen', { action: 'reopen' }, 'بخش بازگشایی شد')

  const showButtons = editable || (canApprove && !isFinal) || (status === 'APPROVED' && (user?.role === 'ADMIN' || user?.role === 'MANAGER'))

  return (
    <div className="space-y-3">
      {/* نمایش‌های وضعیت */}
      {status === 'SENT_FOR_REVIEW' && !canApprove && (
        <Alert className="border-cyan-200 bg-cyan-50 text-cyan-800">
          <Info className="size-4" />
          <AlertTitle>ارسال شده برای بررسی</AlertTitle>
          <AlertDescription>این بخش ثبت و برای بررسی ارسال شده است؛ پس از تأیید مسئول، قفل می‌شود.</AlertDescription>
        </Alert>
      )}
      {status === 'NEEDS_CORRECTION' && section?.correctionNote && (
        <Alert className="border-rose-200 bg-rose-50 text-rose-800">
          <CircleAlert className="size-4" />
          <AlertTitle>نیازمند اصلاح</AlertTitle>
          <AlertDescription>{section.correctionNote}</AlertDescription>
        </Alert>
      )}
      {status === 'NOT_APPLICABLE' && (
        <Alert className="border-slate-200 bg-slate-50 text-slate-600">
          <Ban className="size-4" />
          <AlertTitle>نامرتبط</AlertTitle>
          <AlertDescription>نامرتبط — دلیل: {section?.naReason || '—'}</AlertDescription>
        </Alert>
      )}
      {section?.approvedByName && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          تأییدکننده: {section.approvedByName}
        </div>
      )}

      {showButtons ? (
        <>
          <Separator />
          <div className="flex flex-wrap items-center gap-2">
            {editable && (
              <Button size="sm" onClick={doSave} disabled={busy !== null}>
                {busy === 'save' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                ذخیره
              </Button>
            )}
            {canSend && editable && (
              <Button size="sm" variant="secondary" onClick={doSubmit} disabled={busy !== null}>
                {busy === 'submit' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                ارسال برای بررسی
              </Button>
            )}
            {canApprove && status !== 'APPROVED' && status !== 'NOT_APPLICABLE' && (
              <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => setPanel(panel === 'approve' ? null : 'approve')}
                disabled={busy !== null}
              >
                <CheckCircle2 className="size-4" />
                {approvalLabel || 'تأیید و امضا'}
              </Button>
            )}
            {canApprove && status !== 'NEEDS_CORRECTION' && status !== 'NOT_APPLICABLE' && (
              <Button
                size="sm"
                variant="outline"
                className="border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={() => setPanel(panel === 'reject' ? null : 'reject')}
                disabled={busy !== null}
              >
                <CircleAlert className="size-4" />
                نیازمند اصلاح
              </Button>
            )}
            {canApprove && status !== 'APPROVED' && status !== 'NOT_APPLICABLE' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPanel(panel === 'na' ? null : 'na')}
                disabled={busy !== null}
              >
                <Ban className="size-4" />
                نامرتبط
              </Button>
            )}
            {status === 'APPROVED' && (user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
              <Button size="sm" variant="outline" onClick={doReopen} disabled={busy !== null}>
                {busy === 'reopen' ? <Loader2 className="size-4 animate-spin" /> : <Undo2 className="size-4" />}
                بازگشایی
              </Button>
            )}
          </div>

          {/* پنل تأیید و امضا */}
          {panel === 'approve' && (
            <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>نام تأییدکننده</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} disabled={busy !== null} placeholder="نام و نام خانوادگی" />
                </div>
                <div className="space-y-1.5">
                  <Label>تاریخ تأیید</Label>
                  <JalaliDateInput value={todayJalali()} onChange={() => {}} disabled />
                </div>
              </div>
              <SignaturePad value={signature} onChange={setSignature} label="امضا (اختیاری)" disabled={busy !== null} />
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`confirm-${sectionKey}`}
                  checked={confirmChecked}
                  onCheckedChange={(v) => setConfirmChecked(v === true)}
                  disabled={busy !== null}
                />
                <Label htmlFor={`confirm-${sectionKey}`} className="text-sm font-normal">
                  صحت اطلاعات را تأیید می‌کنم
                </Label>
              </div>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={doApprove}
                disabled={busy !== null || !confirmChecked || !name.trim()}
              >
                {busy === 'approve' ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                {approvalLabel || 'تأیید و امضا'}
              </Button>
            </div>
          )}

          {/* پنل نیازمند اصلاح */}
          {panel === 'reject' && (
            <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50/60 p-3">
              <Label>دلیل نیاز به اصلاح (اجباری)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="مشکل یا نقصی که باید اصلاح شود را بنویسید…"
                disabled={busy !== null}
              />
              <Button
                variant="outline"
                className="border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={doReject}
                disabled={busy !== null || !note.trim()}
              >
                {busy === 'reject' ? <Loader2 className="size-4 animate-spin" /> : <CircleAlert className="size-4" />}
                ثبت نیازمند اصلاح
              </Button>
            </div>
          )}

          {/* پنل نامرتبط */}
          {panel === 'na' && (
            <div className="space-y-2 rounded-lg border p-3">
              <Label>دلیل نامرتبط بودن بخش (اجباری)</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثلاً: با توجه به شرایط شغلی این آزمایش لازم نیست"
                disabled={busy !== null}
              />
              <Button variant="outline" onClick={doNa} disabled={busy !== null || !note.trim()}>
                {busy === 'na' ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
                ثبت نامرتبط
              </Button>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
