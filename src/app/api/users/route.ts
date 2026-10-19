import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, errorResponse, hashPassword, HttpError } from '@/lib/auth'
import { ROLE_LABELS } from '@/lib/constants'
import type { Role } from '@/lib/types'

// نقش‌های ستادی که MANAGER می‌تواند بسازد/ویرایش کند
const STAFF_ROLES: Role[] = ['HSE', 'DOCTOR', 'AUDIOLOGIST', 'OPTOMETRIST', 'LAB']

const userSelect = {
  id: true,
  username: true,
  fullName: true,
  role: true,
  phone: true,
  active: true,
  companyId: true,
  contractorId: true,
  personId: true,
  signatureApproved: true,
  signatureApprovedAt: true,
  createdAt: true,
  company: { select: { name: true } },
  contractor: { select: { name: true } },
} as const

// GET /api/users — فهرست همه کاربران (ADMIN/MANAGER)
export async function GET() {
  try {
    await requireRole('ADMIN', 'MANAGER')
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: userSelect,
    })
    return NextResponse.json(users)
  } catch (e) {
    return errorResponse(e)
  }
}

// POST /api/users — ایجاد کاربر (ADMIN هر نقشی؛ MANAGER فقط نقش‌های ستادی)
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'MANAGER')
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    const fullName = String(body.fullName || '').trim()
    const role = String(body.role || '') as Role

    if (username.length < 3) throw new HttpError(400, 'نام کاربری باید حداقل ۳ کاراکتر باشد')
    if (password.length < 5) throw new HttpError(400, 'رمز عبور باید حداقل ۵ کاراکتر باشد')
    if (!fullName) throw new HttpError(400, 'نام و نام خانوادگی الزامی است')
    if (!ROLE_LABELS[role]) throw new HttpError(400, 'نقش انتخاب‌شده معتبر نیست')
    if (session.role !== 'ADMIN' && !STAFF_ROLES.includes(role)) {
      throw new HttpError(403, 'شما فقط می‌توانید کاربران ستادی (کارشناسان) ایجاد کنید')
    }

    const dup = await db.user.findUnique({ where: { username } })
    if (dup) throw new HttpError(409, 'نام کاربری تکراری است')

    const data: Record<string, unknown> = {
      username,
      password: await hashPassword(password),
      fullName,
      role,
      phone: body.phone ? String(body.phone).trim() : null,
      companyId: null,
      contractorId: null,
      personId: null,
    }

    const companyId = body.companyId ? String(body.companyId) : ''
    if (companyId) {
      const company = await db.company.findUnique({ where: { id: companyId } })
      if (!company) throw new HttpError(400, 'شرکت انتخاب‌شده یافت نشد')
      data.companyId = companyId
    }
    const contractorId = body.contractorId ? String(body.contractorId) : ''
    if (contractorId) {
      const contractor = await db.contractor.findUnique({ where: { id: contractorId } })
      if (!contractor) throw new HttpError(400, 'پیمانکار انتخاب‌شده یافت نشد')
      data.contractorId = contractorId
    }
    const personId = body.personId ? String(body.personId) : ''
    if (personId) {
      const person = await db.person.findUnique({ where: { id: personId } })
      if (!person) throw new HttpError(400, 'شخص انتخاب‌شده یافت نشد')
      data.personId = personId
    }

    const user = await db.user.create({ data: data as never, select: userSelect })
    return NextResponse.json(user, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}

// اطمینان از اعتبار dataURL تصویر (حداکثر ~۲MB پس از base64)
const MAX_IMG_LEN = 2_800_000
function validImageDataUrl(v: unknown): string | null {
  const s = String(v || '')
  if (!s) return null
  if (!/^data:image\/(png|jpe?g|webp);base64,/.test(s)) throw new HttpError(400, 'فرمت تصویر باید PNG یا JPG باشد')
  if (s.length > MAX_IMG_LEN) throw new HttpError(400, 'حجم تصویر بیش از حد مجاز است')
  return s
}
