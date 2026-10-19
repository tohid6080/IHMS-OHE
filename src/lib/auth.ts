import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import type { Role, SessionUser } from './types'

// کلید امضای نشست: در محیط production تنظیم AUTH_SECRET الزامی است (کلید پیش‌فرض عمومی نیست)
let cachedSecret: Uint8Array | null = null
function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret
  const value = process.env.AUTH_SECRET
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET باید در محیط production تنظیم شود')
  }
  cachedSecret = new TextEncoder().encode(value || 'ihms-ohe-dev-only-secret')
  return cachedSecret
}
// کوکی فقط روی HTTPS ارسال شود (برای HTTP محلی: COOKIE_SECURE=false)
export const COOKIE_SECURE = process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false'
export const SESSION_COOKIE = 'hoyateb_session'

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10)
}
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash)
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (!payload || !payload.id) return null
    return {
      id: String(payload.id),
      username: String(payload.username || ''),
      fullName: String(payload.fullName || ''),
      role: payload.role as Role,
      companyId: (payload.companyId as string) || null,
      contractorId: (payload.contractorId as string) || null,
      personId: (payload.personId as string) || null,
    }
  } catch {
    return null
  }
}

// در Route Handlerها: سشن از کوکی
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  return readSessionToken(token)
}

// پشتیبانی از فراخوانی با Request (مثلاً برای fetch سمت سرور)
export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  return readSessionToken(token)
}

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function requireSession(): Promise<SessionUser> {
  const s = await getSession()
  if (!s) throw new HttpError(401, 'ابتدا وارد سامانه شوید')
  return s
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const s = await requireSession()
  if (!roles.includes(s.role)) throw new HttpError(403, 'شما به این بخش دسترسی ندارید')
  return s
}

export function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) {
    return Response.json({ error: e.message }, { status: e.status })
  }
  console.error('API error:', e)
  const msg = e instanceof Error ? e.message : 'خطای غیرمنتظره در سرور'
  return Response.json({ error: msg }, { status: 500 })
}
