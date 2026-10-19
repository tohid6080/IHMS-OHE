import type { OpenItem, Role, SectionDTO, SectionKey } from './types'
import { SECTION_DEFS, SECTION_RESPONSIBLE, ROLE_LABELS, FINAL_OPINION_LABELS } from './constants'

export type DbSection = {
  key: string
  status: string
  data: string
  approvedByName?: string | null
  correctionNote?: string | null
}

// آیا نقش می‌تواند داده این بخش را ثبت/ویرایش کند
export function canEditSection(role: Role, key: SectionKey): boolean {
  const def = SECTION_DEFS.find((d) => d.key === key)
  if (!def) return false
  return def.editorRoles.includes(role)
}

// آیا نقش می‌تواند این بخش را تأیید/رد/نامرتبط کند
export function canApproveSection(role: Role, key: SectionKey): boolean {
  const def = SECTION_DEFS.find((d) => d.key === key)
  if (!def) return false
  return def.approverRoles.includes(role)
}

export function sectionTitle(key: SectionKey): string {
  const def = SECTION_DEFS.find((d) => d.key === key)
  return def ? `بخش ${def.number} - ${def.title}` : key
}

// آیا داده بخش «واقعاً پر شده» است (فراتر از {}
export function sectionHasData(sec: DbSection | undefined): boolean {
  if (!sec) return false
  try {
    const d = JSON.parse(sec.data || '{}')
    return Object.keys(d).length > 0 && JSON.stringify(d) !== '{}'
  } catch {
    return false
  }
}

// موارد باز پرونده + مسئول هر مورد
export function computeOpenItems(
  sections: (DbSection | undefined)[],
  finalOpinion?: string | null,
  openReferrals = 0,
): OpenItem[] {
  const items: OpenItem[] = []
  for (const def of SECTION_DEFS) {
    const sec = sections.find((s) => s && s.key === def.key)
    const status = sec?.status || 'NOT_STARTED'
    if (status === 'APPROVED' || status === 'NOT_APPLICABLE') continue
    const role = SECTION_RESPONSIBLE[def.key]
    let label = `${sectionTitle(def.key)} — ${statusLabel(status)}`
    if (def.key === 'S8') {
      label = openReferrals > 0
        ? `بخش ۸ — ${openReferrals} ارجاع پزشکی در انتظار تعیین تکلیف`
        : `${sectionTitle(def.key)} — ${statusLabel(status)}`
    }
    items.push({ key: def.key, label, responsibleRole: role, responsibleLabel: ROLE_LABELS[role] })
  }
  if (!finalOpinion || finalOpinion === 'INCOMPLETE') {
    items.push({
      key: 'FINAL',
      label: 'نظریه نهایی پزشک ثبت نشده است',
      responsibleRole: 'DOCTOR',
      responsibleLabel: ROLE_LABELS.DOCTOR,
    })
  }
  return items
}

function statusLabel(st: string): string {
  const m: Record<string, string> = {
    NOT_STARTED: 'انجام نشده',
    IN_PROGRESS: 'در حال انجام',
    SENT_FOR_REVIEW: 'در انتظار بررسی و تأیید',
    NEEDS_CORRECTION: 'نیازمند اصلاح',
  }
  return m[st] || st
}

// شرط‌های صدور گزارش نهایی تأییدشده
export function checkFinalize(
  sections: (DbSection | undefined)[],
  finalOpinion?: string | null,
  finalDate?: string | null,
  openReferrals = 0,
): { ok: boolean; blockers: string[] } {
  const blockers: string[] = []
  for (const def of SECTION_DEFS) {
    if (def.key === 'S9') continue
    if (!def.required) continue
    const sec = sections.find((s) => s && s.key === def.key)
    const status = sec?.status || 'NOT_STARTED'
    if (status !== 'APPROVED' && status !== 'NOT_APPLICABLE') {
      blockers.push(`${sectionTitle(def.key)} تأیید یا نامرتبط نشده است`)
    }
  }
  if (openReferrals > 0) blockers.push(`${openReferrals} ارجاع پزشکی بدون نتیجه تعیین تکلیف نشده است`)
  if (!finalOpinion) blockers.push('نظریه نهایی پزشک ثبت نشده است')
  if (finalOpinion === 'INCOMPLETE') blockers.push('وضعیت پرونده «ناتمام» است')
  if (!finalDate) blockers.push('تاریخ نظریه نهایی درج نشده است')
  return { ok: blockers.length === 0, blockers }
}

// درصد پیشرفت پرونده
export function computeProgress(
  sections: (DbSection | undefined)[],
  finalOpinion?: string | null,
): number {
  const defs = SECTION_DEFS.filter((d) => d.required && d.key !== 'S9')
  let done = 0
  for (const def of defs) {
    const sec = sections.find((s) => s && s.key === def.key)
    const status = sec?.status || 'NOT_STARTED'
    if (status === 'APPROVED' || status === 'NOT_APPLICABLE') done += 1
    else if (status === 'SENT_FOR_REVIEW') done += 0.6
    else if (status === 'IN_PROGRESS' || status === 'NEEDS_CORRECTION') done += 0.25
  }
  let total = defs.length
  if (finalOpinion && finalOpinion !== 'INCOMPLETE') done += 1
  total += 1
  return Math.round((done / total) * 100)
}

// آیا نقش به داده پزشکی تفصیلی (بخش‌های ۴ تا ۷) دسترسی دارد
export const MEDICAL_SECTION_KEYS: SectionKey[] = ['S4', 'S5', 'S6', 'S7A', 'S7B', 'S7C', 'S7D']
export function canSeeMedicalDetail(role: Role): boolean {
  return !['EMPLOYER', 'CONTRACTOR', 'WORKER'].includes(role)
}

// متن محدودشده برای نقش‌های غیرپزشکی
export function redactSectionIfNeeded(role: Role, key: SectionKey, sec: SectionDTO | undefined): SectionDTO | undefined {
  if (!sec) return sec
  if (canSeeMedicalDetail(role)) return sec
  if (MEDICAL_SECTION_KEYS.includes(key)) {
    return { ...sec, data: { __restricted: true } as Record<string, unknown> }
  }
  return sec
}

export { FINAL_OPINION_LABELS }
