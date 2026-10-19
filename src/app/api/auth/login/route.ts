import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSessionToken, SESSION_COOKIE, COOKIE_SECURE, errorResponse, HttpError } from '@/lib/auth'
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

    // توکن JWT باید حداقلی بماند — امضا/مهر (تا صدها KB) هرگز داخل کوکی نمی‌رود
    const tokenUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as SessionUser['role'],
      companyId: user.companyId,
      contractorId: user.contractorId,
      personId: user.personId,
    }
    const token = await createSessionToken(tokenUser as SessionUser)
    // پاسخ ورود: همان کاربر + داده‌های تازهٔ امضا/مهر (فقط در بدنه پاسخ، نه کوکی)
    const resUser: SessionUser = {
      ...tokenUser,
      signatureData: user.signatureData,
      stampData: user.stampData,
      signatureApproved: user.signatureApproved,
    }
    const res = NextResponse.json({ user: resUser })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: COOKIE_SECURE,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (e) {
    return errorResponse(e)
  }
}
