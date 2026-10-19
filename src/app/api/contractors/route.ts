import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession, requireRole, errorResponse, HttpError } from '@/lib/auth'

// GET /api/contractors — فهرست پیمانکاران (هر کاربر لاگین)
export async function GET() {
  try {
    await requireSession()
    const contractors = await db.contractor.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        companyId: true,
        company: { select: { id: true, name: true } },
        phone: true,
        active: true,
        _count: { select: { cases: true } },
      },
    })
    return NextResponse.json(contractors)
  } catch (e) {
    return errorResponse(e)
  }
}

// POST /api/contractors — ایجاد پیمانکار (ADMIN/MANAGER)
export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN', 'MANAGER')
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const name = String(body.name || '').trim()
    if (!name) throw new HttpError(400, 'نام پیمانکار الزامی است')

    const data: Record<string, unknown> = {
      name,
      phone: body.phone ? String(body.phone).trim() : null,
      active: body.active === undefined ? true : Boolean(body.active),
      companyId: null,
    }
    const companyId = body.companyId ? String(body.companyId) : ''
    if (companyId) {
      const company = await db.company.findUnique({ where: { id: companyId } })
      if (!company) throw new HttpError(400, 'شرکت انتخاب‌شده یافت نشد')
      data.companyId = companyId
    }

    const contractor = await db.contractor.create({
      data: data as never,
      select: {
        id: true, name: true, companyId: true, company: { select: { id: true, name: true } },
        phone: true, active: true, _count: { select: { cases: true } },
      },
    })
    return NextResponse.json(contractor, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
