// ─── API ثبت نظریه نهایی پزشک (بخش ۹) — فقط DOCTOR/ADMIN ───
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, HttpError, errorResponse } from '@/lib/auth'
import { toEn, isValidJalali } from '@/lib/jalali'
import { checkFinalize } from '@/lib/case-utils'
import { FINAL_OPINION_LABELS } from '@/lib/constants'

const OPINIONS = ['FIT', 'CONDITIONAL', 'UNFIT', 'INCOMPLETE']

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json()
    return b && typeof b === 'object' && !Array.isArray(b) ? (b as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function orNull(v: unknown): string | null {
  const s = String(v ?? '').trim()
  return s === '' ? null : s
}

// تعداد ارجاع‌های حل‌نشده از داده بخش ۸
function countOpenReferrals(sections: { key: string; data: string }[]): number {
  const s8 = sections.find((s) => s.key === 'S8')
  if (!s8) return 0
  try {
    const d = JSON.parse(s8.data || '{}') as { referrals?: { resolved?: boolean }[] }
    if (!Array.isArray(d.referrals)) return 0
    return d.referrals.filter((r) => r && typeof r === 'object' && !r.resolved).length
  } catch {
    return 0
  }
}

// POST /api/cases/[id]/final
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole('DOCTOR', 'ADMIN')
    const { id } = await params
    const c = await db.case.findUnique({ where: { id }, include: { sections: true } })
    if (!c) throw new HttpError(404, 'پرونده یافت نشد')

    const body = await readJson(req)

    const finalOpinion = String(body.finalOpinion || '')
    if (!OPINIONS.includes(finalOpinion)) throw new HttpError(400, 'نظریه نهایی نامعتبر است')

    const finalDoctorName = String(body.finalDoctorName || '').trim()
    if (!finalDoctorName) throw new HttpError(400, 'نام و نام خانوادگی پزشک الزامی است')
    const finalDate = toEn(String(body.finalDate || '')).trim()
    if (!finalDate || !isValidJalali(finalDate)) throw new HttpError(400, 'تاریخ نظریه نهایی معتبر نیست')

    const finalCondition = orNull(body.finalCondition)
    const finalReason = orNull(body.finalReason)
    if (finalOpinion === 'CONDITIONAL' && !finalCondition) {
      throw new HttpError(400, 'برای نظریه «مشروط» درج شرط یا محدودیت الزامی است')
    }
    if ((finalOpinion === 'UNFIT' || finalOpinion === 'INCOMPLETE') && !finalReason) {
      throw new HttpError(400, 'برای این نظریه درج دلیل الزامی است')
    }

    // گیت صدور نظریه قطعی (برای «ناتمام» لازم نیست)
    if (finalOpinion !== 'INCOMPLETE') {
      const openReferrals = countOpenReferrals(c.sections)
      const chk = checkFinalize(c.sections, finalOpinion, finalDate, openReferrals)
      if (!chk.ok) {
        return Response.json({ error: 'امکان ثبت نظریه قطعی وجود ندارد', blockers: chk.blockers }, { status: 400 })
      }
    }

    const now = new Date()
    await db.case.update({
      where: { id: c.id },
      data: {
        finalOpinion,
        finalText: orNull(body.finalText),
        finalCondition,
        finalReason,
        finalAdvice: orNull(body.finalAdvice),
        finalDoctorName,
        finalDoctorCode: orNull(body.finalDoctorCode),
        finalDate,
        finalSignature: orNull(body.finalSignature),
        workerDeclaration: orNull(body.workerDeclaration),
        workerDeclarationName: orNull(body.workerDeclarationName),
        completedAt: finalOpinion !== 'INCOMPLETE' ? now : null,
      },
    })

    // سکشن ۹ به‌صورت تأییدشده ثبت می‌شود
    const s9Update = {
      status: 'APPROVED',
      approvedByName: finalDoctorName,
      approvedAt: now,
      approvedSignature: orNull(body.finalSignature),
      naReason: null,
      correctionNote: null,
      updatedByName: session.fullName,
    }
    const s9 = c.sections.find((s) => s.key === 'S9')
    if (s9) {
      await db.caseSection.update({ where: { id: s9.id }, data: s9Update })
    } else {
      await db.caseSection.create({ data: { caseId: c.id, key: 'S9', data: '{}', ...s9Update } })
    }

    await db.caseHistory.create({
      data: {
        caseId: c.id,
        userId: session.id,
        userName: session.fullName,
        action: `ثبت نظریه نهایی: ${FINAL_OPINION_LABELS[finalOpinion] || finalOpinion}`,
        sectionKey: 'S9',
      },
    })

    return Response.json({ ok: true, blockers: [] })
  } catch (e) {
    return errorResponse(e)
  }
}
