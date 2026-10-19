import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, errorResponse, HttpError } from '@/lib/auth'

// اطمینان از اعتبار dataURL تصویر (حداکثر ~۲MB پس از base64)
const MAX_IMG_LEN = 2_800_000
function validImageDataUrl(v: unknown): string | null {
  const s = String(v || '')
  if (!s) return null
  if (!/^data:image\/(png|jpe?g|webp);base64,/.test(s)) throw new HttpError(400, 'فرمت تصویر باید PNG یا JPG باشد')
  if (s.length > MAX_IMG_LEN) throw new HttpError(400, 'حجم تصویر بیش از حد مجاز است')
  return s
}

// GET /api/persons/[id] — جزئیات فرد (ADMIN/MANAGER)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('ADMIN', 'MANAGER')
    const { id } = await params
    const person = await db.person.findUnique({ where: { id } })
    if (!person) throw new HttpError(404, 'شخص یافت نشد')
    return NextResponse.json(person)
  } catch (e) {
    return errorResponse(e)
  }
}

// PATCH /api/persons/[id] — ویرایش مشخصات فرد و عکس پرسنلی (ADMIN/MANAGER)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('ADMIN', 'MANAGER')
    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

    const person = await db.person.findUnique({ where: { id } })
    if (!person) throw new HttpError(404, 'شخص یافت نشد')

    const data: Record<string, unknown> = {}
    if (body.firstName !== undefined) {
      const v = String(body.firstName).trim()
      if (!v) throw new HttpError(400, 'نام الزامی است')
      data.firstName = v
    }
    if (body.lastName !== undefined) {
      const v = String(body.lastName).trim()
      if (!v) throw new HttpError(400, 'نام خانوادگی الزامی است')
      data.lastName = v
    }
    for (const k of ['fatherName', 'birthYear', 'birthDate', 'maritalStatus', 'education', 'phone', 'insuranceNo', 'militaryStatus', 'militaryUnit', 'militaryExemption'] as const) {
      if (body[k] !== undefined) data[k] = body[k] ? String(body[k]).trim() : null
    }
    if (body.gender !== undefined) {
      const g = String(body.gender)
      if (!['MALE', 'FEMALE'].includes(g)) throw new HttpError(400, 'جنسیت نامعتبر است')
      data.gender = g
    }
    if (body.childrenCount !== undefined) {
      data.childrenCount = body.childrenCount === null || body.childrenCount === '' ? null : Math.max(0, Math.trunc(Number(body.childrenCount) || 0))
    }
    // عکس پرسنلی: dataURL — ارسال رشته خالی یعنی حذف عکس
    if (body.photo !== undefined) {
      const photo = String(body.photo || '').trim()
      data.photo = photo ? validImageDataUrl(photo) : null
    }

    const updated = await db.person.update({ where: { id }, data: data as never })
    return NextResponse.json(updated)
  } catch (e) {
    return errorResponse(e)
  }
}
