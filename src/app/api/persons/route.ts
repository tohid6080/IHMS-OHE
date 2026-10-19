// ─── API اشخاص: جست‌وجو (GET) و ثبت فرد جدید (POST) ───
import type { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireSession, requireRole, HttpError, errorResponse } from '@/lib/auth'
import { toEn } from '@/lib/jalali'
import type { Role } from '@/lib/types'

// نقش‌های مرکزی سامانه که به فهرست اشخاص دسترسی دارند
const CENTRAL_ROLES: Role[] = ['ADMIN', 'MANAGER', 'DOCTOR', 'HSE', 'AUDIOLOGIST', 'OPTOMETRIST', 'LAB']

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

// فیلدهای عددی/تاریخی که ارقام فارسی‌شان تبدیل شود
function orDigits(v: unknown): string | null {
  const s = orNull(v)
  return s === null ? null : toEn(s)
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

// GET /api/persons?q=... — جست‌وجوی فرد بر اساس کد ملی، نام یا نام خانوادگی (حداقل ۲ کاراکتر)
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    if (!CENTRAL_ROLES.includes(session.role)) throw new HttpError(403, 'شما به این بخش دسترسی ندارید')

    const q = toEn(req.nextUrl.searchParams.get('q') || '').trim()
    if (q.length < 2) return Response.json({ items: [] })

    const parts = q.split(/\s+/).filter(Boolean)
    const or: Prisma.PersonWhereInput[] = [
      { nationalId: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
    ]
    // جست‌وجوی «نام و نام خانوادگی» با هم (هر دو ترتیب)
    if (parts.length > 1) {
      or.push({ AND: [{ firstName: { contains: parts[0] } }, { lastName: { contains: parts[1] } }] })
      or.push({ AND: [{ firstName: { contains: parts[1] } }, { lastName: { contains: parts[0] } }] })
    }

    const rows = await db.person.findMany({
      where: { OR: or },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { cases: true } } },
    })

    return Response.json({
      items: rows.map(({ _count, ...p }) => ({ ...p, casesCount: _count.cases })),
    })
  } catch (e) {
    return errorResponse(e)
  }
}

// POST /api/persons — ثبت فرد جدید (فقط ADMIN/MANAGER)
export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN', 'MANAGER')
    const body = await readJson(req)

    const firstName = String(body.firstName || '').trim()
    const lastName = String(body.lastName || '').trim()
    if (!firstName || !lastName) throw new HttpError(400, 'نام و نام خانوادگی الزامی است')

    const nationalId = toEn(String(body.nationalId || '')).replace(/\D/g, '')
    if (!/^\d{8,12}$/.test(nationalId)) throw new HttpError(400, 'کد ملی باید بین ۸ تا ۱۲ رقم باشد')

    const existing = await db.person.findUnique({ where: { nationalId } })
    if (existing) {
      return Response.json({ error: 'این کد ملی قبلاً ثبت شده است', personId: existing.id }, { status: 409 })
    }

    const person = await db.person.create({
      data: { nationalId, firstName, lastName, ...optionalPersonFields(body) },
    })
    return Response.json({ person }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
