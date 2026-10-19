'use client'

// ─── بخش ۷-ب: ادیومتری (ادیوگرام + شرح حال شنوایی) ───
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Ban } from 'lucide-react'
import { JalaliDateInput } from '@/components/common/JalaliDateInput'
import { SignaturePad } from '@/components/common/SignaturePad'
import { AudiogramChart } from '@/components/common/AudiogramChart'
import { SectionActions, useSectionFlow } from './SectionActions'
import { AUDIO_FREQS } from '@/lib/constants'
import { toFa } from '@/lib/jalali'
import type { AudioRow, CaseDetailDTO, Freq, Section7BData, SectionDTO } from '@/lib/types'

interface Props {
  caseId: string
  section: SectionDTO | undefined
  caseData: CaseDetailDTO
  onSaved: () => void
}

const initAudioRow = (r?: AudioRow): AudioRow => ({
  ac: Object.fromEntries(AUDIO_FREQS.map((f) => [f, r?.ac?.[f] || ''])) as Record<Freq, string>,
  bc: Object.fromEntries(AUDIO_FREQS.map((f) => [f, r?.bc?.[f] || ''])) as Record<Freq, string>,
})

export function Section7BForm({ caseId, section, onSaved }: Props) {
  const flow = useSectionFlow('S7B', section)
  const { editable, restricted } = flow
  const d = (section?.data || {}) as Partial<Section7BData>

  const [testDate, setTestDate] = useState(d.testDate || '')
  const [right, setRight] = useState<AudioRow>(() => initAudioRow(d.right))
  const [left, setLeft] = useState<AudioRow>(() => initAudioRow(d.left))
  const [srtRight, setSrtRight] = useState(d.srtRight || '')
  const [sdsRight, setSdsRight] = useState(d.sdsRight || '')
  const [srtLeft, setSrtLeft] = useState(d.srtLeft || '')
  const [sdsLeft, setSdsLeft] = useState(d.sdsLeft || '')
  const [interpretationRight, setInterpretationRight] = useState(d.interpretationRight || '')
  const [interpretationLeft, setInterpretationLeft] = useState(d.interpretationLeft || '')
  const [tympanicRight, setTympanicRight] = useState(d.tympanicRight || '')
  const [tympanicLeft, setTympanicLeft] = useState(d.tympanicLeft || '')
  const [canalEar, setCanalEar] = useState(d.canalEar || '')
  const [earDisease, setEarDisease] = useState(d.earDisease || '')
  const [tinnitus, setTinnitus] = useState(d.tinnitus || '')
  const [noiseHistory, setNoiseHistory] = useState(d.noiseHistory || '')
  const [earTrauma, setEarTrauma] = useState(d.earTrauma || '')
  const [dizziness, setDizziness] = useState(d.dizziness || '')
  const [moreNotes, setMoreNotes] = useState(d.moreNotes || '')
  const [audiologistName, setAudiologistName] = useState(d.audiologistName || '')
  const [signature, setSignature] = useState(d.signature || '')

  if (restricted) {
    return (
      <Alert className="border-slate-200 bg-slate-50 text-slate-600">
        <Ban className="size-4" />
        <AlertDescription>این بخش محرمانه است و برای نقش شما نمایش داده نمی‌شود</AlertDescription>
      </Alert>
    )
  }

  const setEar = (side: 'right' | 'left', mode: 'ac' | 'bc', f: Freq, v: string) => {
    const set = side === 'right' ? setRight : setLeft
    set((prev) => ({ ...prev, [mode]: { ...prev[mode], [f]: v } }))
  }

  const textFields: { label: string; value: string; set: (v: string) => void }[] = [
    { label: 'وضعیت پرده گوش راست', value: tympanicRight, set: setTympanicRight },
    { label: 'وضعیت پرده گوش چپ', value: tympanicLeft, set: setTympanicLeft },
    { label: 'مجرا و حلال گوش', value: canalEar, set: setCanalEar },
    { label: 'بیماری گوش', value: earDisease, set: setEarDisease },
    { label: 'وزوز گوش', value: tinnitus, set: setTinnitus },
    { label: 'نویز شنوایی / سابقه کار با صدا', value: noiseHistory, set: setNoiseHistory },
    { label: 'ترومای گوش', value: earTrauma, set: setEarTrauma },
    { label: 'سرگیجه', value: dizziness, set: setDizziness },
  ]

  const buildData = (): Section7BData => ({
    testDate: testDate || undefined,
    right,
    left,
    srtRight,
    sdsRight,
    srtLeft,
    sdsLeft,
    interpretationRight,
    interpretationLeft,
    tympanicRight,
    tympanicLeft,
    canalEar,
    earDisease,
    tinnitus,
    noiseHistory,
    earTrauma,
    dizziness,
    moreNotes,
    audiologistName,
    signature: signature || undefined,
  })

  const rows: { label: string; side: 'right' | 'left'; mode: 'ac' | 'bc' }[] = [
    { label: 'راست — AC (هوایی)', side: 'right', mode: 'ac' },
    { label: 'راست — BC (استخوانی)', side: 'right', mode: 'bc' },
    { label: 'چپ — AC (هوایی)', side: 'left', mode: 'ac' },
    { label: 'چپ — BC (استخوانی)', side: 'left', mode: 'bc' },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>تاریخ انجام تست</Label>
        <JalaliDateInput value={testDate} onChange={setTestDate} disabled={!editable} />
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>گوش / حالت</TableHead>
              {AUDIO_FREQS.map((f) => (
                <TableHead key={f} className="text-center">{toFa(f)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.label}>
                <TableCell className="whitespace-nowrap text-xs font-medium">{r.label}</TableCell>
                {AUDIO_FREQS.map((f) => (
                  <TableCell key={f} className="p-1 text-center">
                    <Input
                      value={(r.side === 'right' ? right : left)[r.mode][f] || ''}
                      onChange={(e) => setEar(r.side, r.mode, f, e.target.value)}
                      disabled={!editable}
                      inputMode="numeric"
                      dir="ltr"
                      className="mx-auto h-8 w-14 p-1 text-center"
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs">SRT راست</Label>
          <Input value={srtRight} onChange={(e) => setSrtRight(e.target.value)} disabled={!editable} dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">SDS راست</Label>
          <Input value={sdsRight} onChange={(e) => setSdsRight(e.target.value)} disabled={!editable} dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">SRT چپ</Label>
          <Input value={srtLeft} onChange={(e) => setSrtLeft(e.target.value)} disabled={!editable} dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">SDS چپ</Label>
          <Input value={sdsLeft} onChange={(e) => setSdsLeft(e.target.value)} disabled={!editable} dir="ltr" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">تفسیر گوش راست</Label>
          <Input value={interpretationRight} onChange={(e) => setInterpretationRight(e.target.value)} disabled={!editable} placeholder="مثلاً Normal" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">تفسیر گوش چپ</Label>
          <Input value={interpretationLeft} onChange={(e) => setInterpretationLeft(e.target.value)} disabled={!editable} placeholder="مثلاً Normal" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {textFields.map((f) => (
          <div key={f.label} className="space-y-1">
            <Label className="text-xs">{f.label}</Label>
            <Input value={f.value} onChange={(e) => f.set(e.target.value)} disabled={!editable} />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>توضیحات بیشتر</Label>
        <Textarea value={moreNotes} onChange={(e) => setMoreNotes(e.target.value)} rows={2} disabled={!editable} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label>نام ادیولوژیست</Label>
          <Input value={audiologistName} onChange={(e) => setAudiologistName(e.target.value)} disabled={!editable} />
        </div>
        <div />
      </div>
      <SignaturePad value={signature} onChange={setSignature} label="امضا" disabled={!editable} />

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">پیش‌نمایش زنده ادیوگرام</CardTitle>
        </CardHeader>
        <CardContent>
          <AudiogramChart compact right={{ ac: right.ac, bc: right.bc }} left={{ ac: left.ac, bc: left.bc }} />
        </CardContent>
      </Card>

      <SectionActions
        caseId={caseId}
        sectionKey="S7B"
        section={section}
        canEdit={flow.canEdit}
        canApprove={flow.canApprove}
        extraApprovePayload={{ data: buildData() }}
        onSaved={onSaved}
      />
    </div>
  )
}
