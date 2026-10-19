'use client'

import { useState } from 'react'
import {
  BarChart3,
  Building2,
  FolderOpen,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiPost } from '@/lib/api'
import { useAppStore, type ViewKey } from '@/lib/store'
import { ROLE_LABELS } from '@/lib/constants'
import type { Role } from '@/lib/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

interface NavItem {
  key: ViewKey
  label: string
  icon: LucideIcon
  roles: Role[] | 'all'
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'داشبورد', icon: LayoutDashboard, roles: 'all' },
  { key: 'cases', label: 'پرونده‌ها', icon: FolderOpen, roles: 'all' },
  { key: 'reception', label: 'پذیرش و تشکیل پرونده', icon: UserPlus, roles: ['ADMIN', 'MANAGER'] },
  { key: 'organizations', label: 'شرکت‌ها و پیمانکاران', icon: Building2, roles: ['ADMIN', 'MANAGER'] },
  { key: 'users', label: 'مدیریت کاربران', icon: Users, roles: ['ADMIN', 'MANAGER'] },
  {
    key: 'reports',
    label: 'گزارش‌ها و آمار',
    icon: BarChart3,
    roles: ['ADMIN', 'MANAGER', 'EMPLOYER', 'CONTRACTOR'],
  },
  { key: 'settings', label: 'تنظیمات', icon: Settings, roles: ['ADMIN', 'MANAGER'] },
]

function visibleItems(role: Role | undefined): { key: ViewKey; label: string; icon: LucideIcon }[] {
  if (!role) return []
  return NAV_ITEMS.filter(
    (it) => it.roles === 'all' || it.roles.includes(role),
  ).map((it) =>
    // برچسب «پرونده‌ها» برای مراجعه‌کننده
    it.key === 'cases' && role === 'WORKER' ? { ...it, label: 'پرونده‌های من' } : it,
  )
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '؟'
  if (parts.length === 1) return parts[0].slice(0, 1)
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`
}

function NavList({ items, view, go, onNavigate }: { items: { key: ViewKey; label: string; icon: LucideIcon }[]; view: ViewKey; go: (v: ViewKey) => void; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((it) => {
        const active = view === it.key || (it.key === 'cases' && view === 'case-detail')
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => {
              go(it.key)
              onNavigate?.()
            }}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors text-right ${
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-r-4 border-primary'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground border-r-4 border-transparent'
            }`}
          >
            <it.icon className="size-4 shrink-0" />
            <span>{it.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user)
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)
  const setUser = useAppStore((s) => s.setUser)

  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const role = user?.role
  const items = visibleItems(role)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await apiPost('/api/auth/logout')
    } catch {
      // حتی در صورت خطای سرور، کاربر از رابط خارج می‌شود
    }
    setUser(null)
    setLoggingOut(false)
    toast.success('از سامانه خارج شدید')
  }

  function go(v: ViewKey) {
    setView(v)
    setMobileOpen(false)
  }

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-background">
      {/* ─── هدر ─── */}
      <header className="fixed top-0 z-40 right-0 left-0 h-14 bg-primary text-primary-foreground shadow-md">
        <div className="flex h-full items-center gap-3 px-3 md:px-4">
          {/* منوی موبایل */}
          {role && (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-primary-foreground hover:bg-primary-foreground/15"
                  aria-label="باز کردن منو"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-0 bg-sidebar">
                <SheetHeader className="border-b bg-primary text-primary-foreground rounded-none">
                  <SheetTitle className="flex items-center gap-2 text-sm">
                    <HeartPulse className="size-4" />
                    سامانه مدیریت معاینات طب کار
                  </SheetTitle>
                </SheetHeader>
                <NavList items={items} view={view} go={go} onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
          )}

          {/* عنوان سامانه */}
          <div className="flex items-center gap-2 min-w-0">
            <HeartPulse className="size-5 shrink-0" />
            <div className="min-w-0 leading-tight">
              <div className="text-sm font-bold truncate">سامانه مدیریت معاینات طب کار</div>
              <div className="hidden sm:block text-[11px] text-primary-foreground/70">
                مرکز طب کار مهرگان
              </div>
            </div>
          </div>

          {/* چپ: پروفایل کاربر */}
          <div className="mr-auto flex items-center">
            {user && (
              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full pl-2 pr-1 py-1 hover:bg-primary-foreground/15 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/50"
                  >
                    <Avatar className="size-8 border border-primary-foreground/30">
                      <AvatarFallback className="bg-primary-foreground text-primary text-xs font-bold">
                        {initials(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:flex flex-col items-start leading-tight">
                      <span className="text-xs font-semibold">{user.fullName}</span>
                      <span className="text-[10px] text-primary-foreground/75">
                        {ROLE_LABELS[user.role]}
                      </span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="flex flex-col">
                    <span>{user.fullName}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {ROLE_LABELS[user.role]}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={loggingOut}
                    variant="destructive"
                    className="cursor-pointer"
                  >
                    <LogOut className="size-4" />
                    خروج از سامانه
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* ─── سایدبار دسکتاپ ─── */}
      <aside className="hidden lg:flex fixed right-0 top-14 bottom-10 w-56 bg-sidebar border-l flex-col overflow-y-auto scrollbar-thin z-30">
        <NavList items={items} view={view} go={go} />
        <div className="mt-auto p-4 text-[10px] text-muted-foreground text-center">
          نسخه ۱.۰ © مرکز طب کار مهرگان
        </div>
      </aside>

      {/* ─── محتوای اصلی ─── */}
      <div className="flex-1 flex flex-col lg:mr-56 pt-14 pb-10">
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      {/* ─── فوتر ثابت پایین ─── */}
      <footer className="h-10 fixed bottom-0 left-0 right-0 lg:right-56 z-30 bg-card border-t text-xs text-muted-foreground flex items-center justify-center gap-2">
        <HeartPulse className="size-3.5 text-teal-600" />
        سامانه مدیریت معاینات طب کار — نسخه ۱.۰
      </footer>
    </div>
  )
}
