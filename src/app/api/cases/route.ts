// ─── API پرونده‌ها: فهرست با فیلتر و محدودسازی نقشی (GET) + پذیرش پرونده جدید (POST) ───
import type { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireSession, requireRole, HttpError, errorResponse } from '@/lib/auth'
import { toEn, isValidJalali } from '@/lib/jalali'
import { computeProgress } from '@/lib/case-utils'
import type { CaseListItem, JobHistoryRow, SectionKey } from '@/lib/types'

const SECTION_KEYS: SectionKey[] = ['S2', 'S3', 'S4', 'S5', 'S6', 'S7A', 'S7B', 'S7C', 'S7D', 'S8', 'S9']
const EXAM_TYPES = ['PRE_EMPLOYMENT', 'PERIODIC', 'SPECIFIC']
const GROUP_TYPES = ['CONTRACTOR', 'DIRECT', 'INDEPENDENT']
// وضعیت‌های باز یک بخش (برای شمارش موارد باز)
const OPEN_SECTION_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'SENT_FOR_REVIEW', 'NEEDS_CORRECTION']

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json()
    return b && typeof b === 'object' && !Array.isArray(b) ? (b as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function orDigits(v: unknown): string | null {
  const s = orNull(v)
  return s === null ? null : toEn(s)
}

function orNull(v: unknown): string | null {
  const s = String(v ?? '').trim()
  return s === '' ? null : s
}

// استخراج فیلدهای اختیاری مدل Person از بدنه درخواست
function optionalPersonFields(b: Record<string, unknown>) {
  let childrenCount: number | null = null
  const ccRaw = orNull(b.childrenCount)
  if (ccRaw !== null) {
    const n = Number(toEn(ccRaw).replace(/\D/g, ''))
    if (!Number.isNaN(n)) childrenCount = Math.trunc(n)
  }
  return {
    fatherName: orNull(b.fatherName),
    gender: orNull(b.gender) || 'MALE',
    birthYear: orDigits(b.birthYear),
    birthDate: orDigits(b.birthDate),
    maritalStatus: orNull(b.maritalStatus),
    childrenCount,
    education: orNull(b.education),
    phone: orDigits(b.phone),
    insuranceNo: orDigits(b.insuranceNo),
    militaryStatus: orNull(b.militaryStatus),
    militaryUnit: orNull(b.militaryUnit),
    militaryExemption: orNull(b.militaryExemption),
    photo: orNull(b.photo),
  }
}

// حذف ردیف‌های کاملاً خالی سوابق شغلی (بخش ۲)
function cleanJobRows(rows: unknown): JobHistoryRow[] {
  if (!Array.isArray(rows)) return []
  const out: JobHistoryRow[] = []
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const position = String(o.position ?? '').trim()
    const duties = String(o.duties ?? '').trim()
    const fromDate = toEn(String(o.fromDate ?? '').trim())
    const toDate = toEn(String(o.toDate ?? '').trim())
    const changeReason = String(o.changeReason ?? '').trim()
    if (!position && !duties && !fromDate && !toDate && !changeReason) continue
    out.push({
      position,
      duties,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      changeReason: changeReason || undefined,
    })
  }
  return out
}

