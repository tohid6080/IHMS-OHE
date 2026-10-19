import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import type { SessionUser } from '@/lib/types'

// GET /api/auth/me — کاربر جاری سشن (هرگز خطا نمی‌دهد)
// داده‌های امضا/مهر همیشه تازه از دیتابیس خوانده می‌شود (چون در توکن قدیمی نیست)
export async function GET() {
  let user: SessionUser | null = null
  try {
    user = await getSession()
    if (user) {
      const fresh = await db.user.findUnique({
        where: { id: user.id },
        select: { signatureData: true, stampData: true, signatureApproved: true, active: true },
      })
      if (!fresh || !fresh.active) {
        user = null
      } else {
        user.signatureData = fresh.signatureData
        user.stampData = fresh.stampData
        user.signatureApproved = fresh.signatureApproved
      }
    }
  } catch {
    user = null
  }
  return NextResponse.json({ user })
}
