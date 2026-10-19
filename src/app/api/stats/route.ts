import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireSession, errorResponse } from '@/lib/auth'
import { computeOpenItems, sectionTitle } from '@/lib/case-utils'
import { EXAM_TYPE_LABELS, FINAL_OPINION_LABELS, SECTION_DEFS } from '@/lib/constants'
import { toEn, todayJalali } from '@/lib/jalali'
import type { OpenItem, Role, SectionKey } from '@/lib/types'

const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'SENT_FOR_REVIEW', 'NEEDS_CORRECTION', 'APPROVED', 'NOT_APPLICABLE'] as const
type StatusKey = (typeof STATUSES)[number]

// نرمال‌سازی رشته شمسی به 1405/07/06 (صفرپر)
function normJalaliDate(s: unknown): string {
  const v = toEn(String(s ?? '')).trim().replace(/-/g, '/')
  const m = v.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (!m) return v
  return `${m[1]}/${m[2].padStart(2, '0')}/${m[3].padStart(2, '0')}`
}

// مرز بازه از/تا؛ اگر فقط «سال/ماه» داده شود: از → ۰۱ و تا → ۳۱
function normBoundary(raw: string | null, isTo: boolean): string {
  if (!raw) return ''
  const v = toEn(String(raw)).trim().replace(/-/g, '/')
  const full = v.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (full) return `${full[1]}/${full[2].padStart(2, '0')}/${full[3].padStart(2, '0')}`
  const mo = v.match(/^(\d{4})\/(\d{1,2})$/)
  if (mo) return `${mo[1]}/${mo[2].padStart(2, '0')}/${isTo ? '31' : '01'}`
  return v
}

// آیا پرونده تکمیل‌شده است: نظریه نهایی قطعی ثبت شده باشد
function isCompleted(c: { finalOpinion?: string | null; completedAt?: Date | null }): boolean {
  return !!c.completedAt || (!!c.finalOpinion && c.finalOpinion !== 'INCOMPLETE')
}

interface OpenItemGroup {
  key: string
  label: string
  responsibleRole: Role
  responsibleLabel: string
  count: number
}

