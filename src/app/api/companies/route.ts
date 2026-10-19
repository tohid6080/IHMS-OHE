import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession, requireRole, errorResponse, HttpError } from '@/lib/auth'

// GET /api/companies — فهرست شرکت‌ها (هر کاربر لاگین)
export async function GET() {
  try {
    await requireSession()
    const companies = await db.company.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        nationalId: true,
        phone: true,
        address: true,
        active: true,
        _count: { select: { cases: true } },
      },
    })
    return NextResponse.json(companies)
  } catch (e) {
    return errorResponse(e)
  }
}

// POST /api/companies — ایجاد شرکت (ADMIN/MANAGER)
export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN', 'MANAGER')
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const name = String(body.name || '').trim()
    if (!name) throw new HttpError(400, 'نام شرکت الزامی است')

    const company = await db.company.create({
      data: {
        name,
        nationalId: body.nationalId ? String(body.nationalId).trim() : null,
        phone: body.phone ? String(body.phone).trim() : null,
        address: body.address ? String(body.address).trim() : null,
        active: body.active === undefined ? true : Boolean(body.active),
      },
      select: {
        id: true, name: true, nationalId: true, phone: true, address: true, active: true,
        _count: { select: { cases: true } },
      },
    })
    return NextResponse.json(company, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
