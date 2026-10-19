'use client'

// ─── بخش ۸: مشاوره‌ها و نتایج ارجاع‌ها ───
import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Ban, Info, Plus, Trash2 } from 'lucide-react'
import { JalaliDateInput } from '@/components/common/JalaliDateInput'
import { SectionActions, useSectionFlow } from './SectionActions'
import type { CaseDetailDTO, Referral, Section8Data, SectionDTO } from '@/lib/types'

interface Props {
  caseId: string
  section: SectionDTO | undefined
  caseData: CaseDetailDTO
  onSaved: () => void
}

const newReferral = (): Referral => ({
  id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  date: '',
  reason: '',
  specialty: '',
  result: '',
  resolved: false,
})

export function Section8Form({ caseId, section, onSaved }: Props) {
  const flow = useSectionFlow('S8', section)
  const { editable, restricted } = flow
  const d = (section?.data || {}) as Partial<Section8Data>

  const [referrals, setReferrals] = useState<Referral[]>(
    Array.isArray(d.referrals) && d.referrals.length > 0 ? d.referrals.map((r) => ({ ...newReferral(), ...r })) : [],
  )
  const [note, setNote] = useState(d.note || '')

  if (restricted) {
    return (
      <Alert className="border-slate-200 bg-slate-50 text-slate-600">
        <Ban className="size-4" />
        <AlertDescription>این بخش محرمانه است و برای نقش شما نمایش داده نمی‌شود</AlertDescription>
      </Alert>
    )
  }

  const update = (i: number, patch: Partial<Referral>) =>
    setReferrals((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const buildData = (): Section8Data => ({ referrals, note })

  return (
    <div className="space-y-4">
      <Alert className="border-teal-200 bg-teal-50 text-teal-800">
        <Info className="size-4" />
        <AlertTitle>تذکر مهم</AlertTitle>
        <AlertDescription>
          در صورت نیاز به ارجاع، اعلام نظر نهایی منوط به مشخص شدن نتیجه ارجاع خواهد بود.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">ارجاع‌های پزشکی</div>
          <Button size="sm" variant="outline" onClick={() => setReferrals((prev) => [...prev, newReferral()])} disabled={!editable}>
            <Plus className="size-4" /> افزودن ارجاع
          </Button>
        </div>
        {referrals.length === 0 && (
          <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
            ارجاعی ثبت نشده است
          </div>
        )}
        {referrals.map((r, i) => (
          <div key={r.id} className="grid grid-cols-1 items-start gap-2 rounded-lg border bg-slate-50/40 p-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs">تاریخ ارجاع</Label>
              <JalaliDateInput value={r.date || ''} onChange={(v) => update(i, { date: v })} disabled={!editable} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">علت ارجاع</Label>
              <Input value={r.reason || ''} onChange={(e) => update(i, { reason: e.target.value })} disabled={!editable} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">نوع تخصص</Label>
              <Input value={r.specialty || ''} onChange={(e) => update(i, { specialty: e.target.value })} disabled={!editable} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">نتیجه ارجاع</Label>
              <Input value={r.result || ''} onChange={(e) => update(i, { result: e.target.value })} disabled={!editable} />
            </div>
            <div className="flex items-center justify-between gap-2 sm:col-span-2 lg:col-span-1 lg:justify-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={r.resolved} onCheckedChange={(v) => update(i, { resolved: v === true })} disabled={!editable} />
                تعیین‌تکلیف شده
              </label>
              <Button
                size="icon"
                variant="ghost"
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setReferrals((prev) => prev.filter((_, idx) => idx !== i))}
                disabled={!editable}
                aria-label="حذف ارجاع"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>توضیحات</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} disabled={!editable} />
      </div>

      <SectionActions
        caseId={caseId}
        sectionKey="S8"
        section={section}
        canEdit={flow.canEdit}
        canApprove={flow.canApprove}
        extraApprovePayload={{ data: buildData() }}
        onSaved={onSaved}
      />
    </div>
  )
}
