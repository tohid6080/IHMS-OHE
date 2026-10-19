'use client'

// ─── بخش ۴: سابقه شخصی، خانوادگی و پزشکی (۱۶ سؤال اظهار شاغل) ───
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Ban } from 'lucide-react'
import { JalaliDateInput } from '@/components/common/JalaliDateInput'
import { SignaturePad } from '@/components/common/SignaturePad'
import { SectionActions, useSectionFlow } from './SectionActions'
import { SECTION4_QUESTIONS } from '@/lib/constants'
import { toFa } from '@/lib/jalali'
import type { CaseDetailDTO, Section4Data, Section4Item, SectionDTO, YesNo } from '@/lib/types'

interface Props {
  caseId: string
  section: SectionDTO | undefined
  caseData: CaseDetailDTO
  onSaved: () => void
}

export function Section4Form({ caseId, section, onSaved }: Props) {
  const flow = useSectionFlow('S4', section)
  const { editable, restricted } = flow
  const d = (section?.data || {}) as Partial<Section4Data>

  const [items, setItems] = useState<Section4Item[]>(() =>
    SECTION4_QUESTIONS.map((_, i) => ({ answer: d.items?.[i]?.answer || '', note: d.items?.[i]?.note || '' })),
  )
  const [declaredAt, setDeclaredAt] = useState(d.declaredAt || '')
  const [declarationSignature, setDeclarationSignature] = useState(d.declarationSignature || '')

  if (restricted) {
    return (
      <Alert className="border-slate-200 bg-slate-50 text-slate-600">
        <Ban className="size-4" />
        <AlertDescription>این بخش محرمانه است و برای نقش شما نمایش داده نمی‌شود</AlertDescription>
      </Alert>
    )
  }

  const setAnswer = (i: number, answer: YesNo) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, answer } : it)))
  const setNote = (i: number, note: string) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, note } : it)))

  const buildData = (): Section4Data => ({
    items,
    declaredAt: declaredAt || undefined,
    declarationSignature: declarationSignature || undefined,
  })

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table className="min-w-[680px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[55%]">سؤال</TableHead>
              <TableHead className="w-[130px]">پاسخ</TableHead>
              <TableHead>توضیحات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SECTION4_QUESTIONS.map((q, i) => (
              <TableRow key={i}>
                <TableCell className="align-top">
                  <span className="text-xs font-medium text-teal-700">{toFa(i + 1)}.</span> {q}
                </TableCell>
                <TableCell>
                  <RadioGroup
                    value={items[i]?.answer || undefined}
                    onValueChange={(v) => setAnswer(i, v as YesNo)}
                    className="flex gap-4"
                    disabled={!editable}
                  >
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="yes" id={`q${i}-yes`} />
                      <Label htmlFor={`q${i}-yes`} className="cursor-pointer text-sm font-normal">بلی</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="no" id={`q${i}-no`} />
                      <Label htmlFor={`q${i}-no`} className="cursor-pointer text-sm font-normal">خیر</Label>
                    </div>
                  </RadioGroup>
                </TableCell>
                <TableCell>
                  <Input
                    value={items[i]?.note || ''}
                    onChange={(e) => setNote(i, e.target.value)}
                    disabled={!editable}
                    placeholder="در صورت نیاز…"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label>تاریخ اظهار</Label>
          <JalaliDateInput value={declaredAt} onChange={setDeclaredAt} disabled={!editable} />
        </div>
        <div />
      </div>
      <SignaturePad
        value={declarationSignature}
        onChange={setDeclarationSignature}
        label="امضای شاغل در صحت اظهارات"
        disabled={!editable}
      />

      <SectionActions
        caseId={caseId}
        sectionKey="S4"
        section={section}
        canEdit={flow.canEdit}
        canApprove={flow.canApprove}
        extraApprovePayload={{ data: buildData() }}
        onSaved={onSaved}
      />
    </div>
  )
}
