import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, errorResponse, HttpError } from '@/lib/auth'

const projectSelect = {
  id: true,
  name: true,
  companyId: true,
  company: { select: { id: true, name: true } },
  contractorId: true,
  contractor: { select: { id: true, name: true } },
  active: true,
  _count: { select: { cases: true } },
} as const

// PATCH /api/projects/[id] — ویرایش پروژه (ADMIN/MANAGER)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('ADMIN', 'MANAGER')
    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

    const target = await db.project.findUnique({ where: { id } })
    if (!target) throw new HttpError(404, 'پروژه یافت نشد')

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) {
      const name = String(body.name || '').trim()
      if (!name) throw new HttpError(400, 'نام پروژه الزامی است')
      data.name = name
    }
    if (body.active !== undefined) data.active = Boolean(body.active)
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

    const project = await db.project.update({ where: { id }, data: data as never, select: projectSelect })
    return NextResponse.json(project)
  } catch (e) {
    return errorResponse(e)
  }
}

// DELETE /api/projects/[id] — حذف پروژه (ADMIN/MANAGER)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('ADMIN', 'MANAGER')
    const { id } = await params

    const target = await db.project.findUnique({
      where: { id },
      include: { _count: { select: { cases: true } } },
    })
    if (!target) throw new HttpError(404, 'پروژه یافت نشد')
    if (target._count.cases > 0) throw new HttpError(409, 'این پروژه دارای پرونده است و قابل حذف نیست')

    await db.project.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
