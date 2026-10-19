'use client'

// ─── بخش ۲: سوابق شغلی (مشاغل فعلی و قبلی) ───
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Ban } from 'lucide-react'
import { JalaliDateInput } from '@/components/common/JalaliDateInput'
import { SectionActions, useSectionFlow } from './SectionActions'
import type { CaseDetailDTO, JobHistoryRow, Section2Data, SectionDTO } from '@/lib/types'

interface Props {
  caseId: string
  section: SectionDTO | undefined
  caseData: CaseDetailDTO
  onSaved: () => void
}

const emptyRow = (): JobHistoryRow => ({ position: '', duties: '', fromDate: '', toDate: '', changeReason: '' })

const isRowEmpty = (r: JobHistoryRow) =>
  !r.position?.trim() && !r.duties?.trim() && !r.fromDate && !r.toDate && !r.changeReason?.trim()

function JobRows({
  title, rows, setRows, disabled,
}: {
  title: string
  rows: JobHistoryRow[]
  setRows: (rows: JobHistoryRow[]) => void
  disabled: boolean
}) {
  const update = (i: number, patch: Partial<JobHistoryRow>) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const remove = (i: number) => setRows(rows.filter((_, idx) => idx !== i))
  const add = () => setRows([...rows, emptyRow()])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        <Button type="button" size="sm" variant="outline" onClick={add} disabled={disabled}>
          <Plus className="size-4" /> افزودن ردیف
        </Button>
      </div>
      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">ردیفی ثبت نشده است</div>
      )}
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border bg-slate-50/40 p-3 sm:grid-cols-2 lg:grid-cols-12">
          <div className="space-y-1 lg:col-span-3">
            <Label className="text-xs">عنوان / سمت</Label>
            <Input value={r.position || ''} onChange={(e) => update(i, { position: e.target.value })} disabled={disabled} />
          </div>
          <div className="space-y-1 lg:col-span-5">
            <Label className="text-xs">وظایف محوله</Label>
            <Textarea value={r.duties || ''} onChange={(e) => update(i, { duties: e.target.value })} rows={2} disabled={disabled} />
          </div>
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">از تاریخ</Label>
            <JalaliDateInput value={r.fromDate || ''} onChange={(v) => update(i, { fromDate: v })} disabled={disabled} />
          </div>
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">تا تاریخ</Label>
            <Input
              value={r.toDate || ''}
              onChange={(e) => update(i, { toDate: e.target.value })}
              placeholder="اکنون یا تاریخ"
              disabled={disabled}
            />
          </div>
          <div className="flex items-end justify-between gap-2 sm:col-span-2 lg:col-span-12">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">علت تغییر شغل</Label>
              <Input value={r.changeReason || ''} onChange={(e) => update(i, { changeReason: e.target.value })} disabled={disabled} />
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => remove(i)}
              disabled={disabled}
              aria-label="حذف ردیف"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function Section2Form({ caseId, section, onSaved }: Props) {
  const flow = useSectionFlow('S2', section)
  const { editable, restricted } = flow
  const d = (section?.data || {}) as Partial<Section2Data>

  const [current, setCurrent] = useState<JobHistoryRow[]>(
    Array.isArray(d.current) && d.current.length > 0 ? d.current.map((r) => ({ ...emptyRow(), ...r })) : [emptyRow()],
  )
  const [previous, setPrevious] = useState<JobHistoryRow[]>(
    Array.isArray(d.previous) && d.previous.length > 0 ? d.previous.map((r) => ({ ...emptyRow(), ...r })) : [emptyRow()],
  )

  if (restricted) {
    return (
      <Alert className="border-slate-200 bg-slate-50 text-slate-600">
        <Ban className="size-4" />
        <AlertDescription>این بخش محرمانه است و برای نقش شما نمایش داده نمی‌شود</AlertDescription>
      </Alert>
    )
  }

  const buildData = (): Section2Data => ({
    current: current.filter((r) => !isRowEmpty(r)),
    previous: previous.filter((r) => !isRowEmpty(r)),
  })

  return (
    <div className="space-y-4">
      <JobRows title="مشاغل فعلی" rows={current} setRows={setCurrent} disabled={!editable} />
      <JobRows title="مشاغل قبلی" rows={previous} setRows={setPrevious} disabled={!editable} />
      <SectionActions
        caseId={caseId}
        sectionKey="S2"
        section={section}
        canEdit={flow.canEdit}
        canApprove={flow.canApprove}
        extraApprovePayload={{ data: buildData() }}
        onSaved={onSaved}
      />
    </div>
  )
}
