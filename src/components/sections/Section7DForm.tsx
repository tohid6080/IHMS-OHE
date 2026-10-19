'use client'

// ─── بخش ۷-د: سایر اقدامات پاراکلینیکی (CXR / ECG / سایر) ───
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Ban } from 'lucide-react'
import { JalaliDateInput } from '@/components/common/JalaliDateInput'
import { SectionActions, useSectionFlow } from './SectionActions'
import type { CaseDetailDTO, Section7DData, SectionDTO } from '@/lib/types'

interface Props {
  caseId: string
  section: SectionDTO | undefined
  caseData: CaseDetailDTO
  onSaved: () => void
}

export function Section7DForm({ caseId, section, onSaved }: Props) {
  const flow = useSectionFlow('S7D', section)
  const { editable, restricted } = flow
  const d = (section?.data || {}) as Partial<Section7DData>

  const [cxrDate, setCxrDate] = useState(d.cxrDate || '')
  const [ecgDate, setEcgDate] = useState(d.ecgDate || '')
  const [cxr, setCxr] = useState(d.cxr || '')
  const [ecg, setEcg] = useState(d.ecg || '')
  const [others, setOthers] = useState(d.others || '')
  const [notes, setNotes] = useState(d.notes || '')
  const [technicianName, setTechnicianName] = useState(d.technicianName || '')

  if (restricted) {
    return (
      <Alert className="border-slate-200 bg-slate-50 text-slate-600">
        <Ban className="size-4" />
        <AlertDescription>این بخش محرمانه است و برای نقش شما نمایش داده نمی‌شود</AlertDescription>
      </Alert>
    )
  }

  const buildData = (): Section7DData => ({
    cxr,
    cxrDate: cxrDate || undefined,
    ecg,
    ecgDate: ecgDate || undefined,
    others,
    notes,
    technicianName,
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>تاریخ CXR</Label>
          <JalaliDateInput value={cxrDate} onChange={setCxrDate} disabled={!editable} />
        </div>
        <div className="space-y-1.5">
          <Label>تاریخ ECG</Label>
          <JalaliDateInput value={ecgDate} onChange={setEcgDate} disabled={!editable} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>نتیجه CXR (بافت‌های CXR P-A)</Label>
        <Textarea value={cxr} onChange={(e) => setCxr(e.target.value)} rows={3} disabled={!editable} />
      </div>
      <div className="space-y-1.5">
        <Label>نتیجه ECG</Label>
        <Textarea value={ecg} onChange={(e) => setEcg(e.target.value)} rows={3} disabled={!editable} />
      </div>
      <div className="space-y-1.5">
        <Label>سایر موارد</Label>
        <Textarea value={others} onChange={(e) => setOthers(e.target.value)} rows={2} disabled={!editable} />
      </div>
      <div className="space-y-1.5">
        <Label>توضیحات</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} disabled={!editable} />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label>نام تکنسین</Label>
          <Input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} disabled={!editable} />
        </div>
      </div>

      {/* تأیید نهایی این بخش با پزشک است — SectionActions معمولی */}
      <SectionActions
        caseId={caseId}
        sectionKey="S7D"
        section={section}
        canEdit={flow.canEdit}
        canApprove={flow.canApprove}
        extraApprovePayload={{ data: buildData() }}
        onSaved={onSaved}
      />
    </div>
  )
}
