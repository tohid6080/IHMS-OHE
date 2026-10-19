import { NextResponse } from 'next/server'
import { SESSION_COOKIE, errorResponse } from '@/lib/auth'

// POST /api/auth/logout — خروج و حذف کوکی سشن
export async function POST() {
  try {
    const res = NextResponse.json({ ok: true })
    res.cookies.set(SESSION_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    return res
  } catch (e) {
    return errorResponse(e)
  }
}
