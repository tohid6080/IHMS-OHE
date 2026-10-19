import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, errorResponse, hashPassword, HttpError } from '@/lib/auth'
import { ROLE_LABELS } from '@/lib/constants'
import type { Role } from '@/lib/types'

// نقش‌های ستادی که MANAGER می‌تواند ویرایش کند (نه ADMIN، نه EMPLOYER/CONTRACTOR/WORKER)
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
  createdAt: true,
  company: { select: { name: true } },
  contractor: { select: { name: true } },
} as const

// PATCH /api/users/[id] — ویرایش کاربر (ADMIN همه؛ MANAGER فقط نقش‌های ستادی)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole('ADMIN', 'MANAGER')
    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

    const target = await db.user.findUnique({ where: { id } })
    if (!target) throw new HttpError(404, 'کاربر یافت نشد')
    if (session.role !== 'ADMIN' && !STAFF_ROLES.includes(target.role as Role)) {
      throw new HttpError(403, 'شما فقط می‌توانید کاربران ستادی (کارشناسان) را ویرایش کنید')
    }

    const data: Record<string, unknown> = {}

    if (body.fullName !== undefined) {
      const fullName = String(body.fullName || '').trim()
      if (!fullName) throw new HttpError(400, 'نام و نام خانوادگی الزامی است')
      data.fullName = fullName
    }
    if (body.role !== undefined) {
      const role = String(body.role) as Role
      if (!ROLE_LABELS[role]) throw new HttpError(400, 'نقش انتخاب‌شده معتبر نیست')
      if (session.role !== 'ADMIN' && !STAFF_ROLES.includes(role)) {
        throw new HttpError(403, 'شما فقط می‌توانید نقش‌های ستادی (کارشناسان) را تعیین کنید')
      }
      data.role = role
    }
    if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() : null
    if (body.active !== undefined) data.active = Boolean(body.active)
    if (body.password !== undefined && String(body.password) !== '') {
      const password = String(body.password)
      if (password.length < 5) throw new HttpError(400, 'رمز عبور باید حداقل ۵ کاراکتر باشد')
      data.password = await hashPassword(password)
    }
    if (body.companyId !== undefined) {
      const companyId = body.companyId ? String(body.companyId) : ''
      if (companyId) {
        const company = await db.company.findUnique({ where: { id: companyId } })
        if (!company) throw new HttpError(400, 'شرکت انتخاب‌شده یافت نشد')
      }
      data.companyId = companyId || null
    }
    if (body.contractorId !== undefined) {
      const contractorId = body.contractorId ? String(body.contractorId) : ''
      if (contractorId) {
        const contractor = await db.contractor.findUnique({ where: { id: contractorId } })
        if (!contractor) throw new HttpError(400, 'پیمانکار انتخاب‌شده یافت نشد')
      }
      data.contractorId = contractorId || null
    }
    if (body.personId !== undefined) {
      const personId = body.personId ? String(body.personId) : ''
      if (personId) {
        const person = await db.person.findUnique({ where: { id: personId } })
        if (!person) throw new HttpError(400, 'شخص انتخاب‌شده یافت نشد')
      }
      data.personId = personId || null
    }

    // جلوگیری از غیرفعال‌کردن آخرین ADMIN فعال
    if (target.role === 'ADMIN' && data.active === false) {
      const otherAdmins = await db.user.count({
        where: { role: 'ADMIN', active: true, id: { not: id } },
      })
      if (otherAdmins === 0) throw new HttpError(400, 'آخرین مدیر سامانه قابل غیرفعال‌سازی نیست')
    }

    const user = await db.user.update({ where: { id }, data: data as never, select: userSelect })
    return NextResponse.json(user)
  } catch (e) {
    return errorResponse(e)
  }
}

// DELETE /api/users/[id] — حذف کاربر (فقط ADMIN)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole('ADMIN')
    const { id } = await params

    const target = await db.user.findUnique({ where: { id } })
    if (!target) throw new HttpError(404, 'کاربر یافت نشد')
    if (target.id === session.id) throw new HttpError(400, 'حذف کاربر خودتان مجاز نیست')

    // جلوگیری از حذف آخرین ADMIN فعال
    if (target.role === 'ADMIN' && target.active) {
      const otherAdmins = await db.user.count({
        where: { role: 'ADMIN', active: true, id: { not: id } },
      })
      if (otherAdmins === 0) throw new HttpError(400, 'آخرین مدیر سامانه قابل حذف نیست')
    }

    await db.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
