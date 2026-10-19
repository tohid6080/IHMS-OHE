import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSessionToken, SESSION_COOKIE, errorResponse, HttpError } from '@/lib/auth'
import type { SessionUser } from '@/lib/types'

// POST /api/auth/login — ورود با نام کاربری و رمز عبور
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string }
    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    if (!username || !password) throw new HttpError(400, 'نام کاربری و رمز عبور الزامی است')

    const user = await db.user.findUnique({ where: { username } })
    if (!user || !user.active) throw new HttpError(401, 'نام کاربری یا رمز عبور اشتباه است')

    const ok = await verifyPassword(password, user.password)
    if (!ok) throw new HttpError(401, 'نام کاربری یا رمز عبور اشتباه است')

    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as SessionUser['role'],
      companyId: user.companyId,
      contractorId: user.contractorId,
      personId: user.personId,
    }
    const token = await createSessionToken(sessionUser)
    const res = NextResponse.json({ user: sessionUser })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (e) {
    return errorResponse(e)
  }
}
