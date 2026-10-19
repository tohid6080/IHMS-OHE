'use client'

// ─── بخش ۶: آزمایش‌ها (گروه‌های آزمایشگاهی) ───
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Ban } from 'lucide-react'
import { JalaliDateInput } from '@/components/common/JalaliDateInput'
import { SectionActions, useSectionFlow } from './SectionActions'
import { LAB_GROUPS } from '@/lib/constants'
import { toFa } from '@/lib/jalali'
import type { CaseDetailDTO, Section6Data, SectionDTO, SpecialTestRow } from '@/lib/types'

interface Props {
  caseId: string
  section: SectionDTO | undefined
  caseData: CaseDetailDTO
  onSaved: () => void
}

export function Section6Form({ caseId, section, onSaved }: Props) {
  const flow = useSectionFlow('S6', section)
  const { editable, restricted } = flow
  const d = (section?.data || {}) as Partial<Section6Data>

  const [testDate, setTestDate] = useState(d.testDate || '')
  const [values, setValues] = useState<Record<string, string>>(() =>
    d.values && typeof d.values === 'object' ? { ...d.values } : {},
  )
  const [special, setSpecial] = useState<SpecialTestRow[]>(() => {
    const arr = Array.isArray(d.special) ? d.special : []
    return [0, 1, 2].map((i) => ({ type: arr[i]?.type || '', result: arr[i]?.result || '', date: arr[i]?.date || '' }))
  })
  const [notes, setNotes] = useState(d.notes || '')

  if (restricted) {
    return (
      <Alert className="border-slate-200 bg-slate-50 text-slate-600">
        <Ban className="size-4" />
        <AlertDescription>این بخش محرمانه است و برای نقش شما نمایش داده نمی‌شود</AlertDescription>
      </Alert>
    )
  }

  const setValue = (k: string, v: string) => setValues((prev) => ({ ...prev, [k]: v }))
  const setSpecialRow = (i: number, patch: Partial<SpecialTestRow>) =>
    setSpecial((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const buildData = (): Section6Data => ({
    testDate: testDate || undefined,
    values,
    special: special.filter((r) => r.type.trim() || r.result.trim()),
    notes,
  })

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>تاریخ انجام آزمایش</Label>
        <JalaliDateInput value={testDate} onChange={setTestDate} disabled={!editable} />
      </div>

      {LAB_GROUPS.map((g) => (
        <div key={g.key} className="space-y-2 rounded-lg border p-3">
          <div className="text-sm font-medium text-teal-700">{g.label}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {g.fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-[11px] text-muted-foreground" dir="ltr">{f.label}</Label>
                <Input
                  value={values[f.key] || ''}
                  onChange={(e) => setValue(f.key, e.target.value)}
                  disabled={!editable}
                  dir="ltr"
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-2 rounded-lg border p-3">
        <div className="text-sm font-medium text-teal-700">آزمایش‌های تخصصی / واکسیناسیون</div>
        <div className="space-y-2">
          {special.map((row, i) => (
            <div key={i} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_150px]">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">نوع {toFa(i + 1)}</Label>
                <Input
                  value={row.type}
                  onChange={(e) => setSpecialRow(i, { type: e.target.value })}
                  disabled={!editable}
                  placeholder="مثلاً واکسیناسیون هپاتیت ب"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">نتیجه</Label>
                <Input
                  value={row.result}
                  onChange={(e) => setSpecialRow(i, { result: e.target.value })}
                  disabled={!editable}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">تاریخ انجام</Label>
                <JalaliDateInput value={row.date || ''} onChange={(val) => setSpecialRow(i, { date: val })} disabled={!editable} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>توضیحات</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} disabled={!editable} />
      </div>

      <SectionActions
        caseId={caseId}
        sectionKey="S6"
        section={section}
        canEdit={flow.canEdit}
        canApprove={flow.canApprove}
        extraApprovePayload={{ data: buildData() }}
        onSaved={onSaved}
      />
    </div>
  )
}
