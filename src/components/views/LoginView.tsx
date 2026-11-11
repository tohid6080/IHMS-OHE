'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, HeartPulse, KeyRound, Loader2, LogIn, TriangleAlert, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { apiPost, ApiError } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { SessionUser } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// DEMO-CREDENTIALS: بخش موقت — حذف همراه با فایل src/lib/demo-credentials.ts
import { DEMO_ACCOUNTS } from '@/lib/demo-credentials'

export function LoginView() {
  const setUser = useAppStore((s) => s.setUser)
  const setAuthChecked = useAppStore((s) => s.setAuthChecked)
  const setView = useAppStore((s) => s.setView)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [quickLoading, setQuickLoading] = useState<string | null>(null)
  const [showAccounts, setShowAccounts] = useState(true) // DEMO-CREDENTIALS: موقت

  async function login(username: string, password: string) {
    const res = await apiPost<{ user: SessionUser }>('/api/auth/login', { username, password })
    setUser(res.user)
    setAuthChecked(true)
    toast.success(`خوش آمدید ${res.user.fullName}`)
    setView('dashboard')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) {
      toast.error('نام کاربری و رمز عبور را وارد کنید')
      return
    }
    setLoading(true)
    try {
      await login(username.trim(), password)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'خطا در برقراری ارتباط با سرور')
    } finally {
      setLoading(false)
    }
  }

  // DEMO-CREDENTIALS: ورود سریع با یک کلیک — موقت
  async function handleQuickLogin(acc: (typeof DEMO_ACCOUNTS)[number]) {
    setQuickLoading(acc.username)
    try {
      await login(acc.username, acc.password)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'خطا در برقراری ارتباط با سرور')
    } finally {
      setQuickLoading(null)
    }
  }

  // DEMO-CREDENTIALS: کپی رمز — موقت
  async function handleCopy(acc: (typeof DEMO_ACCOUNTS)[number]) {
    try {
      await navigator.clipboard.writeText(`${acc.username} / ${acc.password}`)
      toast.success('نام کاربری و رمز کپی شد')
    } catch {
      toast.error('کپی انجام نشد')
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
          <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-900/20">
            <HeartPulse className="size-8" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-teal-950">سامانه مدیریت معاینات طب کار</h1>
            <p className="mt-1 text-xs text-slate-500">نرم‌افزار مدیریت پرونده‌های سلامت شغلی</p>
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
              disabled={loading || quickLoading !== null}
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
              disabled={loading || quickLoading !== null}
            />
          </div>
          <Button type="submit" className="w-full bg-teal-700 hover:bg-teal-800" disabled={loading || quickLoading !== null}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            {loading ? 'در حال ورود…' : 'ورود'}
          </Button>
        </form>

        {/* DEMO-CREDENTIALS: فهرست موقت حساب‌های آزمایشی — بعداً حذف می‌شود */}
        <div className="mt-5 rounded-xl border border-amber-300/70 bg-amber-50/80 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAccounts((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100/70 transition-colors"
            aria-expanded={showAccounts}
            aria-controls="demo-accounts-list"
          >
            <span className="flex items-center gap-2">
              <KeyRound className="size-4" />
              حساب‌های آزمایشی (نام کاربری و رمز)
            </span>
            {showAccounts ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {showAccounts && (
            <div id="demo-accounts-list" role="region" aria-label="حساب‌های آزمایشی" className="px-3 pb-3 space-y-2">
              <p className="flex items-start gap-1.5 text-[11px] leading-5 text-amber-800 bg-amber-100/80 rounded-lg px-2 py-1.5">
                <TriangleAlert className="size-3.5 mt-0.5 shrink-0" />
                این فهرست فقط برای دوره راه‌اندازی است و به‌زودی از سامانه حذف می‌شود.
              </p>
              <div className="max-h-72 overflow-y-auto scrollbar-thin space-y-1.5 pl-1">
                {DEMO_ACCOUNTS.map((acc) => (
                  <div
                    key={acc.username}
                    className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <UserRound className="size-3.5 text-teal-700 shrink-0" />
                        <span className="truncate">{acc.roleLabel}</span>
                        <span className="truncate font-normal text-slate-400">— {acc.fullName}</span>
                      </div>
                      <div dir="ltr" className="mt-0.5 flex items-center gap-1 text-left text-[11px] font-mono text-slate-600">
                        <span className="truncate">{acc.username}</span>
                        <span className="text-slate-300">|</span>
                        <span className="truncate">{acc.password}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-slate-500 hover:text-teal-700 hover:bg-teal-50"
                        onClick={() => handleCopy(acc)}
                        aria-label={`کپی نام کاربری و رمز ${acc.roleLabel}`}
                        title="کپی"
                        disabled={quickLoading !== null}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 px-2.5 text-xs bg-teal-700 hover:bg-teal-800"
                        onClick={() => handleQuickLogin(acc)}
                        aria-label={`ورود سریع با حساب ${acc.roleLabel}`}
                        title="ورود سریع"
                        disabled={quickLoading !== null || loading}
                      >
                        {quickLoading === acc.username ? <Loader2 className="size-3.5 animate-spin" /> : <LogIn className="size-3.5" />}
                        ورود
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="relative z-10 mt-6 text-xs text-teal-200/70">
        نسخه ۱.۰ © مرکز طب کار مهرگان
      </p>
    </div>
  )
}
