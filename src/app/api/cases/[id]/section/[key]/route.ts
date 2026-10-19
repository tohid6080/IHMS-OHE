// ─── API گردش کار بخش‌های پرونده: save / submit / approve / reject / na / reopen ───
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireSession, HttpError, errorResponse } from '@/lib/auth'
import { canApproveSection, canEditSection, sectionTitle } from '@/lib/case-utils'
import { SECTION_DEFS } from '@/lib/constants'
import type { Role, SectionDTO, SectionKey, SectionStatus, SessionUser } from '@/lib/types'

const CENTRAL_ROLES: Role[] = ['ADMIN', 'MANAGER', 'DOCTOR', 'HSE', 'AUDIOLOGIST', 'OPTOMETRIST', 'LAB']
// نقش‌های بیرونی: فقط مشاهده، هیچ تغییری مجاز نیست
const NO_ACCESS_ROLES: Role[] = ['EMPLOYER', 'CONTRACTOR']
const EDITABLE_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'NEEDS_CORRECTION']
const FINAL_STATUSES = ['APPROVED', 'NOT_APPLICABLE']
const ACTIONS = ['save', 'submit', 'approve', 'reject', 'na', 'reopen']

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json()
    return b && typeof b === 'object' && !Array.isArray(b) ? (b as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

// بررسی دسترسی مشاهده پرونده (در نبود دسترسی، ۴۰۴)
function assertCanView(
  session: SessionUser,
  c: { companyId: string | null; contractorId: string | null; personId: string },
) {
  const role = session.role
  const ok =
    CENTRAL_ROLES.includes(role) ||
    (role === 'EMPLOYER' && !!c.companyId && c.companyId === session.companyId) ||
    (role === 'CONTRACTOR' && !!c.contractorId && c.contractorId === session.contractorId)
  if (!ok) throw new HttpError(404, 'پرونده یافت نشد')
}

// JSON.parse داده سکشن با محافظت (خراب → {})
function parseSectionData(data: string | null | undefined): Record<string, unknown> {
  try {
    const d = JSON.parse(data || '{}')
    return d && typeof d === 'object' && !Array.isArray(d) ? (d as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

// POST /api/cases/[id]/section/[key]
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; key: string }> }) {
  try {
    const session = await requireSession()
    const { id, key } = await params
    const def = SECTION_DEFS.find((d) => d.key === key)
    if (!def) throw new HttpError(400, 'بخش نامعتبر است')
    const sectionKey = def.key

    // دسترسی مشاهده پرونده
    const c = await db.case.findUnique({
      where: { id },
      select: { id: true, companyId: true, contractorId: true, personId: true, sections: true },
    })
    if (!c) throw new HttpError(404, 'پرونده یافت نشد')
    assertCanView(session, c)
    // نقش‌های کارفرما/پیمانکار/مراجعه‌کننده حق تغییری ندارند
    if (NO_ACCESS_ROLES.includes(session.role)) throw new HttpError(403, 'دسترسی ندارید')

    const body = await readJson(req)
    const action = String(body.action || '')
    if (!ACTIONS.includes(action)) throw new HttpError(400, 'عملیات نامعتبر است')

    const section = c.sections.find((s) => s.key === sectionKey)
    const currentStatus = section?.status || 'NOT_STARTED'
    const now = new Date()
    const note = String(body.note || '').trim()

    const update: {
      data?: string
      submittedAt?: Date | null
      approvedByName?: string | null
      approvedAt?: Date | null
      approvedSignature?: string | null
      approvedStamp?: string | null
      naReason?: string | null
      correctionNote?: string | null
    } = {}
    let newStatus: SectionStatus
    let historyAction: string
    let historyDetail: string | null = null

    if (action === 'save' || action === 'submit') {
      if (!canEditSection(session.role, sectionKey)) throw new HttpError(403, 'شما اجازه ثبت اطلاعات این بخش را ندارید')
      if (!EDITABLE_STATUSES.includes(currentStatus)) throw new HttpError(400, 'در وضعیت فعلی قابل ویرایش نیست')
      if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
        throw new HttpError(400, 'داده بخش ارسال نشده است')
      }
      update.data = JSON.stringify(body.data)
      newStatus = action === 'save' ? 'IN_PROGRESS' : 'SENT_FOR_REVIEW'
      if (action === 'submit') update.submittedAt = now
      historyAction =
        action === 'save'
          ? `ثبت اطلاعات ${sectionTitle(sectionKey)}`
          : `ارسال ${sectionTitle(sectionKey)} برای بررسی`
    } else if (action === 'approve') {
      // نظریه نهایی (S9) فقط از مسیر /final ثبت می‌شود
      if (sectionKey === 'S9') throw new HttpError(400, 'نظریه نهایی را از فرم نظریه نهایی ثبت کنید')
      if (!canApproveSection(session.role, sectionKey)) throw new HttpError(403, 'شما اجازه تأیید این بخش را ندارید')
      if (currentStatus === 'APPROVED') {
        throw new HttpError(400, 'این بخش قبلاً تأیید شده است؛ برای تغییر ابتدا آن را بازگشایی کنید')
      }
      if (currentStatus === 'NOT_APPLICABLE') {
        throw new HttpError(400, 'این بخش نامرتبط اعلام شده است؛ برای تغییر ابتدا آن را بازگشایی کنید')
      }
      // اگر داده همراه تأیید آمده باشد ذخیره می‌شود
      if (body.data !== undefined && body.data !== null) {
        if (typeof body.data !== 'object' || Array.isArray(body.data)) throw new HttpError(400, 'داده بخش نامعتبر است')
        update.data = JSON.stringify(body.data)
      }
      newStatus = 'APPROVED'
      update.approvedByName = String(body.name || '').trim() || session.fullName
      update.approvedAt = now
      update.approvedSignature = String(body.signature || '').trim() || null
      update.approvedStamp = String(body.stamp || '').trim() || null
      update.naReason = null
      update.correctionNote = null
      historyAction = `تأیید و درج امضا و مهر ${sectionTitle(sectionKey)}`
    } else if (action === 'reject') {
      if (!canApproveSection(session.role, sectionKey)) throw new HttpError(403, 'شما اجازه بررسی این بخش را ندارید')
      if (!note) throw new HttpError(400, 'دلیل نیاز به اصلاح الزامی است')
      newStatus = 'NEEDS_CORRECTION'
      update.correctionNote = note
      historyAction = `نیازمند اصلاح ${sectionTitle(sectionKey)}`
      historyDetail = note
    } else if (action === 'na') {
      if (!canApproveSection(session.role, sectionKey)) throw new HttpError(403, 'شما اجازه بررسی این بخش را ندارید')
      if (!note) throw new HttpError(400, 'دلیل نامرتبط اعلام کردن بخش الزامی است')
      newStatus = 'NOT_APPLICABLE'
      update.naReason = note
      update.approvedByName = String(body.name || '').trim() || session.fullName
      update.approvedAt = now
      update.approvedSignature = String(body.signature || '').trim() || null
      update.approvedStamp = String(body.stamp || '').trim() || null
      historyAction = `نامرتبط اعلام شدن ${sectionTitle(sectionKey)}`
      historyDetail = note
    } else {
      // reopen — فقط ADMIN/MANAGER و از وضعیت تأییدشده/نامرتبط
      if (!['ADMIN', 'MANAGER'].includes(session.role)) throw new HttpError(403, 'دسترسی ندارید')
      if (!FINAL_STATUSES.includes(currentStatus)) {
        throw new HttpError(400, 'فقط بخش تأییدشده یا نامرتبط قابل بازگشایی است')
      }
      newStatus = 'IN_PROGRESS'
      update.naReason = null
      update.correctionNote = null
      update.approvedByName = null
      update.approvedAt = null
      update.approvedSignature = null
      historyAction = `بازگشایی ${sectionTitle(sectionKey)}`
      if (note) historyDetail = note
    }

    // سکشن موجود را به‌روزرسانی کن؛ در نبودش بساز
    const saved = section
      ? await db.caseSection.update({
          where: { id: section.id },
          data: { ...update, status: newStatus, updatedByName: session.fullName },
        })
      : await db.caseSection.create({
          data: {
            caseId: c.id,
            key: sectionKey,
            status: newStatus,
            data: update.data ?? '{}',
            updatedByName: session.fullName,
            submittedAt: update.submittedAt ?? null,
            approvedByName: update.approvedByName ?? null,
            approvedAt: update.approvedAt ?? null,
            approvedSignature: update.approvedSignature ?? null,
            naReason: update.naReason ?? null,
            correctionNote: update.correctionNote ?? null,
          },
        })

    await db.caseHistory.create({
      data: {
        caseId: c.id,
        userId: session.id,
        userName: session.fullName,
        action: historyAction,
        sectionKey,
        detail: historyDetail,
      },
    })

    const sectionDto: SectionDTO = {
      id: saved.id,
      caseId: saved.caseId,
      key: saved.key as SectionKey,
      status: saved.status as SectionStatus,
      data: parseSectionData(saved.data),
      updatedByName: saved.updatedByName,
      submittedAt: saved.submittedAt ? saved.submittedAt.toISOString() : null,
      approvedByName: saved.approvedByName,
      approvedAt: saved.approvedAt ? saved.approvedAt.toISOString() : null,
      approvedSignature: saved.approvedSignature,
      approvedStamp: saved.approvedStamp,
      naReason: saved.naReason,
      correctionNote: saved.correctionNote,
      updatedAt: saved.updatedAt.toISOString(),
    }
    return Response.json({ ok: true, section: sectionDto })
  } catch (e) {
    return errorResponse(e)
  }
}
