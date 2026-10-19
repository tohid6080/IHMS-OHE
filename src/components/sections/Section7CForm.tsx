'use client'

// ─── بخش ۷-ج: اسپیرومتری ───
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Ban } from 'lucide-react'
import { JalaliDateInput } from '@/components/common/JalaliDateInput'
import { SignaturePad } from '@/components/common/SignaturePad'
import { SectionActions, useSectionFlow } from './SectionActions'
import type { CaseDetailDTO, Section7CData, SectionDTO } from '@/lib/types'

interface Props {
  caseId: string
  section: SectionDTO | undefined
  caseData: CaseDetailDTO
  onSaved: () => void
}

export function Section7CForm({ caseId, section, onSaved }: Props) {
  const flow = useSectionFlow('S7C', section)
  const { editable, restricted } = flow
  const d = (section?.data || {}) as Partial<Section7CData>

  const [testDate, setTestDate] = useState(d.testDate || '')
  const [fev1Value, setFev1Value] = useState(d.fev1Value || '')
  const [fev1Percent, setFev1Percent] = useState(d.fev1Percent || '')
  const [fvcValue, setFvcValue] = useState(d.fvcValue || '')
  const [fvcPercent, setFvcPercent] = useState(d.fvcPercent || '')
  const [fev1Fvc, setFev1Fvc] = useState(d.fev1Fvc || '')
  const [fef, setFef] = useState(d.fef || '')
  const [pef, setPef] = useState(d.pef || '')
  const [vext, setVext] = useState(d.vext || '')
  const [interpretation, setInterpretation] = useState(d.interpretation || '')
  const [technicianName, setTechnicianName] = useState(d.technicianName || '')
  const [signature, setSignature] = useState(d.signature || '')

  if (restricted) {
    return (
      <Alert className="border-slate-200 bg-slate-50 text-slate-600">
        <Ban className="size-4" />
        <AlertDescription>این بخش محرمانه است و برای نقش شما نمایش داده نمی‌شود</AlertDescription>
      </Alert>
    )
  }

  const buildData = (): Section7CData => ({
    testDate: testDate || undefined,
    fev1Value,
    fev1Percent,
    fvcValue,
    fvcPercent,
    fev1Fvc,
    fef,
    pef,
    vext,
    interpretation,
    technicianName,
    signature: signature || undefined,
  })

  const fields = [
    { label: 'FEV1 (مقدار)', value: fev1Value, set: setFev1Value },
    { label: 'FEV1 (٪)', value: fev1Percent, set: setFev1Percent },
    { label: 'FVC (مقدار)', value: fvcValue, set: setFvcValue },
    { label: 'FVC (٪)', value: fvcPercent, set: setFvcPercent },
    { label: 'FEV1/FVC (٪)', value: fev1Fvc, set: setFev1Fvc },
    { label: 'FEF (25-75)', value: fef, set: setFef },
    { label: 'PEF', value: pef, set: setPef },
    { label: 'VEXT', value: vext, set: setVext },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>تاریخ انجام تست</Label>
        <JalaliDateInput value={testDate} onChange={setTestDate} disabled={!editable} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {fields.map((f) => (
          <div key={f.label} className="space-y-1">
            <Label className="text-xs" dir="ltr">{f.label}</Label>
            <Input
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              disabled={!editable}
              dir="ltr"
              inputMode="decimal"
            />
          </div>
        ))}
        <div className="space-y-1">
          <Label className="text-xs">تفسیر</Label>
          <Input value={interpretation} onChange={(e) => setInterpretation(e.target.value)} disabled={!editable} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">نام تکنسین</Label>
          <Input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} disabled={!editable} />
        </div>
      </div>

      <SignaturePad value={signature} onChange={setSignature} label="امضا" disabled={!editable} />

      <SectionActions
        caseId={caseId}
        sectionKey="S7C"
        section={section}
        canEdit={flow.canEdit}
        canApprove={flow.canApprove}
        extraApprovePayload={{ data: buildData() }}
        onSaved={onSaved}
      />
    </div>
  )
}
