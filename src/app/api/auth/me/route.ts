import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import type { SessionUser } from '@/lib/types'

// GET /api/auth/me — کاربر جاری سشن (هرگز خطا نمی‌دهد)
export async function GET() {
  let user: SessionUser | null = null
  try {
    user = await getSession()
  } catch {
    user = null
  }
  return NextResponse.json({ user })
}
