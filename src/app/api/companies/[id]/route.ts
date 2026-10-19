import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, errorResponse, HttpError } from '@/lib/auth'

const companySelect = {
  id: true,
  name: true,
  nationalId: true,
  phone: true,
  address: true,
  active: true,
  _count: { select: { cases: true } },
} as const

// PATCH /api/companies/[id] — ویرایش شرکت (ADMIN/MANAGER)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('ADMIN', 'MANAGER')
    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

    const target = await db.company.findUnique({ where: { id } })
    if (!target) throw new HttpError(404, 'شرکت یافت نشد')

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) {
      const name = String(body.name || '').trim()
      if (!name) throw new HttpError(400, 'نام شرکت الزامی است')
      data.name = name
    }
    if (body.nationalId !== undefined) data.nationalId = body.nationalId ? String(body.nationalId).trim() : null
    if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() : null
    if (body.address !== undefined) data.address = body.address ? String(body.address).trim() : null
    if (body.active !== undefined) data.active = Boolean(body.active)

    const company = await db.company.update({ where: { id }, data: data as never, select: companySelect })
    return NextResponse.json(company)
  } catch (e) {
    return errorResponse(e)
  }
}

// DELETE /api/companies/[id] — حذف شرکت (ADMIN/MANAGER)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('ADMIN', 'MANAGER')
    const { id } = await params

    const target = await db.company.findUnique({
      where: { id },
      include: { _count: { select: { cases: true, contractors: true, projects: true } } },
    })
    if (!target) throw new HttpError(404, 'شرکت یافت نشد')
    if (target._count.cases > 0) throw new HttpError(409, 'این شرکت دارای پرونده است و قابل حذف نیست')
    if (target._count.contractors > 0 || target._count.projects > 0) {
      throw new HttpError(409, 'این شرکت دارای پیمانکار یا پروژه وابسته است و قابل حذف نیست')
    }

    await db.company.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
