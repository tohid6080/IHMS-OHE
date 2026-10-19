import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, errorResponse, HttpError } from '@/lib/auth'

const contractorSelect = {
  id: true,
  name: true,
  companyId: true,
  company: { select: { id: true, name: true } },
  phone: true,
  active: true,
  _count: { select: { cases: true } },
} as const

// PATCH /api/contractors/[id] — ویرایش پیمانکار (ADMIN/MANAGER)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('ADMIN', 'MANAGER')
    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

    const target = await db.contractor.findUnique({ where: { id } })
    if (!target) throw new HttpError(404, 'پیمانکار یافت نشد')

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) {
      const name = String(body.name || '').trim()
      if (!name) throw new HttpError(400, 'نام پیمانکار الزامی است')
      data.name = name
    }
    if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() : null
    if (body.active !== undefined) data.active = Boolean(body.active)
    if (body.companyId !== undefined) {
      const companyId = body.companyId ? String(body.companyId) : ''
      if (companyId) {
        const company = await db.company.findUnique({ where: { id: companyId } })
        if (!company) throw new HttpError(400, 'شرکت انتخاب‌شده یافت نشد')
      }
      data.companyId = companyId || null
    }

    const contractor = await db.contractor.update({
      where: { id },
      data: data as never,
      select: contractorSelect,
    })
    return NextResponse.json(contractor)
  } catch (e) {
    return errorResponse(e)
  }
}

// DELETE /api/contractors/[id] — حذف پیمانکار (ADMIN/MANAGER)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('ADMIN', 'MANAGER')
    const { id } = await params

    const target = await db.contractor.findUnique({
      where: { id },
      include: { _count: { select: { cases: true, projects: true } } },
    })
    if (!target) throw new HttpError(404, 'پیمانکار یافت نشد')
    if (target._count.cases > 0) throw new HttpError(409, 'این پیمانکار دارای پرونده است و قابل حذف نیست')
    if (target._count.projects > 0) throw new HttpError(409, 'این پیمانکار دارای پروژه وابسته است و قابل حذف نیست')

    await db.contractor.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
