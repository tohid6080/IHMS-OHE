'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { AppShell } from '@/components/AppShell'
import { LoginView } from '@/components/views/LoginView'
import { DashboardView } from '@/components/views/DashboardView'
import { ReceptionView } from '@/components/views/ReceptionView'
import { CasesView } from '@/components/views/CasesView'
import { CaseDetailView } from '@/components/views/CaseDetailView'
import { OrganizationsView } from '@/components/views/OrganizationsView'
import { UsersView } from '@/components/views/UsersView'
import { ReportsView } from '@/components/views/ReportsView'
import { SettingsView } from '@/components/views/SettingsView'
import { PrintView } from '@/components/print/PrintView'
import type { SessionUser } from '@/lib/types'

// نما بر اساس کلید فعال
function CurrentView({ view }: { view: string }) {
  switch (view) {
    case 'reception':
      return <ReceptionView />
    case 'cases':
      return <CasesView />
    case 'case-detail':
      return <CaseDetailView />
    case 'organizations':
      return <OrganizationsView />
    case 'users':
      return <UsersView />
    case 'reports':
      return <ReportsView />
    case 'settings':
      return <SettingsView />
    case 'print':
      return <PrintView />
    default:
      return <DashboardView />
  }
}

export default function Home() {
  const { user, view, setUser } = useAppStore()

  // بررسی نشست در پس‌زمینه با مهلت ۴ ثانیه:
  // - فرم ورود بلافاصله نمایش داده می‌شود (اولین صفحه = صفحه ورود)
  // - اگر نشست معتبر وجود داشته باشد، خودکار به داشبورد می‌رود
  // - اگر ارتباط قطع/کند باشد، کاربر در فرم ورود می‌ماند و می‌تواند دستی وارد شود
  useEffect(() => {
    if (user) return
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    apiGet<{ user: SessionUser | null }>('/api/auth/me', {
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timer)
        if (res?.user) setUser(res.user)
      })
      .catch(() => {
        /* بی‌صدا — کاربر در فرم ورود می‌ماند */
      })
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [user, setUser])

  if (!user) {
    return <LoginView />
  }

  return (
    <AppShell>
      <CurrentView view={view} key={view} />
    </AppShell>
  )
}
