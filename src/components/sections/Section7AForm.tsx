'use client'

// ─── بخش ۷-الف: اپتومتری ───
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Ban } from 'lucide-react'
import { JalaliDateInput } from '@/components/common/JalaliDateInput'
import { SignaturePad } from '@/components/common/SignaturePad'
import { SectionActions, useSectionFlow } from './SectionActions'
import { VISION_STATUS_LABELS } from '@/lib/constants'
import type { CaseDetailDTO, Section7AData, SectionDTO, VisionStatus } from '@/lib/types'

interface Props {
  caseId: string
  section: SectionDTO | undefined
  caseData: CaseDetailDTO
  onSaved: () => void
}

const EMPTY = '__empty__'

function VisionSelect({
  value, onChange, disabled,
}: {
  value: VisionStatus | undefined
  onChange: (v: VisionStatus) => void
  disabled?: boolean
}) {
  return (
    <Select
      value={value || EMPTY}
      onValueChange={(v) => onChange(v === EMPTY ? '' : (v as VisionStatus))}
      disabled={disabled}
    >
      <SelectTrigger size="sm" className="w-[110px]">
        <SelectValue placeholder="انتخاب" />
      </SelectTrigger>
      <SelectContent dir="rtl">
        <SelectItem value={EMPTY}>—</SelectItem>
        {Object.entries(VISION_STATUS_LABELS).map(([k, v]) => (
          <SelectItem key={k} value={k}>{v}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function Section7AForm({ caseId, section, onSaved }: Props) {
  const flow = useSectionFlow('S7A', section)
  const { editable, restricted } = flow
  const d = (section?.data || {}) as Partial<Section7AData>

  const [testDate, setTestDate] = useState(d.testDate || '')
  const [acuityRightWith, setAcuityRightWith] = useState(d.acuityRightWith || '')
  const [acuityRightWithout, setAcuityRightWithout] = useState(d.acuityRightWithout || '')
  const [acuityLeftWith, setAcuityLeftWith] = useState(d.acuityLeftWith || '')
  const [acuityLeftWithout, setAcuityLeftWithout] = useState(d.acuityLeftWithout || '')
  const [colorRight, setColorRight] = useState<VisionStatus>(d.colorRight || '')
  const [colorLeft, setColorLeft] = useState<VisionStatus>(d.colorLeft || '')
  const [fieldRight, setFieldRight] = useState<VisionStatus>(d.fieldRight || '')
  const [fieldLeft, setFieldLeft] = useState<VisionStatus>(d.fieldLeft || '')
  const [nightRight, setNightRight] = useState<VisionStatus>(d.nightRight || '')
  const [nightLeft, setNightLeft] = useState<VisionStatus>(d.nightLeft || '')
  const [notes, setNotes] = useState(d.notes || '')
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

  const buildData = (): Section7AData => ({
    testDate: testDate || undefined,
    acuityRightWith,
    acuityRightWithout,
    acuityLeftWith,
    acuityLeftWithout,
    colorRight,
    colorLeft,
    fieldRight,
    fieldLeft,
    nightRight,
    nightLeft,
    notes,
    technicianName,
    signature: signature || undefined,
  })

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>تاریخ انجام تست</Label>
        <JalaliDateInput value={testDate} onChange={setTestDate} disabled={!editable} />
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>چشم</TableHead>
              <TableHead>حدت دید با اصلاح</TableHead>
              <TableHead>حدت دید بدون اصلاح</TableHead>
              <TableHead>دید رنگی</TableHead>
              <TableHead>میدان بینایی</TableHead>
              <TableHead>شب‌کوری</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">راست</TableCell>
              <TableCell>
                <Input value={acuityRightWith} onChange={(e) => setAcuityRightWith(e.target.value)} disabled={!editable} dir="ltr" className="w-24" placeholder="10/10" />
              </TableCell>
              <TableCell>
                <Input value={acuityRightWithout} onChange={(e) => setAcuityRightWithout(e.target.value)} disabled={!editable} dir="ltr" className="w-24" />
              </TableCell>
              <TableCell><VisionSelect value={colorRight} onChange={setColorRight} disabled={!editable} /></TableCell>
              <TableCell><VisionSelect value={fieldRight} onChange={setFieldRight} disabled={!editable} /></TableCell>
              <TableCell><VisionSelect value={nightRight} onChange={setNightRight} disabled={!editable} /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">چپ</TableCell>
              <TableCell>
                <Input value={acuityLeftWith} onChange={(e) => setAcuityLeftWith(e.target.value)} disabled={!editable} dir="ltr" className="w-24" placeholder="10/10" />
              </TableCell>
              <TableCell>
                <Input value={acuityLeftWithout} onChange={(e) => setAcuityLeftWithout(e.target.value)} disabled={!editable} dir="ltr" className="w-24" />
              </TableCell>
              <TableCell><VisionSelect value={colorLeft} onChange={setColorLeft} disabled={!editable} /></TableCell>
              <TableCell><VisionSelect value={fieldLeft} onChange={setFieldLeft} disabled={!editable} /></TableCell>
              <TableCell><VisionSelect value={nightLeft} onChange={setNightLeft} disabled={!editable} /></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="space-y-1.5">
        <Label>توضیحات</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} disabled={!editable} />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label>نام تکنسین / اپتومتریست</Label>
          <Input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} disabled={!editable} />
        </div>
      </div>
      <SignaturePad value={signature} onChange={setSignature} label="امضا" disabled={!editable} />

      <SectionActions
        caseId={caseId}
        sectionKey="S7A"
        section={section}
        canEdit={flow.canEdit}
        canApprove={flow.canApprove}
        extraApprovePayload={{ data: buildData() }}
        onSaved={onSaved}
      />
    </div>
  )
}
