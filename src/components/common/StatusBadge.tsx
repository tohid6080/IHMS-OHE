'use client'

import { Badge } from '@/components/ui/badge'
import { SECTION_STATUS_LABELS } from '@/lib/constants'
import { CheckCircle2, CircleDashed, CircleAlert, CircleEllipsis, Ban, SendHorizonal } from 'lucide-react'

const MAP: Record<string, { cls: string; icon: React.ReactNode }> = {
  NOT_STARTED: { cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: <CircleDashed className="size-3" /> },
  IN_PROGRESS: { cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: <CircleEllipsis className="size-3" /> },
  SENT_FOR_REVIEW: { cls: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: <SendHorizonal className="size-3" /> },
  NEEDS_CORRECTION: { cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: <CircleAlert className="size-3" /> },
  APPROVED: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="size-3" /> },
  NOT_APPLICABLE: { cls: 'bg-slate-100 text-slate-500 border-slate-200', icon: <Ban className="size-3" /> },
}

export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const m = MAP[status] || MAP.NOT_STARTED
  return (
    <Badge variant="outline" className={`${m.cls} gap-1 whitespace-nowrap ${className}`}>
      {m.icon}
      {SECTION_STATUS_LABELS[status] || status}
    </Badge>
  )
}

export function FinalOpinionBadge({ opinion }: { opinion?: string | null }) {
  if (!opinion) return <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">بدون نظریه</Badge>
  const map: Record<string, string> = {
    FIT: 'bg-emerald-600 text-white border-emerald-600',
    CONDITIONAL: 'bg-amber-500 text-white border-amber-500',
    UNFIT: 'bg-rose-600 text-white border-rose-600',
    INCOMPLETE: 'bg-slate-500 text-white border-slate-500',
  }
  const label: Record<string, string> = {
    FIT: 'بلامانع', CONDITIONAL: 'مشروط', UNFIT: 'عدم صلاحیت', INCOMPLETE: 'ناتمام',
  }
  return <Badge className={`${map[opinion]} border`}>{label[opinion] || opinion}</Badge>
}
