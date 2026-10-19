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
import type { CaseDetailDTO, Section6Data, SectionDTO } from '@/lib/types'

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

  const buildData = (): Section6Data => ({
    testDate: testDate || undefined,
    values,
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
