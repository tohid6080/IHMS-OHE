// ─── API جزئیات پرونده: مشاهده کامل (GET) / ویرایش پذیرش (PATCH) / حذف (DELETE) ───
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireSession, requireRole, HttpError, errorResponse } from '@/lib/auth'
import { toEn, isValidJalali } from '@/lib/jalali'
import {
  canSeeMedicalDetail,
  checkFinalize,
  computeOpenItems,
  computeProgress,
  redactSectionIfNeeded,
} from '@/lib/case-utils'
import { SECTION_DEFS } from '@/lib/constants'
import type { Role, SectionDTO, SectionKey, SectionStatus, SessionUser } from '@/lib/types'

const CENTRAL_ROLES: Role[] = ['ADMIN', 'MANAGER', 'DOCTOR', 'HSE', 'AUDIOLOGIST', 'OPTOMETRIST', 'LAB']
const EXAM_TYPES = ['PRE_EMPLOYMENT', 'PERIODIC', 'SPECIFIC']
const GROUP_TYPES = ['CONTRACTOR', 'DIRECT', 'INDEPENDENT']

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

function orDigits(v: unknown): string | null {
  const s = orNull(v)
  return s === null ? null : toEn(s)
}

// بارگذاری پرونده با بررسی دسترسی نقشی (در نبود دسترسی، ۴۰۴ — افشای وجود پرونده ندارد)
async function loadScopedCase(session: SessionUser, id: string) {
  const c = await db.case.findUnique({
    where: { id },
    include: {
      person: {
        select: {
          id: true, nationalId: true, firstName: true, lastName: true, fatherName: true, gender: true,
          birthYear: true, birthDate: true, maritalStatus: true, childrenCount: true, education: true,
          phone: true, insuranceNo: true, militaryStatus: true, militaryUnit: true, militaryExemption: true,
          photo: true,
        },
      },
      company: { select: { id: true, name: true } },
      contractor: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      sections: true,
      history: { orderBy: { createdAt: 'desc' }, take: 100 },
    },
  })
  if (!c) throw new HttpError(404, 'پرونده یافت نشد')
  const role = session.role
  const allowed =
    CENTRAL_ROLES.includes(role) ||
    (role === 'EMPLOYER' && !!c.companyId && c.companyId === session.companyId) ||
    (role === 'CONTRACTOR' && !!c.contractorId && c.contractorId === session.contractorId)
  if (!allowed) throw new HttpError(404, 'پرونده یافت نشد')
  return c
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

function toSectionDTO(s: {
  id: string
  caseId: string
  key: string
  status: string
  data: string
  updatedByName: string | null
  submittedAt: Date | null
  approvedByName: string | null
  approvedAt: Date | null
  approvedSignature: string | null
  approvedStamp: string | null
  naReason: string | null
  correctionNote: string | null
  updatedAt: Date
}): SectionDTO {
  return {
    id: s.id,
    caseId: s.caseId,
    key: s.key as SectionKey,
    status: s.status as SectionStatus,
    data: parseSectionData(s.data),
    updatedByName: s.updatedByName,
    submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null,
    approvedByName: s.approvedByName,
    approvedAt: s.approvedAt ? s.approvedAt.toISOString() : null,
    approvedSignature: s.approvedSignature,
    approvedStamp: s.approvedStamp,
    naReason: s.naReason,
    correctionNote: s.correctionNote,
    updatedAt: s.updatedAt.toISOString(),
  }
}

// GET /api/cases/[id] — خروجی CaseDetailDTO
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const c = await loadScopedCase(session, id)
    const restricted = !canSeeMedicalDetail(session.role)
    const openReferrals = countOpenReferrals(c.sections)

    // سکشن‌ها به ترتیب S2..S9؛ برای نقش‌های محدودشده داده بخش‌های پزشکی تفصیلی مخفی می‌شود
    const sections: SectionDTO[] = SECTION_DEFS.map((def) => {
      const s = c.sections.find((x) => x.key === def.key)
      let dto: SectionDTO = s
        ? toSectionDTO(s)
        : {
            id: '',
            caseId: c.id,
            key: def.key,
            status: 'NOT_STARTED',
            data: {},
            updatedByName: null,
            submittedAt: null,
            approvedByName: null,
            approvedAt: null,
            approvedSignature: null,
            approvedStamp: null,
            naReason: null,
            correctionNote: null,
            updatedAt: c.updatedAt.toISOString(),
          }
      if (restricted) dto = redactSectionIfNeeded(session.role, def.key, dto) ?? dto
      return dto
    })

    const history = c.history.map((h) => ({
      id: h.id,
      userName: h.userName,
      action: h.action,
      sectionKey: h.sectionKey,
      detail: h.detail,
      createdAt: h.createdAt.toISOString(),
    }))

    return Response.json({
      case: {
        id: c.id,
        caseNumber: c.caseNumber,
        examType: c.examType,
        visitDate: c.visitDate,
        workPlace: c.workPlace,
        jobTitle: c.jobTitle,
        workUnit: c.workUnit,
        groupType: c.groupType,
        finalOpinion: c.finalOpinion,
        finalText: c.finalText,
        finalCondition: c.finalCondition,
        finalReason: c.finalReason,
        finalAdvice: c.finalAdvice,
        finalDoctorName: c.finalDoctorName,
        finalDoctorCode: c.finalDoctorCode,
        finalDate: c.finalDate,
        finalSignature: c.finalSignature,
        finalStamp: c.finalStamp,
        workerDeclaration: c.workerDeclaration,
        workerDeclarationName: c.workerDeclarationName,
        completedAt: c.completedAt ? c.completedAt.toISOString() : null,
        createdByName: c.createdByName,
        createdAt: c.createdAt.toISOString(),
        person: c.person,
        company: c.company,
        contractor: c.contractor,
        project: c.project,
      },
      sections,
      history,
      openItems: computeOpenItems(c.sections, c.finalOpinion, openReferrals),
      canFinalize: checkFinalize(c.sections, c.finalOpinion, c.finalDate, openReferrals),
      progress: computeProgress(c.sections, c.finalOpinion),
      restricted,
    })
  } catch (e) {
    return errorResponse(e)
  }
}

