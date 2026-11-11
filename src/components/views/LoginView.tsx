'use client'

import { useState } from 'react'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { apiPost, ApiError } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { SessionUser } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// کاربران سامانه — نام‌های کاربری؛ رمزها محرمانه است و در کد/مخزن قرار نمی‌گیرد

export function LoginView() {
  const setUser = useAppStore((s) => s.setUser)
  const setAuthChecked = useAppStore((s) => s.setAuthChecked)
  const setView = useAppStore((s) => s.setView)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) {
      toast.error('نام کاربری و رمز عبور را وارد کنید')
      return
    }
    setLoading(true)
    try {
      const res = await apiPost<{ user: SessionUser }>('/api/auth/login', {
        username: username.trim(),
        password,
      })
      setUser(res.user)
      setAuthChecked(true)
      toast.success(`خوش آمدید ${res.user.fullName}`)
      setView('dashboard')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'خطا در برقراری ارتباط با سرور')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      dir="rtl"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-bl from-teal-950 via-slate-900 to-emerald-950 p-4"
    >
      {/* الگوهای تزئینی پس‌زمینه */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute top-1/3 -left-32 size-[28rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 size-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute top-16 left-1/3 size-40 rounded-full border border-white/10" />
        <div className="absolute bottom-24 right-16 size-64 rounded-full border border-white/10" />
        <div className="absolute top-1/2 right-1/2 size-24 rounded-full bg-white/5" />
      </div>

      {/* کارت شیشه‌ای ورود */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white/90 backdrop-blur-xl shadow-2xl border border-white/40 p-6">
        <div className="flex flex-col items-center text-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ihms-logo.svg" alt="IHMS" className="size-20 rounded-2xl shadow-lg shadow-teal-900/20" />
          <div>
            <h1 className="text-xl font-bold text-teal-950" dir="ltr">IHMS-OHE</h1>
            <p className="mt-1 text-sm text-teal-900">سامانه مدیریت معاینات طب کار</p>
            <p className="mt-0.5 text-xs text-slate-500">نرم‌افزار مدیریت پرونده‌های سلامت شغلی</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">نام کاربری</Label>
            <Input
              id="username"
              dir="ltr"
              className="text-left"
              placeholder="نام کاربری"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">رمز عبور</Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              className="text-left"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full bg-teal-700 hover:bg-teal-800" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            {loading ? 'در حال ورود…' : 'ورود'}
          </Button>
        </form>
      </div>

      <p className="relative z-10 mt-6 text-xs text-teal-200/70">
        IHMS-OHE © مرکز طب کار مهرگان
      </p>
    </div>
  )
}
