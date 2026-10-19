'use client'

import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Loader2, Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toFa } from '@/lib/jalali'
import { ROLE_LABELS } from '@/lib/constants'
import type { Role } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── انواع (مطابق قرارداد GET /api/users) ───
interface UserItem {
  id: string
  username: string
  fullName: string
  role: Role
  phone: string | null
  active: boolean
  companyId: string | null
  contractorId: string | null
  company: { name: string } | null
  contractor: { name: string } | null
}

interface OrgOption {
  id: string
  name: string
}

// نقش‌های ستادی — MANAGER فقط این نقش‌ها را می‌سازد/ویرایش می‌کند
const STAFF_ROLES: Role[] = ['HSE', 'DOCTOR', 'AUDIOLOGIST', 'OPTOMETRIST', 'LAB']

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-slate-800 text-white border-slate-800',
  MANAGER: 'bg-teal-700 text-white border-teal-700',
  HSE: 'bg-cyan-600 text-white border-cyan-600',
  DOCTOR: 'bg-emerald-600 text-white border-emerald-600',
  AUDIOLOGIST: 'bg-amber-500 text-white border-amber-500',
  OPTOMETRIST: 'bg-teal-500 text-white border-teal-500',
  LAB: 'bg-slate-500 text-white border-slate-500',
  EMPLOYER: 'bg-slate-200 text-slate-700 border-slate-300',
  CONTRACTOR: 'bg-slate-300 text-slate-800 border-slate-400',
  WORKER: 'bg-slate-100 text-slate-600 border-slate-200',
}

interface FormState {
  username: string
  fullName: string
  phone: string
  role: Role
  password: string
  companyId: string
  contractorId: string
}

const EMPTY_FORM: FormState = {
  username: '',
  fullName: '',
  phone: '',
  role: 'HSE',
  password: '',
  companyId: '',
  contractorId: '',
}