// GET /api/cases — فهرست پرونده‌ها با فیلترها و محدودسازی دسترسی نقشی
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const sp = req.nextUrl.searchParams
    const q = toEn(sp.get('q') || '').trim()
    const examType = (sp.get('examType') || '').trim()
    const companyId = (sp.get('companyId') || '').trim()
    const contractorId = (sp.get('contractorId') || '').trim()
    const projectId = (sp.get('projectId') || '').trim()
    const groupType = (sp.get('groupType') || '').trim()
    const status = (sp.get('status') || 'all').trim()
    const limitNum = Number(sp.get('limit'))
    const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(Math.trunc(limitNum), 500) : 200

    const and: Prisma.CaseWhereInput[] = []
    // محدودسازی دسترسی نقشی
    if (session.role === 'EMPLOYER') and.push({ companyId: session.companyId || '__none__' })
    else if (session.role === 'CONTRACTOR') and.push({ contractorId: session.contractorId || '__none__' })

    if (examType) and.push({ examType })
    if (companyId) and.push({ companyId })
    if (contractorId) and.push({ contractorId })
    if (projectId) and.push({ projectId })
    if (groupType) and.push({ groupType })

    if (status === 'completed') {
      // completed یعنی نظریه نهایی ثبت شده و «ناتمام» نیست (NULL هم رد می‌شود)
      and.push({ NOT: { finalOpinion: { in: ['INCOMPLETE'] } } })
    } else if (status === 'inProgress') {
      and.push({ OR: [{ finalOpinion: null }, { finalOpinion: 'INCOMPLETE' }] })
    }

    if (q) {
      and.push({
        OR: [
          { caseNumber: { contains: q } },
          { person: { firstName: { contains: q } } },
          { person: { lastName: { contains: q } } },
          { person: { nationalId: { contains: q } } },
        ],
      })
    }

    const rows = await db.case.findMany({
      where: and.length > 0 ? { AND: and } : undefined,
      include: {
        person: { select: { id: true, firstName: true, lastName: true, nationalId: true, photo: true } },
        company: { select: { id: true, name: true } },
        contractor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        sections: { select: { key: true, status: true, data: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const items: CaseListItem[] = rows.map((c) => {
      const progress = computeProgress(c.sections, c.finalOpinion)
      let openCount = c.sections.filter((s) => OPEN_SECTION_STATUSES.includes(s.status)).length
      if (!c.finalOpinion || c.finalOpinion === 'INCOMPLETE') openCount += 1
      return {
        id: c.id,
        caseNumber: c.caseNumber,
        examType: c.examType,
        visitDate: c.visitDate,
        workPlace: c.workPlace,
        jobTitle: c.jobTitle,
        groupType: c.groupType,
        finalOpinion: c.finalOpinion,
        completedAt: c.completedAt ? c.completedAt.toISOString() : null,
        person: c.person,
        company: c.company,
        contractor: c.contractor,
        project: c.project,
        progress,
        openCount,
        sections: c.sections.map((s) => ({ key: s.key, status: s.status })),
      }
    })

    return Response.json({ items })
  } catch (e) {
    return errorResponse(e)
  }
}

// POST /api/cases — پذیرش (تشکیل پرونده جدید) فقط ADMIN/MANAGER
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'MANAGER')
    const body = await readJson(req)

    const examType = String(body.examType || '')
    if (!EXAM_TYPES.includes(examType)) throw new HttpError(400, 'نوع معاینه نامعتبر است')
    const groupType = String(body.groupType || '')
    if (!GROUP_TYPES.includes(groupType)) throw new HttpError(400, 'گروه هدف نامعتبر است')
    const visitDate = toEn(String(body.visitDate || '')).trim()
    if (!visitDate || !isValidJalali(visitDate)) throw new HttpError(400, 'تاریخ مراجعه معتبر نیست')
    const workPlace = String(body.workPlace || '').trim()
    const jobTitle = String(body.jobTitle || '').trim()
    if (!workPlace || !jobTitle) throw new HttpError(400, 'محل کار و عنوان شغل الزامی است')

    // ── فرد: personId موجود یا ساخت فرد جدید ──
    let personId = typeof body.personId === 'string' ? body.personId.trim() : ''
    if (!personId) {
      const p = (body.person && typeof body.person === 'object' ? body.person : {}) as Record<string, unknown>
      const firstName = String(p.firstName || '').trim()
      const lastName = String(p.lastName || '').trim()
      if (!firstName || !lastName) throw new HttpError(400, 'اطلاعات فرد (نام و نام خانوادگی) الزامی است')
      const nationalId = toEn(String(p.nationalId || '')).replace(/\D/g, '')
      if (!/^\d{8,12}$/.test(nationalId)) throw new HttpError(400, 'کد ملی باید بین ۸ تا ۱۲ رقم باشد')
      const existing = await db.person.findUnique({ where: { nationalId } })
      if (existing) {
        return Response.json({ error: 'این کد ملی قبلاً ثبت شده است', personId: existing.id }, { status: 409 })
      }
      const createdPerson = await db.person.create({
        data: { nationalId, firstName, lastName, ...optionalPersonFields(p) },
      })
      personId = createdPerson.id
    } else {
      const person = await db.person.findUnique({ where: { id: personId } })
      if (!person) throw new HttpError(400, 'فرد انتخاب‌شده یافت نشد')
    }

    // ── اعتبارسنجی ارجاع‌های شرکت/پیمانکار/پروژه ──
    const companyId = orNull(body.companyId)
    const contractorId = orNull(body.contractorId)
    const projectId = orNull(body.projectId)
    if (companyId && !(await db.company.findUnique({ where: { id: companyId } }))) {
      throw new HttpError(400, 'شرکت انتخاب‌شده یافت نشد')
    }
    if (contractorId && !(await db.contractor.findUnique({ where: { id: contractorId } }))) {
      throw new HttpError(400, 'پیمانکار انتخاب‌شده یافت نشد')
    }
    if (projectId && !(await db.project.findUnique({ where: { id: projectId } }))) {
      throw new HttpError(400, 'پروژه انتخاب‌شده یافت نشد')
    }

    // ── شماره پرونده: سال شمسیِ تاریخ مراجعه + شماره ترتیبی ۴ رقمی (مثل 1405-0005) ──
    const year = visitDate.split('/')[0]
    const prefix = `${year}-`
    let seq = (await db.case.count({ where: { caseNumber: { startsWith: prefix } } })) + 1
    let caseNumber = `${prefix}${String(seq).padStart(4, '0')}`
    // محافظت در برابر تداخل در اثر حذف پرونده‌ها
    while (await db.case.findUnique({ where: { caseNumber } })) {
      seq += 1
      caseNumber = `${prefix}${String(seq).padStart(4, '0')}`
    }

    // ── بخش ۲ (سوابق شغلی): اگر با ردیف‌های پر آمده، از ابتدا «در حال انجام» ثبت می‌شود ──
    const s2raw = body.section2 && typeof body.section2 === 'object' ? (body.section2 as Record<string, unknown>) : null
    const current = s2raw ? cleanJobRows(s2raw.current) : []
    const previous = s2raw ? cleanJobRows(s2raw.previous) : []
    const s2Filled = current.length > 0 || previous.length > 0

    const created = await db.case.create({
      data: {
        caseNumber,
        personId,
        examType,
        visitDate,
        workPlace,
        jobTitle,
        workUnit: orNull(body.workUnit),
        companyId,
        contractorId,
        projectId,
        groupType,
        createdBy: session.id,
        createdByName: session.fullName,
        sections: {
          create: SECTION_KEYS.map((key) =>
            key === 'S2' && s2Filled
              ? {
                  key,
                  status: 'IN_PROGRESS',
                  data: JSON.stringify({ current, previous }),
                  updatedByName: session.fullName,
                }
              : { key, status: 'NOT_STARTED', data: '{}' },
          ),
        },
        history: {
          create: { userId: session.id, userName: session.fullName, action: 'تشکیل پرونده (پذیرش)' },
        },
      },
    })

    return Response.json({ id: created.id, caseNumber: created.caseNumber }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
