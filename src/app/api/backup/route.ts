import { db } from '@/lib/db'
import { requireRole, errorResponse } from '@/lib/auth'

// GET /api/backup — دانلود نسخه JSON از تمام داده‌ها (فقط ADMIN)
// پشتیبان‌گیری خودکار دیتابیس را خود Supabase انجام می‌دهد؛ این خروجی نسخه دستی است.
export async function GET() {
  try {
    await requireRole('ADMIN')

    const [companies, contractors, projects, persons, users, cases, caseSections, caseHistory] = await Promise.all([
      db.company.findMany(),
      db.contractor.findMany(),
      db.project.findMany(),
      db.person.findMany(),
      db.user.findMany({ omit: { password: true } }),
      db.case.findMany(),
      db.caseSection.findMany(),
      db.caseHistory.findMany(),
    ])

    const body = JSON.stringify(
      { exportedAt: new Date().toISOString(), companies, contractors, projects, persons, users, cases, caseSections, caseHistory },
      null,
      2,
    )
    return new Response(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="backup-${Date.now()}.json"`,
        'X-Backup-Info': JSON.stringify({ cases: cases.length, users: users.length }),
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
