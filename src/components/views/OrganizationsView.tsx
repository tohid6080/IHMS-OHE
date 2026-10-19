'use client'

import { useCallback, useEffect, useState } from 'react'
import { Building2, FolderKanban, Loader2, Pencil, Plus, Trash2, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toFa } from '@/lib/jalali'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
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

// ─── انواع (مطابق قرارداد API) ───
interface CompanyItem {
  id: string
  name: string
  nationalId: string | null
  phone: string | null
  address: string | null
  active: boolean
  _count: { cases: number }
}
interface ContractorItem {
  id: string
  name: string
  companyId: string | null
  company: { id: string; name: string } | null
  phone: string | null
  active: boolean
  _count: { cases: number }
}
interface ProjectItem {
  id: string
  name: string
  companyId: string | null
  company: { id: string; name: string } | null
  contractorId: string | null
  contractor: { id: string; name: string } | null
  active: boolean
  _count: { cases: number }
}

type Kind = 'company' | 'contractor' | 'project'

const KIND_TITLE: Record<Kind, string> = {
  company: 'شرکت',
  contractor: 'پیمانکار',
  project: 'پروژه',
}

interface FormState {
  name: string
  nationalId: string
  phone: string
  address: string
  companyId: string
  contractorId: string
  active: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  nationalId: '',
  phone: '',
  address: '',
  companyId: '',
  contractorId: '',
  active: true,
}

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">فعال</Badge>
  ) : (
    <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200">غیرفعال</Badge>
  )
}

