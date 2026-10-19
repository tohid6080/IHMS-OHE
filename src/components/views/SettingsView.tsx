'use client'

import { useEffect, useState } from 'react'
import { Building2, DatabaseBackup, Loader2, Save, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { DEFAULT_CENTER, ROLE_LABELS, SECTION_DEFS } from '@/lib/constants'
import type { Role } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

type CenterInfo = typeof DEFAULT_CENTER

// ─── راهنمای نقش‌ها بر اساس SECTION_DEFS ───
function buildRoleGuide(): { role: Role; text: string }[] {
  const roles = Object.keys(ROLE_LABELS) as Role[]
  return roles.map((role) => {
    if (role === 'ADMIN') {
      return { role, text: 'ثبت و تأیید همه بخش‌ها؛ مدیریت کاربران، شرکت‌ها و پیمانکاران، تنظیمات مرکز و پشتیبان‌گیری از پایگاه داده' }
    }
    const edit: string[] = []
    const approve: string[] = []
    for (const d of SECTION_DEFS) {
      if (d.editorRoles.includes(role)) edit.push(d.number)
      if (d.approverRoles.includes(role)) approve.push(d.number)
    }
    const parts: string[] = []
    if (edit.length) parts.push(`ثبت بخش‌های ${edit.join('، ')}`)
    if (approve.length && approve.join() !== edit.join()) {
      parts.push(edit.length ? `تأیید بخش‌های ${approve.join('، ')}` : `صرفاً تأیید بخش‌های ${approve.join('، ')}`)
    } else if (approve.length) {
      parts.push('و تأیید همان بخش‌ها')
    }
    const extra: Partial<Record<Role, string>> = {
      MANAGER: '؛ به‌علاوه پذیرش و تشکیل پرونده، مدیریت کاربران ستادی و سازمان‌ها و مشاهده همه گزارش‌ها',
      DOCTOR: '؛ به‌علاوه ثبت نظریه نهایی پزشک و تعیین تکلیف ارجاع‌های پزشکی',
      AUDIOLOGIST: '؛ تأیید نهایی ادیومتری نیز بر عهده همین نقش است',
      EMPLOYER: '؛ با دسترسی مشاهده محدود به پرونده‌ها و گزارش‌های شرکت خود (بدون جزئیات پزشکی)',
      CONTRACTOR: '؛ با دسترسی مشاهده محدود به پرونده‌ها و گزارش‌های پیمانکار خود (بدون جزئیات پزشکی)',
      HSE: ' (ارزیاب عوامل زیان‌آور محیط کار)',
      OPTOMETRIST: '',
      LAB: ' (کاربر آزمایشگاه)',
    }
    if (role === 'OPTOMETRIST' && parts.length === 0) parts.push('ثبت بخش‌های ۷-الف')
    const ex = extra[role] ?? ''
    let text = parts.join('؛ ')
    if (ex) text = text ? `${text}${ex}` : ex.replace(/^؛\s*/, '')
    return { role, text }
  })
}

export function SettingsView() {
  const user = useAppStore((s) => s.user)
  const isAdmin = user?.role === 'ADMIN'

  // ─── اطلاعات مرکز ───
  const [center, setCenter] = useState<CenterInfo>(DEFAULT_CENTER)
  const [savingCenter, setSavingCenter] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('hoyateb_center')
      if (raw) setCenter({ ...DEFAULT_CENTER, ...JSON.parse(raw) })
    } catch {
      /* نگه‌داشتن پیش‌فرض */
    }
  }, [])

  function saveCenter() {
    setSavingCenter(true)
    try {
      localStorage.setItem('hoyateb_center', JSON.stringify(center))
      toast.success('اطلاعات مرکز ذخیره شد (در سربرگ چاپ استفاده می‌شود)')
    } catch {
      toast.error('ذخیره در حافظه مرورگر ممکن نشد')
    } finally {
      setSavingCenter(false)
    }
  }

  // ─── پشتیبان‌گیری ───
  const [backupLoading, setBackupLoading] = useState(false)
  async function downloadBackup() {
    setBackupLoading(true)
    try {
      const res = await fetch('/api/backup')
      if (!res.ok) {
        let msg = 'خطا'
        try {
          const j = (await res.json()) as { error?: string }
          if (j?.error) msg = j.error
        } catch {
          /* بدون بدنه JSON */
        }
        throw new ApiError(res.status, msg)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('نسخه پشتیبان پایگاه داده دانلود شد')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'خطا در دریافت نسخه پشتیبان')
    } finally {
      setBackupLoading(false)
    }
  }

  const roleGuide = buildRoleGuide()

  const centerField = (key: keyof CenterInfo, label: string, placeholder?: string) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={center[key]}
        onChange={(e) => setCenter({ ...center, [key]: e.target.value })}
        placeholder={placeholder}
      />
    </div>
  )

  return (
    <div dir="rtl" className="space-y-6">
      <h1 className="text-xl font-bold text-teal-950">تنظیمات</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ─── اطلاعات مرکز طب کار ─── */}
        <Card className="gap-4 py-4">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="size-4 text-teal-700" />
              اطلاعات مرکز طب کار
            </CardTitle>
            <CardDescription className="text-xs">
              این اطلاعات در سربرگ گزارش‌های چاپی و فرم‌ها استفاده می‌شود.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            {centerField('orgLine1', 'سطر اول سربرگ (سازمان بالادستی)')}
            {centerField('orgLine2', 'سطر دوم سربرگ (نام مرکز)')}
            {centerField('orgLine3', 'سطر سوم سربرگ (عنوان سند)')}
            {centerField('address', 'آدرس', 'نشانی کامل مرکز')}
            {centerField('phone', 'تلفن', '021-...')}
            <Button onClick={saveCenter} disabled={savingCenter} size="sm" className="bg-teal-700 hover:bg-teal-800">
              {savingCenter ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              ذخیره اطلاعات
            </Button>
          </CardContent>
        </Card>

        {/* ─── پشتیبان‌گیری (فقط ADMIN) ─── */}
        {isAdmin && (
          <Card className="gap-4 py-4">
            <CardHeader className="px-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <DatabaseBackup className="size-4 text-teal-700" />
                پشتیبان‌گیری
              </CardTitle>
              <CardDescription className="text-xs">
                از کل پایگاه داده (پرونده‌ها، کاربران و تنظیمات) فایل پشتیبان دانلود کنید و آن را در محل امن نگهداری نمایید.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              <Button onClick={downloadBackup} disabled={backupLoading} className="w-full bg-teal-700 hover:bg-teal-800">
                {backupLoading ? <Loader2 className="size-4 animate-spin" /> : <DatabaseBackup className="size-4" />}
                دانلود نسخه پشتیبان پایگاه داده
              </Button>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                فایل پشتیبان با فرمت <span className="font-mono" dir="ltr">.json</span> است. پشتیبان‌گیری خودکار پایگاه داده را Supabase انجام می‌دهد.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── راهنمای نقش‌ها و دسترسی ─── */}
      <Card className="gap-4 py-4">
        <CardHeader className="px-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="size-4 text-teal-700" />
            راهنمای نقش‌ها و دسترسی
          </CardTitle>
          <CardDescription className="text-xs">
            خلاصه دسترسی هر نقش به بخش‌های پرونده (بر اساس گردش کار بخش‌های ۱ تا ۹)
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <div className="max-h-96 overflow-y-auto scrollbar-thin rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                <tr>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-44">نقش</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">دسترسی‌ها</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {roleGuide.map((r) => (
                  <tr key={r.role} className="align-top hover:bg-muted/40">
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="bg-teal-50 text-teal-800 border-teal-200 whitespace-nowrap">
                        {ROLE_LABELS[r.role]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs leading-6 text-slate-600">{r.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
