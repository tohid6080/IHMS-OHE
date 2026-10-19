import { readFile } from 'fs/promises'
import { resolve, isAbsolute } from 'path'
import { db } from '@/lib/db'
import { requireRole, errorResponse, HttpError } from '@/lib/auth'

// GET /api/backup — دانلود فایل دیتابیس (فقط ADMIN)
export async function GET() {
  try {
    await requireRole('ADMIN')

    const url = process.env.DATABASE_URL || ''
    let dbPath = url.replace(/^file:/, '').trim()
    if (!dbPath) throw new HttpError(500, 'مسیر دیتابیس تنظیم نشده است')
    // مسیر نسبی مثل file:../db/custom.db نسبت به پوشه prisma (مطابق رفتار Prisma) حل می‌شود
    if (!isAbsolute(dbPath)) dbPath = resolve(process.cwd(), 'prisma', dbPath)

    const [buf, cases, users] = await Promise.all([readFile(dbPath), db.case.count(), db.user.count()])

    const info = JSON.stringify({ exportedAt: new Date().toISOString(), cases, users })
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="backup-${Date.now()}.db"`,
        'X-Backup-Info': info,
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