// GET /api/stats — آماره تجمیعی با محدودسازی نقشی
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const sp = req.nextUrl.searchParams
    const companyId = sp.get('companyId') || ''
    const contractorId = sp.get('contractorId') || ''
    const projectId = sp.get('projectId') || ''
    const examType = sp.get('examType') || ''
    const job = sp.get('job') || ''
    const from = normBoundary(sp.get('from'), false)
    const to = normBoundary(sp.get('to'), true)

    const where: Prisma.CaseWhereInput = {}

    // محدودسازی نقشی
    if (session.role === 'EMPLOYER') {
      where.companyId = session.companyId || '__none__'
      if (contractorId) where.contractorId = contractorId
    } else if (session.role === 'CONTRACTOR') {
      where.contractorId = session.contractorId || '__none__'
      if (companyId) where.companyId = companyId
    } else {
      if (companyId) where.companyId = companyId
      if (contractorId) where.contractorId = contractorId
    }
    if (projectId) where.projectId = projectId
    if (examType) where.examType = examType
    if (job) where.jobTitle = job

    // مقایسه رشته‌ای روی visitDate (شمسی صفرپر)
    const vd: Prisma.StringFilter = {}
    if (from) vd.gte = from
    if (to) vd.lte = to
    if (from || to) where.visitDate = vd

    const cases = await db.case.findMany({
      where,
      select: {
        id: true,
        personId: true,
        examType: true,
        visitDate: true,
        jobTitle: true,
        finalOpinion: true,
        completedAt: true,
        companyId: true,
        contractorId: true,
        company: { select: { name: true } },
        contractor: { select: { name: true } },
        sections: { select: { key: true, status: true, data: true } },
      },
    })

    // ─── مجموع‌ها ───
    const completed = cases.filter(isCompleted).length
    // ناقص/در جریان: هر پرونده‌ای که هنوز به نتیجه قطعی نرسیده است
    const incomplete = cases.length - completed

    // ─── ۷ ماه شمسی اخیر (شامل ماه جاری) ───
    const [curY, curM] = todayJalali().split('/').map(Number)
    const monthKeys: string[] = []
    for (let i = 0; i < 7; i++) {
      let m = curM - i
      let y = curY
      while (m <= 0) {
        m += 12
        y -= 1
      }
      monthKeys.unshift(`${y}/${String(m).padStart(2, '0')}`)
    }

    // ─── نظریه نهایی ───
    const opinionCounts: Record<string, number> = { FIT: 0, CONDITIONAL: 0, UNFIT: 0, INCOMPLETE: 0, NONE: 0 }
    for (const c of cases) {
      const k = c.finalOpinion && c.finalOpinion in opinionCounts ? c.finalOpinion : 'NONE'
      opinionCounts[k] += 1
    }
    const byFinalOpinion = (['FIT', 'CONDITIONAL', 'UNFIT', 'INCOMPLETE', 'NONE'] as const).map((key) => ({
      key,
      label: key === 'NONE' ? 'بدون نظریه نهایی' : FINAL_OPINION_LABELS[key],
      count: opinionCounts[key],
    }))

    // ─── نوع معاینه ───
    const byExamType = Object.entries(EXAM_TYPE_LABELS).map(([key, label]) => ({
      key,
      label,
      count: cases.filter((c) => c.examType === key).length,
    }))

    // ─── ماهانه ───
    const monthOf = (visitDate: string) => normJalaliDate(visitDate).slice(0, 7)
    const byMonth = monthKeys.map((mk) => {
      const inMonth = cases.filter((c) => monthOf(c.visitDate) === mk)
      return { label: mk, count: inMonth.length, completed: inMonth.filter(isCompleted).length }
    })

    // ─── شرکت‌ها / پیمانکاران / مشاغل ───
    const companyMap = new Map<string, number>()
    for (const c of cases) {
      if (c.companyId && c.company) companyMap.set(c.company.name, (companyMap.get(c.company.name) || 0) + 1)
    }
    const byCompany = [...companyMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const contractorMap = new Map<string, { count: number; completed: number }>()
    for (const c of cases) {
      if (c.contractorId && c.contractor) {
        const prev = contractorMap.get(c.contractor.name) || { count: 0, completed: 0 }
        prev.count += 1
        if (isCompleted(c)) prev.completed += 1
        contractorMap.set(c.contractor.name, prev)
      }
    }
    const byContractor = [...contractorMap.entries()]
      .map(([name, v]) => ({ name, count: v.count, completed: v.completed }))
      .sort((a, b) => b.count - a.count)

    const jobMap = new Map<string, number>()
    for (const c of cases) jobMap.set(c.jobTitle, (jobMap.get(c.jobTitle) || 0) + 1)
    const byJob = [...jobMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // ─── موارد باز + ارجاع‌های در انتظار (با computeOpenItems روی هر پرونده) ───
    const openMap = new Map<string, OpenItemGroup>()
    let pendingReferrals = 0
    for (const c of cases) {
      let openRefs = 0
      const s8 = c.sections.find((s) => s.key === 'S8')
      if (s8) {
        try {
          const parsed = JSON.parse(s8.data || '{}') as { referrals?: { resolved?: boolean }[] }
          openRefs = (parsed.referrals || []).filter((r) => r && r.resolved !== true).length
        } catch {
          openRefs = 0
        }
      }
      pendingReferrals += openRefs

      const items: OpenItem[] = computeOpenItems(c.sections, c.finalOpinion, openRefs)
      for (const it of items) {
        const label =
          it.key === 'FINAL' ? 'نظریه نهایی پزشک ثبت نشده است' : sectionTitle(it.key as SectionKey)
        const prev = openMap.get(it.key)
        if (prev) prev.count += 1
        else openMap.set(it.key, { key: it.key, label, responsibleRole: it.responsibleRole, responsibleLabel: it.responsibleLabel, count: 1 })
      }
    }

    // ترتیب خروجی: ترتیب بخش‌ها و در پایان FINAL
    const openOrder: string[] = [...SECTION_DEFS.map((d) => d.key), 'FINAL']
    const openItems: OpenItemGroup[] = openOrder
      .filter((k) => openMap.has(k))
      .map((k) => openMap.get(k)!)
    const totalOpenItems = openItems.reduce((sum, g) => sum + g.count, 0)

    // ─── ماتریس وضعیت بخش‌ها ───
    const sectionsMatrix = SECTION_DEFS.map((def) => {
      const row: { key: string; title: string } & Record<StatusKey, number> = {
        key: def.key,
        title: def.title,
        NOT_STARTED: 0,
        IN_PROGRESS: 0,
        SENT_FOR_REVIEW: 0,
        NEEDS_CORRECTION: 0,
        APPROVED: 0,
        NOT_APPLICABLE: 0,
      }
      for (const c of cases) {
        const sec = c.sections.find((s) => s.key === def.key)
        const st = (sec?.status || 'NOT_STARTED') as StatusKey
        if (st in row) row[st] += 1
      }
      return row
    })

    return NextResponse.json({
      totals: {
        cases: cases.length,
        completed,
        incomplete,
        openItems: totalOpenItems,
        pendingReferrals,
        persons: new Set(cases.map((c) => c.personId)).size,
      },
      byFinalOpinion,
      byExamType,
      byMonth,
      byCompany,
      byContractor,
      byJob,
      openItems,
      sectionsMatrix,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
