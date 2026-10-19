'use client'

// ─── بخش ۵: معاینات بالینی (ویتال + سیستم‌های اندام) ───
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Ban } from 'lucide-react'
import { JalaliDateInput } from '@/components/common/JalaliDateInput'
import { SectionActions, useSectionFlow } from './SectionActions'
import { ORGAN_SYSTEMS } from '@/lib/constants'
import { toEn, toFa } from '@/lib/jalali'
import type { CaseDetailDTO, OrganSystem, Section5Data, SectionDTO, SystemKey } from '@/lib/types'

interface Props {
  caseId: string
  section: SectionDTO | undefined
  caseData: CaseDetailDTO
  onSaved: () => void
}

export function Section5Form({ caseId, section, onSaved }: Props) {
  const flow = useSectionFlow('S5', section)
  const { editable, restricted } = flow
  const d = (section?.data || {}) as Partial<Section5Data>

  const [examDate, setExamDate] = useState(d.examDate || '')
  const [weight, setWeight] = useState(d.weight || '')
  const [height, setHeight] = useState(d.height || '')
  const [pulse, setPulse] = useState(d.pulse || '')
  const [systolic, setSystolic] = useState(d.systolic || '')
  const [diastolic, setDiastolic] = useState(d.diastolic || '')
  const [systems, setSystems] = useState<Partial<Record<SystemKey, OrganSystem>>>(d.systems || {})

  if (restricted) {
    return (
      <Alert className="border-slate-200 bg-slate-50 text-slate-600">
        <Ban className="size-4" />
        <AlertDescription>این بخش محرمانه است و برای نقش شما نمایش داده نمی‌شود</AlertDescription>
      </Alert>
    )
  }

  // BMI فقط برای نمایش محاسبه می‌شود و در داده ذخیره نمی‌شود
  const bmi = (() => {
    const w = Number(toEn(weight))
    const h = Number(toEn(height))
    if (!w || !h || h <= 0) return null
    return (w / Math.pow(h / 100, 2)).toFixed(2)
  })()

  const toggleItem = (key: SystemKey, field: 'symptoms' | 'signs', item: string) => {
    setSystems((prev) => {
      const cur: OrganSystem = prev[key] || { symptoms: [], signs: [] }
      const arr = cur[field] || []
      const next = arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
      return { ...prev, [key]: { ...cur, [field]: next } }
    })
  }
  const setSystemNotes = (key: SystemKey, notes: string) =>
    setSystems((prev) => ({
      ...prev,
      [key]: { symptoms: prev[key]?.symptoms || [], signs: prev[key]?.signs || [], notes },
    }))

  const buildData = (): Section5Data => ({
    examDate: examDate || undefined,
    weight,
    height,
    pulse,
    systolic,
    diastolic,
    systems,
  })

  const vitalFields = [
    { label: 'وزن (kg)', value: weight, set: setWeight, placeholder: 'مثلاً 82' },
    { label: 'قد (cm)', value: height, set: setHeight, placeholder: 'مثلاً 178' },
    { label: 'نبض', value: pulse, set: setPulse, placeholder: 'مثلاً 76' },
    { label: 'فشار سیستولیک', value: systolic, set: setSystolic, placeholder: '120' },
    { label: 'فشار دیاستولیک', value: diastolic, set: setDiastolic, placeholder: '80' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 rounded-lg border bg-slate-50/40 p-3 sm:grid-cols-3 lg:grid-cols-12">
        <div className="space-y-1.5 sm:col-span-3 lg:col-span-4">
          <Label className="text-xs">تاریخ معاینه</Label>
          <JalaliDateInput value={examDate} onChange={setExamDate} disabled={!editable} />
        </div>
        {vitalFields.map((f) => (
          <div key={f.label} className="space-y-1.5 lg:col-span-1">
            <Label className="text-xs">{f.label}</Label>
            <Input
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              inputMode="decimal"
              dir="ltr"
              placeholder={f.placeholder}
              disabled={!editable}
            />
          </div>
        ))}
        <div className="flex items-end justify-center rounded-lg border border-teal-200 bg-teal-50 p-2 text-center sm:col-span-3 lg:col-span-3">
          <div>
            <div className="text-[10px] text-teal-700">شاخص توده بدنی (BMI)</div>
            <div className="text-lg font-bold text-teal-800">{bmi !== null ? toFa(bmi) : '—'}</div>
          </div>
        </div>
      </div>

      {ORGAN_SYSTEMS.map((sys) => (
        <div key={sys.key} className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">{sys.label}</Badge>
          </div>
          {sys.key === 'other' ? (
            <div className="space-y-1.5">
              <Label className="text-xs">توضیحات</Label>
              <Textarea
                value={systems.other?.notes || ''}
                onChange={(e) => setSystemNotes('other', e.target.value)}
                rows={2}
                disabled={!editable}
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground">علامات (Symptom)</div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {sys.symptoms.map((item) => (
                      <label key={item} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={systems[sys.key]?.symptoms?.includes(item) || false}
                          onCheckedChange={() => toggleItem(sys.key, 'symptoms', item)}
                          disabled={!editable}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground">نشانه‌ها (Sign)</div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {sys.signs.map((item) => (
                      <label key={item} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={systems[sys.key]?.signs?.includes(item) || false}
                          onCheckedChange={() => toggleItem(sys.key, 'signs', item)}
                          disabled={!editable}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">توضیحات</Label>
                <Input
                  value={systems[sys.key]?.notes || ''}
                  onChange={(e) => setSystemNotes(sys.key, e.target.value)}
                  disabled={!editable}
                />
              </div>
            </>
          )}
        </div>
      ))}

      <SectionActions
        caseId={caseId}
        sectionKey="S5"
        section={section}
        canEdit={flow.canEdit}
        canApprove={flow.canApprove}
        extraApprovePayload={{ data: buildData() }}
        onSaved={onSaved}
      />
    </div>
  )
}
