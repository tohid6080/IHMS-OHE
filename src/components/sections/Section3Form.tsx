'use client'

// ─── بخش ۳: ارزیابی عوامل زیان‌آور شغلی ───
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Ban } from 'lucide-react'
import { JalaliDateInput } from '@/components/common/JalaliDateInput'
import { SignaturePad } from '@/components/common/SignaturePad'
import { SectionActions, useSectionFlow } from './SectionActions'
import { FACTOR_GROUPS, FACTOR_GROUP_LABELS } from '@/lib/constants'
import type { CaseDetailDTO, FactorRow, Section3Data, SectionDTO } from '@/lib/types'

interface Props {
  caseId: string
  section: SectionDTO | undefined
  caseData: CaseDetailDTO
  onSaved: () => void
}

type GroupKey = keyof typeof FACTOR_GROUPS
const GROUP_KEYS = Object.keys(FACTOR_GROUPS) as GroupKey[]

const emptyFactors = (): FactorRow => ({ physical: [], chemical: [], biological: [], ergonomic: [], psychological: [] })

function FactorBlock({
  title, value, onToggle, disabled,
}: {
  title: string
  value: FactorRow
  onToggle: (g: GroupKey, item: string) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-slate-50/40 p-3">
      <div className="text-sm font-medium">{title}</div>
      {GROUP_KEYS.map((g) => (
        <div key={g} className="space-y-1.5">
          <div className="text-xs font-medium text-teal-700">{FACTOR_GROUP_LABELS[g]}</div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {FACTOR_GROUPS[g].map((item) => (
              <label key={item} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={value[g]?.includes(item) || false}
                  onCheckedChange={() => onToggle(g, item)}
                  disabled={disabled}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Section3Form({ caseId, section, onSaved }: Props) {
  const flow = useSectionFlow('S3', section)
  const { editable, restricted } = flow
  const d = (section?.data || {}) as Partial<Section3Data>

  const [current, setCurrent] = useState<FactorRow>(() => ({ ...emptyFactors(), ...(d.current || {}) }))
  const [previous, setPrevious] = useState<FactorRow>(() => ({ ...emptyFactors(), ...(d.previous || {}) }))
  const [more, setMore] = useState(d.more || '')
  const [measurements, setMeasurements] = useState(d.measurements || '')
  const [expertOpinion, setExpertOpinion] = useState(d.expertOpinion || '')
  const [expertName, setExpertName] = useState(d.expertName || '')
  const [expertDate, setExpertDate] = useState(d.expertDate || '')
  const [signature, setSignature] = useState(d.signature || '')

  if (restricted) {
    return (
      <Alert className="border-slate-200 bg-slate-50 text-slate-600">
        <Ban className="size-4" />
        <AlertDescription>این بخش محرمانه است و برای نقش شما نمایش داده نمی‌شود</AlertDescription>
      </Alert>
    )
  }

  const toggle = (
    block: 'current' | 'previous',
    setBlock: (fn: (prev: FactorRow) => FactorRow) => void,
    g: GroupKey,
    item: string,
  ) => {
    setBlock((prev) => {
      const arr = prev[g] || []
      const next = arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
      return { ...prev, [g]: next }
    })
  }

  const buildData = (): Section3Data => ({
    current,
    previous,
    more,
    measurements,
    expertOpinion,
    expertName,
    expertDate: expertDate || undefined,
    signature: signature || undefined,
  })

  return (
    <div className="space-y-4">
      <FactorBlock
        title="مشاغل فعلی"
        value={current}
        onToggle={(g, item) => toggle('current', setCurrent, g, item)}
        disabled={!editable}
      />
      <FactorBlock
        title="مشاغل قبلی"
        value={previous}
        onToggle={(g, item) => toggle('previous', setPrevious, g, item)}
        disabled={!editable}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label>موارد بیشتر</Label>
          <Input value={more} onChange={(e) => setMore(e.target.value)} disabled={!editable} placeholder="سایر عوامل زیان‌آور…" />
        </div>
        <div className="space-y-1.5">
          <Label>نام کارشناس بهداشت حرفه‌ای</Label>
          <Input value={expertName} onChange={(e) => setExpertName(e.target.value)} disabled={!editable} />
        </div>
        <div className="space-y-1.5">
          <Label>تاریخ ارزیابی</Label>
          <JalaliDateInput value={expertDate} onChange={setExpertDate} disabled={!editable} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>توضیحات: نتایج اندازه‌گیری عوامل با توجه به نزدیک‌ترین گروه شغلی</Label>
        <Textarea value={measurements} onChange={(e) => setMeasurements(e.target.value)} rows={3} disabled={!editable} />
      </div>
      <div className="space-y-1.5">
        <Label>نظریه کارشناس بهداشت حرفه‌ای درباره شرایط محیط کار</Label>
        <Textarea value={expertOpinion} onChange={(e) => setExpertOpinion(e.target.value)} rows={3} disabled={!editable} />
      </div>
      <SignaturePad value={signature} onChange={setSignature} label="امضای کارشناس" disabled={!editable} />

      <SectionActions
        caseId={caseId}
        sectionKey="S3"
        section={section}
        canEdit={flow.canEdit}
        canApprove={flow.canApprove}
        extraApprovePayload={{ data: buildData() }}
        onSaved={onSaved}
      />
    </div>
  )
}