export function UsersView() {
  const me = useAppStore((s) => s.user)
  const refreshKey = useAppStore((s) => s.refreshKey)
  const refresh = useAppStore((s) => s.refresh)

  const isAdmin = me?.role === 'ADMIN'
  const isManager = me?.role === 'MANAGER'

  const [users, setUsers] = useState<UserItem[]>([])
  const [companies, setCompanies] = useState<OrgOption[]>([])
  const [contractors, setContractors] = useState<OrgOption[]>([])
  const [loading, setLoading] = useState(true)

  // ─── Dialog ایجاد/ویرایش ───
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<UserItem | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // ─── Dialog تغییر رمز ───
  const [pwUser, setPwUser] = useState<UserItem | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  // ─── حذف ───
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [togglingId, setTogglingId] = useState<string | null>(null)

  const canEditRow = (u: UserItem) => isAdmin || STAFF_ROLES.includes(u.role)
  const roleOptions: Role[] = isManager ? STAFF_ROLES : (Object.keys(ROLE_LABELS) as Role[])

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      apiGet<UserItem[]>('/api/users').then(setUsers).catch(() => setUsers([])),
      apiGet<OrgOption[]>('/api/companies').then(setCompanies).catch(() => setCompanies([])),
      apiGet<OrgOption[]>('/api/contractors').then(setContractors).catch(() => setContractors([])),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, role: roleOptions[0] || 'HSE' })
    setDialogOpen(true)
  }

  function openEdit(u: UserItem) {
    setEditing(u)
    setForm({
      username: u.username,
      fullName: u.fullName,
      phone: u.phone || '',
      role: u.role,
      password: '',
      companyId: u.companyId || '',
      contractorId: u.contractorId || '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.fullName.trim()) {
      toast.error('نام و نام خانوادگی الزامی است')
      return
    }
    if (!editing) {
      if (form.username.trim().length < 3) {
        toast.error('نام کاربری باید حداقل ۳ کاراکتر باشد')
        return
      }
      if (form.password.length < 5) {
        toast.error('رمز عبور باید حداقل ۵ کاراکتر باشد')
        return
      }
    }
    if (form.role === 'EMPLOYER' && !form.companyId) {
      toast.error('برای کاربر کارفرما، انتخاب شرکت الزامی است')
      return
    }
    if (form.role === 'CONTRACTOR' && !form.contractorId) {
      toast.error('برای کاربر پیمانکار، انتخاب پیمانکار الزامی است')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          fullName: form.fullName.trim(),
          role: form.role,
          phone: form.phone.trim() || undefined,
          companyId: form.role === 'EMPLOYER' ? form.companyId : null,
          contractorId: form.role === 'CONTRACTOR' ? form.contractorId : null,
        }
        if (form.password) body.password = form.password
        await apiPatch(`/api/users/${editing.id}`, body)
        toast.success('اطلاعات کاربر به‌روزرسانی شد')
      } else {
        await apiPost('/api/users', {
          username: form.username.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          role: form.role,
          phone: form.phone.trim() || undefined,
          companyId: form.role === 'EMPLOYER' ? form.companyId : undefined,
          contractorId: form.role === 'CONTRACTOR' ? form.contractorId : undefined,
        })
        toast.success('کاربر جدید ایجاد شد')
      }
      setDialogOpen(false)
      load()
      refresh()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'خطا')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(u: UserItem, active: boolean) {
    setTogglingId(u.id)
    try {
      await apiPatch(`/api/users/${u.id}`, { active })
      toast.success(active ? 'کاربر فعال شد' : 'کاربر غیرفعال شد')
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, active } : x)))
      refresh()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'خطا')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleChangePassword() {
    if (!pwUser) return
    if (newPassword.length < 5) {
      toast.error('رمز عبور باید حداقل ۵ کاراکتر باشد')
      return
    }
    setPwSaving(true)
    try {
      await apiPatch(`/api/users/${pwUser.id}`, { password: newPassword })
      toast.success('رمز عبور تغییر کرد')
      setPwUser(null)
      setNewPassword('')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'خطا')
    } finally {
      setPwSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiDelete(`/api/users/${deleteTarget.id}`)
      toast.success('کاربر حذف شد')
      setDeleteTarget(null)
      load()
      refresh()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'خطا')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-teal-950">مدیریت کاربران</h1>
        <Button size="sm" onClick={openCreate} className="bg-teal-700 hover:bg-teal-800">
          <Plus className="size-4" /> افزودن کاربر
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {isManager
          ? 'به‌عنوان مدیر مرکز، فقط کاربران ستادی (بهداشت، پزشک، ادیولوژیست، اپتومتریست، آزمایشگاه) قابل مدیریت هستند.'
          : 'کاربران سامانه با نقش و سطح دسترسی هرکدام'}
      </p>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto scrollbar-thin rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">نام و نام خانوادگی</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">نام کاربری</th>
                <th className="hidden md:table-cell px-3 py-2 text-right text-xs font-medium text-muted-foreground">تلفن</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">نقش</th>
                <th className="hidden lg:table-cell px-3 py-2 text-right text-xs font-medium text-muted-foreground">شرکت / پیمانکار</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">فعال</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className={`hover:bg-muted/40 transition-colors ${!u.active ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2 font-medium">{u.fullName}</td>
                  <td className="px-3 py-2 font-mono text-xs" dir="ltr">{u.username}</td>
                  <td className="hidden md:table-cell px-3 py-2 tabular-nums text-xs">{u.phone ? toFa(u.phone) : '—'}</td>
                  <td className="px-3 py-2">
                    <Badge className={`${ROLE_BADGE[u.role] || ROLE_BADGE.WORKER} border`}>{ROLE_LABELS[u.role]}</Badge>
                  </td>
                  <td className="hidden lg:table-cell px-3 py-2 text-xs text-muted-foreground">
                    {u.company?.name || u.contractor?.name || '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {canEditRow(u) ? (
                      <Switch
                        checked={u.active}
                        disabled={togglingId === u.id}
                        onCheckedChange={(v) => toggleActive(u, v)}
                        aria-label={`تغییر وضعیت ${u.fullName}`}
                      />
                    ) : (
                      <span className="text-[11px] text-muted-foreground">{u.active ? 'فعال' : 'غیرفعال'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {canEditRow(u) ? (
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="size-7 text-teal-700 hover:bg-teal-50" onClick={() => openEdit(u)} aria-label="ویرایش">
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7 text-amber-600 hover:bg-amber-50" onClick={() => { setPwUser(u); setNewPassword('') }} aria-label="تغییر رمز">
                          <KeyRound className="size-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="size-7 text-rose-600 hover:bg-rose-50" onClick={() => setDeleteTarget(u)} aria-label="حذف">
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="block text-center text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    کاربری یافت نشد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Dialog ایجاد / ویرایش ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRound className="size-4 text-teal-700" />
              {editing ? `ویرایش کاربر «${editing.fullName}»` : 'افزودن کاربر جدید'}
            </DialogTitle>
            {!editing && (
              <DialogDescription>
                رمز عبور حداقل ۵ کاراکتر و نام کاربری حداقل ۳ کاراکتر باشد.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="grid gap-3 py-1">
            {!editing && (
              <div className="space-y-1.5">
                <Label>نام کاربری *</Label>
                <Input
                  dir="ltr"
                  className="text-left font-mono"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="username"
                  autoComplete="off"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>نام و نام خانوادگی *</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="مثلاً دکتر سارا محمدی"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>تلفن</Label>
                <Input
                  dir="ltr"
                  className="text-left tabular-nums"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0912..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>نقش *</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {roleOptions.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.role === 'EMPLOYER' && (
              <div className="space-y-1.5">
                <Label>شرکت کارفرما *</Label>
                <Select value={form.companyId || '__none__'} onValueChange={(v) => setForm({ ...form, companyId: v === '__none__' ? '' : v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب شرکت" /></SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="__none__" disabled>انتخاب کنید</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.role === 'CONTRACTOR' && (
              <div className="space-y-1.5">
                <Label>پیمانکار *</Label>
                <Select value={form.contractorId || '__none__'} onValueChange={(v) => setForm({ ...form, contractorId: v === '__none__' ? '' : v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب پیمانکار" /></SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="__none__" disabled>انتخاب کنید</SelectItem>
                    {contractors.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{editing ? 'رمز جدید (اختیاری — برای تغییر رمز)' : 'رمز عبور *'}</Label>
              <Input
                type="password"
                dir="ltr"
                className="text-left"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>انصراف</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-teal-700 hover:bg-teal-800">
              {saving && <Loader2 className="size-4 animate-spin" />}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog تغییر رمز ─── */}
      <Dialog open={!!pwUser} onOpenChange={(v) => !v && setPwUser(null)}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-amber-600" />
              تغییر رمز عبور {pwUser ? `«${pwUser.fullName}»` : ''}
            </DialogTitle>
            <DialogDescription>رمز جدید حداقل ۵ کاراکتر باشد.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <Label>رمز عبور جدید *</Label>
            <Input
              type="password"
              dir="ltr"
              className="text-left"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPwUser(null)} disabled={pwSaving}>انصراف</Button>
            <Button onClick={handleChangePassword} disabled={pwSaving} className="bg-amber-600 hover:bg-amber-700 text-white">
              {pwSaving && <Loader2 className="size-4 animate-spin" />}
              تغییر رمز
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── AlertDialog حذف ─── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف کاربر</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف «{deleteTarget?.fullName}» (نام کاربری: {deleteTarget?.username}) مطمئن هستید؟ این عمل بازگشت‌پذیر نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
