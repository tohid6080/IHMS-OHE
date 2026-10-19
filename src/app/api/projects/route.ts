import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession, requireRole, errorResponse, HttpError } from '@/lib/auth'

// GET /api/projects — فهرست پروژه‌ها (هر کاربر لاگین)
export async function GET() {
  try {
    await requireSession()
    const projects = await db.project.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        companyId: true,
        company: { select: { id: true, name: true } },
        contractorId: true,
        contractor: { select: { id: true, name: true } },
        active: true,
        _count: { select: { cases: true } },
      },
    })
    return NextResponse.json(projects)
  } catch (e) {
    return errorResponse(e)
  }
}

// POST /api/projects — ایجاد پروژه (ADMIN/MANAGER)
export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN', 'MANAGER')
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const name = String(body.name || '').trim()
    if (!name) throw new HttpError(400, 'نام پروژه الزامی است')

    const data: Record<string, unknown> = {
      name,
      active: body.active === undefined ? true : Boolean(body.active),
      companyId: null,
      contractorId: null,
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

    const project = await db.project.create({
      data: data as never,
      select: {
        id: true, name: true, companyId: true, company: { select: { id: true, name: true } },
        contractorId: true, contractor: { select: { id: true, name: true } },
        active: true, _count: { select: { cases: true } },
      },
    })
    return NextResponse.json(project, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