// PATCH /api/cases/[id] — ویرایش اطلاعات پذیرش (فقط ADMIN/MANAGER)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole('ADMIN', 'MANAGER')
    const { id } = await params
    const c = await loadScopedCase(session, id)
    const body = await readJson(req)

    // ── ویرایش فرد متصل به پرونده ──
    if (body.person && typeof body.person === 'object' && !Array.isArray(body.person)) {
      const p = body.person as Record<string, unknown>
      const has = (k: string) => p[k] !== undefined
      const personData: {
        nationalId?: string
        firstName?: string
        lastName?: string
        fatherName?: string | null
        gender?: string
        birthYear?: string | null
        birthDate?: string | null
        maritalStatus?: string | null
        childrenCount?: number | null
        education?: string | null
        phone?: string | null
        insuranceNo?: string | null
        militaryStatus?: string | null
        militaryUnit?: string | null
        militaryExemption?: string | null
        photo?: string | null
      } = {}

      if (has('nationalId')) {
        const nid = toEn(String(p.nationalId || '')).replace(/\D/g, '')
        if (!/^\d{8,12}$/.test(nid)) throw new HttpError(400, 'کد ملی باید بین ۸ تا ۱۲ رقم باشد')
        if (nid !== c.person.nationalId) {
          const dup = await db.person.findUnique({ where: { nationalId: nid } })
          if (dup && dup.id !== c.personId) {
            return Response.json({ error: 'این کد ملی قبلاً ثبت شده است', personId: dup.id }, { status: 409 })
          }
          personData.nationalId = nid
        }
      }
      if (has('firstName')) {
        const v = String(p.firstName || '').trim()
        if (!v) throw new HttpError(400, 'نام الزامی است')
        personData.firstName = v
      }
      if (has('lastName')) {
        const v = String(p.lastName || '').trim()
        if (!v) throw new HttpError(400, 'نام خانوادگی الزامی است')
        personData.lastName = v
      }
      if (has('fatherName')) personData.fatherName = orNull(p.fatherName)
      if (has('gender')) personData.gender = orNull(p.gender) || 'MALE'
      if (has('birthYear')) personData.birthYear = orDigits(p.birthYear)
      if (has('birthDate')) personData.birthDate = orDigits(p.birthDate)
      if (has('maritalStatus')) personData.maritalStatus = orNull(p.maritalStatus)
      if (has('childrenCount')) {
        const s = orNull(p.childrenCount)
        if (s === null) personData.childrenCount = null
        else {
          const n = Number(toEn(s).replace(/\D/g, ''))
          personData.childrenCount = Number.isNaN(n) ? null : Math.trunc(n)
        }
      }
      if (has('education')) personData.education = orNull(p.education)
      if (has('phone')) personData.phone = orDigits(p.phone)
      if (has('insuranceNo')) personData.insuranceNo = orDigits(p.insuranceNo)
      if (has('militaryStatus')) personData.militaryStatus = orNull(p.militaryStatus)
      if (has('militaryUnit')) personData.militaryUnit = orNull(p.militaryUnit)
      if (has('militaryExemption')) personData.militaryExemption = orNull(p.militaryExemption)
      if (has('photo')) personData.photo = orNull(p.photo)

      if (Object.keys(personData).length > 0) {
        await db.person.update({ where: { id: c.personId }, data: personData })
      }
    }

    // ── ویرایش فیلدهای پذیرش پرونده ──
    const caseData: {
      examType?: string
      visitDate?: string
      workPlace?: string
      jobTitle?: string
      workUnit?: string | null
      companyId?: string | null
      contractorId?: string | null
      projectId?: string | null
      groupType?: string
    } = {}

    if (body.examType !== undefined) {
      const v = String(body.examType)
      if (!EXAM_TYPES.includes(v)) throw new HttpError(400, 'نوع معاینه نامعتبر است')
      caseData.examType = v
    }
    if (body.visitDate !== undefined) {
      const v = toEn(String(body.visitDate || '')).trim()
      if (!v || !isValidJalali(v)) throw new HttpError(400, 'تاریخ مراجعه معتبر نیست')
      caseData.visitDate = v
    }
    if (body.workPlace !== undefined) {
      const v = String(body.workPlace || '').trim()
      if (!v) throw new HttpError(400, 'محل کار الزامی است')
      caseData.workPlace = v
    }
    if (body.jobTitle !== undefined) {
      const v = String(body.jobTitle || '').trim()
      if (!v) throw new HttpError(400, 'عنوان شغل الزامی است')
      caseData.jobTitle = v
    }
    if (body.workUnit !== undefined) caseData.workUnit = orNull(body.workUnit)
    if (body.companyId !== undefined) caseData.companyId = orNull(body.companyId)
    if (body.contractorId !== undefined) caseData.contractorId = orNull(body.contractorId)
    if (body.projectId !== undefined) caseData.projectId = orNull(body.projectId)
    if (body.groupType !== undefined) {
      const v = String(body.groupType)
      if (!GROUP_TYPES.includes(v)) throw new HttpError(400, 'گروه هدف نامعتبر است')
      caseData.groupType = v
    }

    if (caseData.companyId && !(await db.company.findUnique({ where: { id: caseData.companyId } }))) {
      throw new HttpError(400, 'شرکت انتخاب‌شده یافت نشد')
    }
    if (caseData.contractorId && !(await db.contractor.findUnique({ where: { id: caseData.contractorId } }))) {
      throw new HttpError(400, 'پیمانکار انتخاب‌شده یافت نشد')
    }
    if (caseData.projectId && !(await db.project.findUnique({ where: { id: caseData.projectId } }))) {
      throw new HttpError(400, 'پروژه انتخاب‌شده یافت نشد')
    }

    if (Object.keys(caseData).length > 0) {
      await db.case.update({ where: { id: c.id }, data: caseData })
    }

    await db.caseHistory.create({
      data: { caseId: c.id, userId: session.id, userName: session.fullName, action: 'ویرایش اطلاعات پذیرش' },
    })

    return Response.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}

// DELETE /api/cases/[id] — حذف کامل پرونده (فقط ADMIN؛ سکشن‌ها و تاریخچه cascade حذف می‌شوند)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole('ADMIN')
    const { id } = await params
    const c = await loadScopedCase(session, id)
    await db.case.delete({ where: { id: c.id } })
    return Response.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