export function OrganizationsView() {
  const user = useAppStore((s) => s.user)
  const refreshKey = useAppStore((s) => s.refreshKey)
  const refresh = useAppStore((s) => s.refresh)
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const [companies, setCompanies] = useState<CompanyItem[]>([])
  const [contractors, setContractors] = useState<ContractorItem[]>([])
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)

  // ─── فرم ───
  const [kind, setKind] = useState<Kind>('company')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // ─── حذف ───
  const [deleteTarget, setDeleteTarget] = useState<{ kind: Kind; id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadAll = useCallback(() => {
    setLoading(true)
    Promise.all([
      apiGet<CompanyItem[]>('/api/companies').then(setCompanies).catch(() => setCompanies([])),
      apiGet<ContractorItem[]>('/api/contractors').then(setContractors).catch(() => setContractors([])),
      apiGet<ProjectItem[]>('/api/projects').then(setProjects).catch(() => setProjects([])),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll, refreshKey])

  function openAdd(k: Kind) {
    setKind(k)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEditCompany(c: CompanyItem) {
    setKind('company')
    setEditingId(c.id)
    setForm({
      name: c.name,
      nationalId: c.nationalId || '',
      phone: c.phone || '',
      address: c.address || '',
      companyId: '',
      contractorId: '',
      active: c.active,
    })
    setDialogOpen(true)
  }

  function openEditContractor(c: ContractorItem) {
    setKind('contractor')
    setEditingId(c.id)
    setForm({
      name: c.name,
      nationalId: '',
      phone: c.phone || '',
      address: '',
      companyId: c.companyId || '',
      contractorId: '',
      active: c.active,
    })
    setDialogOpen(true)
  }

  function openEditProject(p: ProjectItem) {
    setKind('project')
    setEditingId(p.id)
    setForm({
      name: p.name,
      nationalId: '',
      phone: '',
      address: '',
      companyId: p.companyId || '',
      contractorId: p.contractorId || '',
      active: p.active,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('نام الزامی است')
      return
    }
    if (kind === 'contractor' && !form.companyId) {
      toast.error('انتخاب کارفرما الزامی است')
      return
    }
    if (kind === 'project' && (!form.companyId || !form.contractorId)) {
      toast.error('انتخاب کارفرما و پیمانکار الزامی است')
      return
    }
    setSaving(true)
    try {
      if (kind === 'company') {
        const body = {
          name: form.name.trim(),
          nationalId: form.nationalId.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          active: form.active,
        }
        if (editingId) await apiPatch(`/api/companies/${editingId}`, body)
        else await apiPost('/api/companies', body)
      } else if (kind === 'contractor') {
        const body = {
          name: form.name.trim(),
          companyId: form.companyId || undefined,
          phone: form.phone.trim() || undefined,
          active: form.active,
        }
        if (editingId) await apiPatch(`/api/contractors/${editingId}`, body)
        else await apiPost('/api/contractors', body)
      } else {
        const body = {
          name: form.name.trim(),
          companyId: form.companyId || undefined,
          contractorId: form.contractorId || undefined,
          active: form.active,
        }
        if (editingId) await apiPatch(`/api/projects/${editingId}`, body)
        else await apiPost('/api/projects', body)
      }
      toast.success(editingId ? `${KIND_TITLE[kind]} با موفقیت ویرایش شد` : `${KIND_TITLE[kind]} جدید ثبت شد`)
      setDialogOpen(false)
      loadAll()
      refresh()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'خطا')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const url =
        deleteTarget.kind === 'company'
          ? `/api/companies/${deleteTarget.id}`
          : deleteTarget.kind === 'contractor'
            ? `/api/contractors/${deleteTarget.id}`
            : `/api/projects/${deleteTarget.id}`
      await apiDelete(url)
      toast.success('با موفقیت حذف شد')
      setDeleteTarget(null)
      loadAll()
      refresh()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'خطا')
    } finally {
      setDeleting(false)
    }
  }

  const ActionButtons = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
    canManage ? (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-7 text-teal-700 hover:bg-teal-50" onClick={onEdit} aria-label="ویرایش">
          <Pencil className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="size-7 text-rose-600 hover:bg-rose-50" onClick={onDelete} aria-label="حذف">
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    ) : (
      <span className="text-[11px] text-muted-foreground">—</span>
    )
  )

  const Th = ({ children, hidden = false }: { children?: React.ReactNode; hidden?: boolean }) => (
    <th className={`px-3 py-2 text-right text-xs font-medium text-muted-foreground ${hidden ? 'hidden md:table-cell' : ''}`}>
      {children}
    </th>
  )

  return (
    <div dir="rtl" className="space-y-4">
      <h1 className="text-xl font-bold text-teal-950">شرکت‌ها و پیمانکاران</h1>

      <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)} dir="rtl">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="company" className="gap-1.5 text-xs sm:text-sm">
            <Building2 className="size-4" /> شرکت‌ها
          </TabsTrigger>
          <TabsTrigger value="contractor" className="gap-1.5 text-xs sm:text-sm">
            <Truck className="size-4" /> پیمانکاران
          </TabsTrigger>
          <TabsTrigger value="project" className="gap-1.5 text-xs sm:text-sm">
            <FolderKanban className="size-4" /> پروژه‌ها
          </TabsTrigger>
        </TabsList>

        {/* ─── شرکت‌ها ─── */}
        <TabsContent value="company" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">شرکت‌های کارفرما ثبت‌شده در سامانه</p>
            {canManage && (
              <Button size="sm" onClick={() => openAdd('company')} className="bg-teal-700 hover:bg-teal-800">
                <Plus className="size-4" /> افزودن شرکت
              </Button>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : companies.length === 0 ? (
            <Card className="py-8"><CardContent className="text-center text-sm text-muted-foreground">شرکتی ثبت نشده است</CardContent></Card>
          ) : (
            <div className="max-h-96 overflow-y-auto scrollbar-thin rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                  <tr>
                    <Th>نام شرکت</Th>
                    <Th hidden>شناسه ملی</Th>
                    <Th hidden>تلفن</Th>
                    <Th hidden>آدرس</Th>
                    <Th>پرونده‌ها</Th>
                    <Th>وضعیت</Th>
                    <Th>عملیات</Th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {companies.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      <td className="hidden md:table-cell px-3 py-2 tabular-nums text-xs">{c.nationalId ? toFa(c.nationalId) : '—'}</td>
                      <td className="hidden md:table-cell px-3 py-2 tabular-nums text-xs">{c.phone ? toFa(c.phone) : '—'}</td>
                      <td className="hidden md:table-cell px-3 py-2 max-w-40 truncate text-xs text-muted-foreground" title={c.address || ''}>
                        {c.address || '—'}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-xs font-semibold text-teal-700">{toFa(c._count.cases)}</td>
                      <td className="px-3 py-2"><ActiveBadge active={c.active} /></td>
                      <td className="px-3 py-2">
                        <ActionButtons onEdit={() => openEditCompany(c)} onDelete={() => setDeleteTarget({ kind: 'company', id: c.id, name: c.name })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ─── پیمانکاران ─── */}
        <TabsContent value="contractor" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">پیمانکاران وابسته به شرکت‌های کارفرما</p>
            {canManage && (
              <Button size="sm" onClick={() => openAdd('contractor')} className="bg-teal-700 hover:bg-teal-800">
                <Plus className="size-4" /> افزودن پیمانکار
              </Button>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : contractors.length === 0 ? (
            <Card className="py-8"><CardContent className="text-center text-sm text-muted-foreground">پیمانکاری ثبت نشده است</CardContent></Card>
          ) : (
            <div className="max-h-96 overflow-y-auto scrollbar-thin rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                  <tr>
                    <Th>نام پیمانکار</Th>
                    <Th>کارفرما</Th>
                    <Th hidden>تلفن</Th>
                    <Th>وضعیت</Th>
                    <Th>عملیات</Th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contractors.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{c.company?.name || '—'}</td>
                      <td className="hidden md:table-cell px-3 py-2 tabular-nums text-xs">{c.phone ? toFa(c.phone) : '—'}</td>
                      <td className="px-3 py-2"><ActiveBadge active={c.active} /></td>
                      <td className="px-3 py-2">
                        <ActionButtons onEdit={() => openEditContractor(c)} onDelete={() => setDeleteTarget({ kind: 'contractor', id: c.id, name: c.name })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ─── پروژه‌ها ─── */}
        <TabsContent value="project" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">پروژه‌های تعریف‌شده برای هر کارفرما/پیمانکار</p>
            {canManage && (
              <Button size="sm" onClick={() => openAdd('project')} className="bg-teal-700 hover:bg-teal-800">
                <Plus className="size-4" /> افزودن پروژه
              </Button>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Card className="py-8"><CardContent className="text-center text-sm text-muted-foreground">پروژه‌ای ثبت نشده است</CardContent></Card>
          ) : (
            <div className="max-h-96 overflow-y-auto scrollbar-thin rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                  <tr>
                    <Th>نام پروژه</Th>
                    <Th hidden>کارفرما</Th>
                    <Th>پیمانکار</Th>
                    <Th>وضعیت</Th>
                    <Th>عملیات</Th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="hidden md:table-cell px-3 py-2 text-xs text-muted-foreground">{p.company?.name || '—'}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{p.contractor?.name || '—'}</td>
                      <td className="px-3 py-2"><ActiveBadge active={p.active} /></td>
                      <td className="px-3 py-2">
                        <ActionButtons onEdit={() => openEditProject(p)} onDelete={() => setDeleteTarget({ kind: 'project', id: p.id, name: p.name })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Dialog فرم مشترک ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? `ویرایش ${KIND_TITLE[kind]}` : `افزودن ${KIND_TITLE[kind]} جدید`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>نام {KIND_TITLE[kind]} *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={kind === 'company' ? 'مثلاً شرکت نیرنگوتراکم' : kind === 'contractor' ? 'مثلاً شرکت نیروتوان‌ساختمان' : 'مثلاً پروژه سد دز'}
              />
            </div>
            {kind === 'company' && (
              <div className="space-y-1.5">
                <Label>شناسه ملی</Label>
                <Input
                  dir="ltr"
                  className="text-left tabular-nums"
                  value={form.nationalId}
                  onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                  placeholder="۱۴۰۰۳۳۵۴۷۶۶"
                />
              </div>
            )}
            {kind !== 'project' && (
              <div className="space-y-1.5">
                <Label>تلفن</Label>
                <Input
                  dir="ltr"
                  className="text-left tabular-nums"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="061-33334455"
                />
              </div>
            )}
            {kind === 'company' && (
              <div className="space-y-1.5">
                <Label>آدرس</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="آدرس دفتر مرکزی"
                />
              </div>
            )}
            {(kind === 'contractor' || kind === 'project') && (
              <div className="space-y-1.5">
                <Label>شرکت کارفرما *</Label>
                <Select value={form.companyId || '__none__'} onValueChange={(v) => setForm({ ...form, companyId: v === '__none__' ? '' : v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="__none__" disabled>انتخاب کنید</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {kind === 'project' && (
              <div className="space-y-1.5">
                <Label>پیمانکار *</Label>
                <Select value={form.contractorId || '__none__'} onValueChange={(v) => setForm({ ...form, contractorId: v === '__none__' ? '' : v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="__none__" disabled>انتخاب کنید</SelectItem>
                    {contractors.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2.5">
              <Label className="text-sm">وضعیت فعال</Label>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
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

      {/* ─── AlertDialog حذف ─── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف {deleteTarget ? KIND_TITLE[deleteTarget.kind] : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف «{deleteTarget?.name}» مطمئن هستید؟ در صورت داشتن پرونده یا وابستگی، حذف انجام نخواهد شد.
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
