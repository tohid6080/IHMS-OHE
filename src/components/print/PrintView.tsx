'use client'

// ─── نمای چاپ/PDF استاندارد A4 — مطابق فرم پیوست ───
// فقط همین فایل؛ بدون تغییر در globals.css / store / types / api

import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, Printer } from 'lucide-react'
import { toast } from 'sonner'

import { AudiogramChart } from '@/components/common/AudiogramChart'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { apiGet } from '@/lib/api'
import {
  AUDIO_FREQS,
  DEFAULT_CENTER,
  EXAM_TYPE_LABELS,
  FACTOR_GROUPS,
  FACTOR_GROUP_LABELS,
  FINAL_OPINION_LABELS,
  GENDER_LABELS,
  LAB_GROUPS,
  MARITAL_LABELS,
  MILITARY_LABELS,
  ORGAN_SYSTEMS,
  SECTION4_QUESTIONS,
  VISION_STATUS_LABELS,
} from '@/lib/constants'
import { calcAge, toFa } from '@/lib/jalali'
import { useAppStore } from '@/lib/store'
import type {
  CaseDetailDTO,
  JobHistoryRow,
  Section2Data,
  Section3Data,
  Section4Data,
  Section5Data,
  Section6Data,
  Section7AData,
  Section7BData,
  Section7CData,
  Section7DData,
  Section8Data,
  SectionKey,
} from '@/lib/types'

// چاپ رنگ پس‌زمینه‌ها (تیترهای teal، واترمارک و...)
const COLOR = '[print-color-adjust:exact] [-webkit-print-color-adjust:exact]'
const TEAL = `bg-teal-100 text-teal-900 ${COLOR}`

const EXAM_TYPES = ['PRE_EMPLOYMENT', 'PERIODIC', 'SPECIFIC'] as const
const FACTOR_KEYS = ['physical', 'chemical', 'biological', 'ergonomic', 'psychological'] as const
const LAB_ROW_ORDER = ['cbc', 'urine', 'blood', 'virus', 'drug', 'other'] as const

// اعداد فارسی؛ خالی → رشته خالی / «—»
const v = (x: string | number | null | undefined) => (x === null || x === undefined || x === '' ? '' : toFa(x))
const dd = (x: string | number | null | undefined) => {
  const t = v(x)
  return t === '' ? '—' : t
}
const vs = (x?: string | null) => (x ? VISION_STATUS_LABELS[x] ?? '' : '')

// ─── اجزای کوچک چاپی ───

// چک‌باکس نمایشی (✓ داخل مربع) — برای چاپ
function TickBox({ on, label }: { on: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="inline-flex size-3.5 shrink-0 items-center justify-center border border-slate-700 text-[9pt] leading-none">
        {on ? '✓' : ''}
      </span>
      {label ? <span>{label}</span> : null}
    </span>
  )
}

// تیتر بخش با پس‌زمینه teal ملایم مثل PDF
function SectionBar({ children }: { children: ReactNode }) {
  return <div className={`mb-1.5 border border-slate-700 px-2 py-[3px] text-[11pt] font-bold ${TEAL}`}>{children}</div>
}

// سربرگ کوچک بالای هر صفحه مثل PDF پیوست (+ لوگوی کوچک مرکز در صفحات ادامه)
function PersonLine({ text, withLogo = true }: { text: string; withLogo?: boolean }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 border-b border-slate-500 pb-0.5 text-[8.5pt] text-slate-700">
      {withLogo ? (
        <img
          src="/images/center-logo.png"
          alt="لوگوی مرکز"
          width={18}
          height={18}
          className="inline-block size-[18px] shrink-0 object-contain"
        />
      ) : null}
      <span className="min-w-0">{text}</span>
    </div>
  )
}

function SignImg({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="inline-block h-12 max-w-[160px] object-contain" />
}

function SignOrLine({ src, alt, placeholder }: { src?: string | null; alt: string; placeholder: string }) {
  if (src) return <SignImg src={src} alt={alt} />
  return (
    <span className="inline-block min-w-32 border-b border-dashed border-slate-500 pb-0.5 text-center text-[8pt] text-slate-400">
      {placeholder}
    </span>
  )
}

// مهر و امضای تأییدکننده — امضا (h-10) + مهر (h-14 با چرخش ملایم و شفافیت ۹۰٪) بالای نام چاپی؛
// در نبود تصویر، رفتار خط جای مهر و امضا مثل قبل حفظ می‌شود
function StampAndSign({
  signature,
  stamp,
  name,
  placeholder = 'محل مهر و امضا',
}: {
  signature?: string | null
  stamp?: string | null
  name?: string | null
  placeholder?: string
}) {
  const nameLine = name ? v(name) : ''
  return (
    <span className="inline-flex flex-col items-center align-middle">
      {!signature && !stamp ? (
        <span className="inline-block min-w-32 border-b border-dashed border-slate-500 pb-0.5 text-center text-[8pt] text-slate-400">
          {placeholder}
        </span>
      ) : (
        <span className="relative inline-flex h-14 min-w-32 items-end justify-center">
          {stamp ? (
            <img
              src={stamp}
              alt="مهر تأیید"
              className="absolute bottom-0 left-1/2 h-14 w-14 -translate-x-1/2 rotate-[-8deg] object-contain opacity-90"
            />
          ) : null}
          {signature ? (
            <img src={signature} alt="امضا" className="relative z-10 h-10 max-w-[160px] translate-x-3 object-contain" />
          ) : null}
        </span>
      )}
      {nameLine ? (
        <span className="min-w-32 border-t border-slate-500 px-2 pt-px text-center text-[8.5pt] font-bold leading-4">
          {nameLine}
        </span>
      ) : null}
    </span>
  )
}

// سلول «محرمانه» برای بخش‌های با __restricted (نقش کارفرما/پیمانکار/شاغل)
function RestrictedTable({ cols = 4 }: { cols?: number }) {
  return (
    <table className="print-form-table mb-2">
      <tbody>
        <tr>
          <td colSpan={cols} className={`bg-rose-50 py-2 text-center text-[10.5pt] font-bold text-rose-700 ${COLOR}`}>
            محرمانه
          </td>
        </tr>
      </tbody>
    </table>
  )
}

// یک صفحه A4 + واترمارک «ناتمام» در حالت پیش‌نویس
function PrintPage({ draft, children }: { draft: boolean; children: ReactNode }) {
  return (
    <div className={`print-page relative ${COLOR}`}>
      {draft && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className="rotate-[-30deg] select-none text-8xl font-black text-red-600/20">ناتمام</span>
        </div>
      )}
      {children}
    </div>
  )
}

// یک ردیف جدول فرکانس‌های ادیومتری (فقط مقادیر پرشده)
function AudioFreqRow({
  label,
  row,
  srt,
  sds,
  interp,
}: {
  label: string
  row?: Record<string, string | undefined>
  srt?: string
  sds?: string
  interp?: string
}) {
  return (
    <tr className="text-center">
      <td className="bg-slate-50 text-right text-[9pt] font-semibold">{label}</td>
      {AUDIO_FREQS.map((f) => (
        <td key={f}>{v(row?.[f])}</td>
      ))}
      <td>{v(srt)}</td>
      <td>{v(sds)}</td>
      <td className="text-right text-[9pt]">{v(interp)}</td>
    </tr>
  )
}

// ─── نمای اصلی ───
export function PrintView() {
  const printCaseId = useAppStore((s) => s.printCaseId)
  const printDraft = useAppStore((s) => s.printDraft)
  const backToCases = useAppStore((s) => s.backToCases)
  const user = useAppStore((s) => s.user)

  const [detail, setDetail] = useState<CaseDetailDTO | null>(null)
  const [draftToggle, setDraftToggle] = useState(printDraft)
  // اطلاعات مرکز از تنظیمات (مقدار اولیه سمت کلاینت — این نما فقط بعد از ورود رندر می‌شود)
  const [center, setCenter] = useState<{ orgLine1?: string; orgLine2?: string; orgLine3?: string }>(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('hoyateb_center') : null
      return raw ? (JSON.parse(raw) as { orgLine1?: string; orgLine2?: string; orgLine3?: string }) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'hoyateb_center') {
        try {
          const raw = window.localStorage.getItem('hoyateb_center')
          setCenter(raw ? JSON.parse(raw) : {})
        } catch {
          /* تنظیمات نامعتبر */
        }
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  // دریافت پرونده (این نما با key روی printCaseId remount می‌شود)
  useEffect(() => {
    if (!printCaseId) return
    let alive = true
    apiGet<CaseDetailDTO>(`/api/cases/${printCaseId}`)
      .then((d) => {
        if (alive) setDetail(d)
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'خطا در دریافت اطلاعات پرونده'
        toast.error('خطا در بارگذاری پرونده چاپ', { description: msg })
        backToCases()
      })
    return () => {
      alive = false
    }
  }, [printCaseId, backToCases])

  const draft = draftToggle || (!!detail && !detail.canFinalize.ok)

  const toolbar = (
    <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-center gap-2 border-b bg-white p-3 shadow-sm">
      <Button onClick={() => window.print()}>
        <Printer /> چاپ / ذخیره PDF
      </Button>
      <Button variant="outline" onClick={backToCases}>
        <ArrowRight /> بازگشت
      </Button>
      <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
        <Checkbox checked={draftToggle} onCheckedChange={(c) => setDraftToggle(c === true)} />
        حالت پیش‌نویس
      </label>
      <span className="text-sm text-muted-foreground">در پنجره چاپ، مقصد را Save as PDF انتخاب کنید</span>
      {user ? <span className="text-xs text-muted-foreground">({user.fullName})</span> : null}
    </div>
  )

  // اسکیتلون تا رسیدن داده
  if (!detail) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-200 p-4">
        {toolbar}
        <div className="mx-auto mt-4 max-w-[210mm] space-y-3">
          <Skeleton className="h-9 w-1/2" />
          <Skeleton className="h-[280mm] w-full" />
        </div>
      </main>
    )
  }

  const c = detail.case
  const p = c.person
  const personLine = `نام و نام خانوادگی شاغل: ${p.firstName} ${p.lastName} — کد ملی شاغل: ${toFa(p.nationalId)}`

  // ─── helperهای بخش‌ها ───
  const sec = (key: SectionKey) => detail.sections.find((s) => s.key === key)
  const isRestricted = (key: SectionKey) => {
    const d = sec(key)?.data as Record<string, unknown> | undefined
    return d?.__restricted === true
  }
  const dataOf = <T,>(key: SectionKey): T | undefined => {
    if (isRestricted(key)) return undefined
    const d = sec(key)?.data as Record<string, unknown> | undefined
    return d ? (d as unknown as T) : undefined
  }
  const has = (key: SectionKey) => {
    const d = dataOf<Record<string, unknown>>(key)
    return !!d && Object.keys(d).length > 0
  }

  // مهر/امضای تأیید هر بخش (سطح DTO — هنگام تأیید بخش ثبت می‌شود)
  const secMeta = (key: SectionKey) => ({
    signature: sec(key)?.approvedSignature ?? null,
    stamp: sec(key)?.approvedStamp ?? null,
    name: sec(key)?.approvedByName ?? null,
  })

  const s2 = dataOf<Section2Data>('S2')
  const s3 = dataOf<Section3Data>('S3')
  const s4 = dataOf<Section4Data>('S4')
  const s5 = dataOf<Section5Data>('S5')
  const s6 = dataOf<Section6Data>('S6')
  const s7a = dataOf<Section7AData>('S7A')
  const s7b = dataOf<Section7BData>('S7B')
  const s7c = dataOf<Section7CData>('S7C')
  const s7d = dataOf<Section7DData>('S7D')
  const s8 = dataOf<Section8Data>('S8')

  // متادیتای تأیید بخش‌های دارای مهر و امضا
  const ap3 = secMeta('S3')
  const ap4 = secMeta('S4')
  const ap7a = secMeta('S7A')
  const ap7b = secMeta('S7B')
  const ap7c = secMeta('S7C')

  const op = c.finalOpinion ?? ''
  const age = calcAge(p.birthYear)
  const military =
    (MILITARY_LABELS[p.militaryStatus ?? ''] ?? v(p.militaryStatus)) +
    (p.militaryStatus === 'DONE' && p.militaryUnit ? ` — رشته خدمت: ${p.militaryUnit}` : '') +
    (p.militaryStatus === 'EXEMPT' && p.militaryExemption ? ` — نوع معافیت: ${p.militaryExemption}` : '')

  // سوابق شغلی (بخش ۲)
  const jobRows = (rows?: JobHistoryRow[]) =>
    rows && rows.length > 0 ? (
      rows.map((r, i) => (
        <tr key={`${i}-${r.position}`}>
          <td>{v(r.position)}</td>
          <td>{v(r.duties)}</td>
          <td className="text-center">{v(r.fromDate)}</td>
          <td className="text-center">{v(r.toDate)}</td>
          <td>{v(r.changeReason)}</td>
        </tr>
      ))
    ) : (
      <tr>
        <td colSpan={5} className="text-center text-slate-400">
          ثبت نشده
        </td>
      </tr>
    )

  // ردیف‌های آزمایش به ترتیب CBC → UA → سایر گروه‌ها (فقط مقادیر پرشده)
  const labRows = LAB_ROW_ORDER.map((k) => LAB_GROUPS.find((g) => g.key === k))
    .filter((g): g is (typeof LAB_GROUPS)[number] => !!g)
    .map((g) => ({
      key: g.key,
      label: g.label,
      items: g.fields
        .filter((f) => {
          const val = s6?.values?.[f.key]
          return val !== undefined && val !== ''
        })
        .map((f) => ({ label: f.label, value: s6?.values?.[f.key] ?? '' })),
    }))
    .filter((g) => g.items.length > 0)
  const allLabChips = labRows.flatMap((g) => g.items)

  // یافته‌های بالینی غیرطبیعی (خلاصه — بدون «بدون علامت/بدون نشانه»)
  const clinicalRows = ORGAN_SYSTEMS.filter((sys) => sys.key !== 'other').map((sys) => {
    const d = s5?.systems?.[sys.key]
    return {
      label: sys.label,
      items: [...(d?.symptoms ?? []).filter((x) => x !== 'بدون علامت'), ...(d?.signs ?? []).filter((x) => x !== 'بدون نشانه')],
      notes: d?.notes ?? '',
    }
  })
  const clinicalAny = clinicalRows.some((r) => r.items.length > 0)

  const refs = s8?.referrals ?? []

  return (
    <main dir="rtl" className="min-h-screen bg-slate-200 p-4">
      {toolbar}

      <div id="print-area" className="mt-4">
        {/* ═══════════ صفحه ۱ — سربرگ + بخش‌های ۱ تا ۳ ═══════════ */}
        <PrintPage draft={draft}>
          <PersonLine text={personLine} withLogo={false} />
          {draft && (
            <div className={`mb-2 border border-yellow-600 bg-yellow-200 px-2 py-1 text-center text-[10.5pt] font-bold text-yellow-900 ${COLOR}`}>
              این نسخه پیش‌نویس است و قابل استناد به‌عنوان گواهی نهایی نمی‌باشد
            </div>
          )}

          {/* سربرگ مرکز / عنوان / لوگو */}
          <table className="print-form-table mb-2">
            <tbody>
              <tr>
                <td className="w-[34%] text-center align-middle">
                  <div className="text-[9.5pt] font-bold leading-5">{center.orgLine1 || DEFAULT_CENTER.orgLine1}</div>
                  <div className="text-[9.5pt] font-bold leading-5">{center.orgLine2 || DEFAULT_CENTER.orgLine2}</div>
                  <div className="text-[9.5pt] font-bold leading-5">{center.orgLine3 || DEFAULT_CENTER.orgLine3}</div>
                </td>
                <td className="text-center align-middle">
                  <div className="text-[15pt] font-black">پرونده پزشکی شاغل</div>
                </td>
                <td className="w-[16%] text-center align-middle">
                  <img
                    src="/images/center-logo.png"
                    alt="لوگوی مرکز"
                    width={76}
                    height={76}
                    className="mx-auto size-[76px] rounded-full border-2 border-teal-700 bg-white object-contain"
                  />
                  <div className="mt-1 text-[9pt] font-bold text-teal-800">طب کار</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* نوع معاینات + مشخصات پرونده */}
          <table className="print-form-table mb-2 text-[9.5pt]">
            <tbody>
              <tr>
                <td className="w-[28%]">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {EXAM_TYPES.map((t) => (
                      <TickBox key={t} on={c.examType === t} label={EXAM_TYPE_LABELS[t]} />
                    ))}
                  </div>
                </td>
                <td className="whitespace-nowrap">
                  محل کار / تاریخ: <b>{v(c.workPlace)} | {v(c.visitDate)}</b>
                </td>
                <td className="whitespace-nowrap">
                  شماره پرونده: <b>{v(c.caseNumber)}</b>
                </td>
                <td className="whitespace-nowrap">
                  شماره بیمه/استخدام: <b>{v(p.insuranceNo)}</b>
                </td>
              </tr>
            </tbody>
          </table>

          {/* بخش ۱ + عکس پرسنلی */}
          <div className="mb-2 flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <SectionBar>۱- مشخصات فردی شاغل</SectionBar>
              <table className="print-form-table text-[9.5pt]">
                <tbody>
                  <tr>
                    <td className="w-[16%] bg-slate-50 font-semibold">نام و نام خانوادگی</td>
                    <td className="font-bold">{p.firstName} {p.lastName}</td>
                    <td className="w-[14%] bg-slate-50 font-semibold">کد ملی</td>
                    <td>{v(p.nationalId)}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 font-semibold">نام پدر</td>
                    <td>{v(p.fatherName)}</td>
                    <td className="bg-slate-50 font-semibold">جنسیت</td>
                    <td>{GENDER_LABELS[p.gender] ?? v(p.gender)}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 font-semibold">وضعیت تأهل</td>
                    <td>{MARITAL_LABELS[p.maritalStatus ?? ''] ?? v(p.maritalStatus)}</td>
                    <td className="bg-slate-50 font-semibold">تعداد فرزند</td>
                    <td>{p.childrenCount != null ? toFa(p.childrenCount) : ''}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 font-semibold">سال تولد</td>
                    <td>{v(p.birthYear)}</td>
                    <td className="bg-slate-50 font-semibold">سن</td>
                    <td>{age !== null ? toFa(age) : ''}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 font-semibold">وضعیت نظام وظیفه</td>
                    <td colSpan={3}>{military}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 font-semibold">تحصیلات</td>
                    <td>{v(p.education)}</td>
                    <td className="bg-slate-50 font-semibold">شماره تماس</td>
                    <td>{v(p.phone)}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 font-semibold">آدرس محل کار</td>
                    <td colSpan={3}>{v(c.workPlace)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="w-[90px] shrink-0">
              {p.photo ? (
                <img
                  src={p.photo}
                  alt="عکس پرسنلی"
                  width={90}
                  height={120}
                  className="h-[120px] w-[90px] border border-slate-600 bg-white object-cover"
                />
              ) : (
                <div className="flex h-[120px] w-[90px] items-center justify-center border border-slate-600 bg-slate-50 text-[9pt] text-slate-400">عکس</div>
              )}
            </div>
          </div>

          {/* بخش ۲ — سوابق شغلی */}
          <SectionBar>۲- سوابق شغلی</SectionBar>
          <table className="print-form-table mb-2 text-[9.5pt]">
            <thead>
              <tr className="bg-slate-100 text-center">
                <th className="w-[16%]">عنوان / سمت</th>
                <th>وظایف محوله</th>
                <th className="w-[12%]">از تاریخ</th>
                <th className="w-[12%]">تا تاریخ</th>
                <th className="w-[18%]">علت تغییر شغل</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className={`bg-teal-50 font-bold ${COLOR}`}>مشاغل فعلی</td>
              </tr>
              {jobRows(s2?.current)}
              <tr>
                <td colSpan={5} className={`bg-teal-50 font-bold ${COLOR}`}>مشاغل قبلی</td>
              </tr>
              {jobRows(s2?.previous)}
            </tbody>
          </table>

          {/* بخش ۳ — عوامل زیان‌آور */}
          <SectionBar>۳- ارزیابی عوامل زیان‌آور شغلی</SectionBar>
          {(
            [
              { label: 'عوامل زیان‌آور شغل فعلی', row: s3?.current },
              { label: 'عوامل زیان‌آور مشاغل قبلی', row: s3?.previous },
            ] as const
          ).map((t) => (
            <div key={t.label} className="mb-1">
              <div className="mb-0.5 text-[9.5pt] font-bold">{t.label}</div>
              <table className="print-form-table text-[9pt]">
                <thead>
                  <tr className="bg-slate-100 text-center">
                    {FACTOR_KEYS.map((g) => (
                      <th key={g}>{FACTOR_GROUP_LABELS[g]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="align-top">
                    {FACTOR_KEYS.map((g) => {
                      const sel = t.row?.[g] ?? []
                      const items = FACTOR_GROUPS[g].filter((item) => sel.includes(item))
                      return (
                        <td key={g}>
                          {items.length ? items.map((item) => <div key={item}>✓ {item}</div>) : <span className="text-slate-400">—</span>}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
          {v(s3?.more) ? (
            <div className="mb-1 text-[9.5pt]">
              <b>سایر:</b> {v(s3?.more)}
            </div>
          ) : null}
          <table className="print-form-table mb-2 text-[9.5pt]">
            <tbody>
              <tr>
                <td className="w-[20%] bg-slate-50 font-semibold">توضیحات اندازه‌گیری عوامل</td>
                <td>{v(s3?.measurements) || '—'}</td>
              </tr>
              <tr>
                <td className="bg-slate-50 font-semibold">نظریه کارشناس بهداشت حرفه‌ای</td>
                <td>{v(s3?.expertOpinion) || '—'}</td>
              </tr>
              <tr>
                <td className="bg-slate-50 font-semibold">نام و نام خانوادگی کارشناس بهداشت حرفه‌ای</td>
                <td>
                  <div className="flex items-center justify-between gap-4">
                    <span>تاریخ: {dd(s3?.expertDate)}</span>
                    <StampAndSign
                      signature={s3?.signature ?? ap3.signature}
                      stamp={ap3.stamp}
                      name={s3?.expertName || ap3.name}
                      placeholder="محل مهر و امضا"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </PrintPage>

        {/* ═══════════ صفحه ۲ — بخش‌های ۴ و ۵ ═══════════ */}
        <PrintPage draft={draft}>
          <PersonLine text={personLine} />

          <SectionBar>۴- سابقه شخصی، خانوادگی و پزشکی</SectionBar>
          {isRestricted('S4') ? (
            <RestrictedTable cols={5} />
          ) : (
            <>
              <table className="print-form-table mb-1 text-[9pt]">
                <thead>
                  <tr className="bg-slate-100 text-center">
                    <th className="w-[5%]">ردیف</th>
                    <th>سؤال</th>
                    <th className="w-[7%]">بلی</th>
                    <th className="w-[7%]">خیر</th>
                    <th className="w-[26%]">توضیحات</th>
                  </tr>
                </thead>
                <tbody>
                  {SECTION4_QUESTIONS.map((q, i) => {
                    const it = s4?.items?.[i]
                    return (
                      <tr key={i}>
                        <td className="text-center">{toFa(i + 1)}</td>
                        <td>{q}</td>
                        <td className="text-center">{it?.answer === 'yes' ? '✓' : ''}</td>
                        <td className="text-center">{it?.answer === 'no' ? '✓' : ''}</td>
                        <td>{v(it?.note)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="mb-2 flex items-center justify-between gap-4 text-[9.5pt]">
                <span>
                  امضا و تاریخ ثبت اظهارات شاغل فوق: <b>{dd(s4?.declaredAt)}</b>
                </span>
                <StampAndSign signature={s4?.declarationSignature} stamp={ap4.stamp} placeholder="امضای شاغل" />
              </div>
            </>
          )}

          <SectionBar>۵- معاینات</SectionBar>
          {isRestricted('S5') ? (
            <RestrictedTable cols={4} />
          ) : (
            <>
              {/* علائم حیاتی */}
              <table className="print-form-table mb-2 text-center text-[9.5pt]">
                <thead>
                  <tr className="bg-slate-100">
                    <th>تاریخ</th>
                    <th>وزن (kg)</th>
                    <th>قد (cm)</th>
                    <th>سیستولیک (mmHg)</th>
                    <th>دیاستولیک (mmHg)</th>
                    <th>نبض</th>
                    <th>BMI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{v(s5?.examDate)}</td>
                    <td>{v(s5?.weight)}</td>
                    <td>{v(s5?.height)}</td>
                    <td>{v(s5?.systolic)}</td>
                    <td>{v(s5?.diastolic)}</td>
                    <td>{v(s5?.pulse)}</td>
                    <td>{v(s5?.bmi)}</td>
                  </tr>
                </tbody>
              </table>

              {/* بلوک هر سیستم اندام */}
              <table className="print-form-table text-[9pt]">
                <thead>
                  <tr className="bg-slate-100 text-center">
                    <th className="w-[17%]">سیستم</th>
                    <th>علائم (Symptoms)</th>
                    <th>نشانه‌ها (Signs)</th>
                    <th className="w-[14%]">توضیحات</th>
                  </tr>
                </thead>
                <tbody>
                  {ORGAN_SYSTEMS.filter((sys) => sys.key !== 'other').map((sys) => {
                    const d = s5?.systems?.[sys.key]
                    const sym = (d?.symptoms ?? []).filter((x) => x !== 'بدون علامت')
                    const sgn = (d?.signs ?? []).filter((x) => x !== 'بدون نشانه')
                    const empty = sym.length === 0 && sgn.length === 0 && !v(d?.notes)
                    return (
                      <tr key={sys.key} className="align-top">
                        <td className="bg-slate-50 font-semibold">{sys.label}</td>
                        {empty ? (
                          <td colSpan={3} className="text-center text-slate-400">
                            ثبت نشده
                          </td>
                        ) : (
                          <>
                            <td>{sym.length ? sym.map((x) => `✓ ${x}`).join('، ') : 'بدون علامت'}</td>
                            <td>{sgn.length ? sgn.map((x) => `✓ ${x}`).join('، ') : 'بدون نشانه'}</td>
                            <td>{v(d?.notes)}</td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                  <tr className="align-top">
                    <td className="bg-slate-50 font-semibold">سایر موارد</td>
                    <td colSpan={3}>{v(s5?.systems?.other?.notes) || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </PrintPage>

        {/* ═══════════ صفحه ۳ — بخش‌های ۶ و ۷ ═══════════ */}
        <PrintPage draft={draft}>
          <PersonLine text={personLine} />

          <SectionBar>۶- آزمایش‌ها</SectionBar>
          <div className="mb-1 text-[9.5pt]">
            تاریخ آزمایش: <b>{dd(s6?.testDate)}</b>
          </div>
          {isRestricted('S6') ? (
            <RestrictedTable cols={2} />
          ) : labRows.length ? (
            <table className="print-form-table mb-2">
              <tbody>
                {labRows.map((g) => (
                  <tr key={g.key} className="align-top">
                    <td className="w-[16%] bg-slate-50 text-[9.5pt] font-bold">{g.label}</td>
                    <td>
                      <div className="grid grid-cols-2 gap-px text-[8.5pt] sm:grid-cols-3 print:grid-cols-6">
                        {g.items.map((it) => (
                          <div key={it.label} className="border border-slate-300 px-1 py-px">
                            {it.label}: <b>{v(it.value)}</b>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="mb-2 border border-dashed border-slate-400 px-2 py-3 text-center text-[10pt] text-slate-400">ثبت نشده</div>
          )}

          <SectionBar>۷- پاراکلینیک</SectionBar>

          {/* الف) اپتومتری */}
          <div className="mb-1 text-[10pt] font-bold">
            الف) اپتومتری{s7a?.testDate ? ` — تاریخ: ${toFa(s7a.testDate)}` : ''}
          </div>
          {isRestricted('S7A') ? (
            <RestrictedTable cols={3} />
          ) : (
            <table className="print-form-table mb-2 text-center text-[9.5pt]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="w-[24%]">مورد</th>
                  <th className="w-[38%]">چشم راست</th>
                  <th className="w-[38%]">چشم چپ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="bg-slate-50 text-right font-semibold">حدت بینایی — با اصلاح</td>
                  <td>{v(s7a?.acuityRightWith)}</td>
                  <td>{v(s7a?.acuityLeftWith)}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 text-right font-semibold">حدت بینایی — بدون اصلاح</td>
                  <td>{v(s7a?.acuityRightWithout)}</td>
                  <td>{v(s7a?.acuityLeftWithout)}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 text-right font-semibold">دید رنگی</td>
                  <td>{vs(s7a?.colorRight)}</td>
                  <td>{vs(s7a?.colorLeft)}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 text-right font-semibold">میدان بینایی</td>
                  <td>{vs(s7a?.fieldRight)}</td>
                  <td>{vs(s7a?.fieldLeft)}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 text-right font-semibold">شب‌کوری</td>
                  <td>{vs(s7a?.nightRight)}</td>
                  <td>{vs(s7a?.nightLeft)}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 text-right font-semibold">توضیحات</td>
                  <td colSpan={2} className="text-right">
                    {v(s7a?.notes) || '—'}
                  </td>
                </tr>
                <tr>
                  <td className="bg-slate-50 text-right font-semibold">امضا</td>
                  <td colSpan={2} className="text-right">
                    <div className="flex items-center justify-between gap-4">
                      <span>امضا: {v(s7a?.technicianName) || '—'}</span>
                      <StampAndSign
                        signature={s7a?.signature ?? ap7a.signature}
                        stamp={ap7a.stamp}
                        placeholder="محل مهر و امضا"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* ب) ادیومتری */}
          <div className="mb-1 text-[10pt] font-bold">
            ب) ادیومتری{s7b?.testDate ? ` — تاریخ: ${toFa(s7b.testDate)}` : ''}
          </div>
          {isRestricted('S7B') ? (
            <RestrictedTable cols={4} />
          ) : (
            <>
              <table className="print-form-table mb-1 text-center text-[9pt]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="w-[15%]">گوش / نوع</th>
                    {AUDIO_FREQS.map((f) => (
                      <th key={f}>{toFa(f)}</th>
                    ))}
                    <th className="w-[7%]">SRT</th>
                    <th className="w-[7%]">SDS</th>
                    <th className="w-[14%]">تفصیر</th>
                  </tr>
                </thead>
                <tbody>
                  <AudioFreqRow label="راست — هوایی (AC)" row={s7b?.right?.ac} srt={s7b?.srtRight} sds={s7b?.sdsRight} interp={s7b?.interpretationRight} />
                  <AudioFreqRow label="راست — استخوانی (BC)" row={s7b?.right?.bc} />
                  <AudioFreqRow label="چپ — هوایی (AC)" row={s7b?.left?.ac} srt={s7b?.srtLeft} sds={s7b?.sdsLeft} interp={s7b?.interpretationLeft} />
                  <AudioFreqRow label="چپ — استخوانی (BC)" row={s7b?.left?.bc} />
                </tbody>
              </table>
              <table className="print-form-table mb-2 text-[9.5pt]">
                <tbody>
                  <tr>
                    <td className="w-[18%] bg-slate-50 font-semibold">پرده گوش راست</td>
                    <td>{dd(s7b?.tympanicRight)}</td>
                    <td className="w-[18%] bg-slate-50 font-semibold">پرده گوش چپ</td>
                    <td>{dd(s7b?.tympanicLeft)}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 font-semibold">مجرای گوش</td>
                    <td>{dd(s7b?.canalEar)}</td>
                    <td className="bg-slate-50 font-semibold">بیماری گوش</td>
                    <td>{dd(s7b?.earDisease)}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 font-semibold">وزوز گوش</td>
                    <td>{dd(s7b?.tinnitus)}</td>
                    <td className="bg-slate-50 font-semibold">نویز شنوایی / سابقه کار با صدا</td>
                    <td>{dd(s7b?.noiseHistory)}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 font-semibold">تروما</td>
                    <td>{dd(s7b?.earTrauma)}</td>
                    <td className="bg-slate-50 font-semibold">سرگیجه</td>
                    <td>{dd(s7b?.dizziness)}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 font-semibold">توضیحات بیشتر</td>
                    <td colSpan={3}>{v(s7b?.moreNotes) || '—'}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 font-semibold">نام ادیولوژیست</td>
                    <td colSpan={3}>
                      <div className="flex items-center justify-between gap-4">
                        <b>{v(s7b?.audiologistName) || '—'}</b>
                        <StampAndSign
                          signature={s7b?.signature ?? ap7b.signature}
                          stamp={ap7b.stamp}
                          placeholder="محل امضا"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {/* ج) اسپیرومتری */}
          <div className="mb-1 text-[10pt] font-bold">
            ج) اسپیرومتری{s7c?.testDate ? ` — تاریخ: ${toFa(s7c.testDate)}` : ''}
          </div>
          {isRestricted('S7C') ? (
            <RestrictedTable cols={4} />
          ) : (
            <table className="print-form-table mb-2 text-[9.5pt]">
              <tbody>
                <tr>
                  <td className="w-[18%] bg-slate-50 font-semibold">FEV1 (مقدار / درصد)</td>
                  <td>
                    {v(s7c?.fev1Value)}
                    {s7c?.fev1Percent ? ` - ${toFa(s7c.fev1Percent)}%` : ''}
                  </td>
                  <td className="w-[18%] bg-slate-50 font-semibold">FVC (مقدار / درصد)</td>
                  <td>
                    {v(s7c?.fvcValue)}
                    {s7c?.fvcPercent ? ` - ${toFa(s7c.fvcPercent)}%` : ''}
                  </td>
                </tr>
                <tr>
                  <td className="bg-slate-50 font-semibold">FEV1/FVC (%)</td>
                  <td>{v(s7c?.fev1Fvc)}</td>
                  <td className="bg-slate-50 font-semibold">FEF</td>
                  <td>{v(s7c?.fef)}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 font-semibold">PEF</td>
                  <td>{v(s7c?.pef)}</td>
                  <td className="bg-slate-50 font-semibold">VEXT</td>
                  <td>{v(s7c?.vext)}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 font-semibold">تفصیر</td>
                  <td colSpan={3}>{v(s7c?.interpretation) || '—'}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 font-semibold">امضا</td>
                  <td colSpan={3}>
                    <div className="flex items-center justify-between gap-4">
                      <span>امضا: {v(s7c?.technicianName) || '—'}</span>
                      <StampAndSign
                        signature={s7c?.signature ?? ap7c.signature}
                        stamp={ap7c.stamp}
                        placeholder="محل امضا"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* د) سایر اقدامات */}
          <div className="mb-1 text-[10pt] font-bold">د) سایر اقدامات</div>
          {isRestricted('S7D') ? (
            <RestrictedTable cols={2} />
          ) : (
            <table className="print-form-table mb-2 text-[9.5pt]">
              <tbody>
                <tr>
                  <td className="w-[22%] bg-slate-50 font-semibold">بافت‌های CXR (P-A)</td>
                  <td>
                    {dd(s7d?.cxr)}
                    {s7d?.cxrDate ? ` (${toFa(s7d.cxrDate)})` : ''}
                  </td>
                </tr>
                <tr>
                  <td className="bg-slate-50 font-semibold">نوار قلب (ECG)</td>
                  <td>
                    {dd(s7d?.ecg)}
                    {s7d?.ecgDate ? ` (${toFa(s7d.ecgDate)})` : ''}
                  </td>
                </tr>
                <tr>
                  <td className="bg-slate-50 font-semibold">سایر موارد</td>
                  <td>{v(s7d?.others) || '—'}</td>
                </tr>
              </tbody>
            </table>
          )}
        </PrintPage>

        {/* ═══════════ صفحه ۴ — بخش‌های ۸ و ۹ ═══════════ */}
        <PrintPage draft={draft}>
          <PersonLine text={personLine} />

          <SectionBar>۸- ثبت مشاوره‌ها و نتایج ارجاع‌ها</SectionBar>
          <table className="print-form-table mb-1 text-[9.5pt]">
            <thead>
              <tr className="bg-slate-100 text-center">
                <th className="w-[13%]">تاریخ ارجاع</th>
                <th>علت ارجاع</th>
                <th className="w-[18%]">نوع تخصص</th>
                <th className="w-[28%]">نتیجه ارجاع</th>
              </tr>
            </thead>
            <tbody>
              {refs.length ? (
                refs.map((r) => (
                  <tr key={r.id}>
                    <td className="text-center">{v(r.date)}</td>
                    <td>{r.reason}</td>
                    <td>{r.specialty}</td>
                    <td>{r.resolved && r.result ? r.result : 'در انتظار تعیین تکلیف'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center text-slate-400">
                    موردی ثبت نشده است
                  </td>
                </tr>
              )}
              {v(s8?.note) ? (
                <tr>
                  <td colSpan={4}>
                    <b>توضیحات:</b> {v(s8?.note)}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <div className="mb-2 text-[8.5pt] text-slate-600">
            تذکر: نتیجه هر مشاوره / ارجاع تخصصی باید توسط پزشک معالج ثبت و تعیین تکلیف شود؛ ارجاع بدون نتیجه، مانع صدور نظریه نهایی قطعی است.
          </div>

          <SectionBar>۹- نظریه نهایی پزشک متخصص طب کار / سلامت شاغل در خصوص کار شاغل</SectionBar>
          <table className="print-form-table mb-2 text-[9.5pt]">
            <tbody>
              <tr>
                <td className="w-[5%] text-center align-middle font-bold">{op === 'FIT' ? '✓' : ''}</td>
                <td>
                  <b>بلامانع</b>
                  {op === 'FIT' && c.finalText ? <>: {c.finalText}</> : null}
                </td>
              </tr>
              <tr>
                <td className="text-center align-middle font-bold">{op === 'CONDITIONAL' ? '✓' : ''}</td>
                <td>
                  <b>مشروط</b>
                  {op === 'CONDITIONAL' && c.finalCondition ? <>: {c.finalCondition}</> : null}
                </td>
              </tr>
              <tr>
                <td className="text-center align-middle font-bold">{op === 'UNFIT' ? '✓' : ''}</td>
                <td>
                  <b>عدم صلاحیت / عدم تناسب پزشکی جهت انجام شغل مورد نظر</b>
                  {op === 'UNFIT' && c.finalReason ? <>: {c.finalReason}</> : null}
                </td>
              </tr>
              <tr>
                <td className="text-center align-middle font-bold">{op === 'INCOMPLETE' ? '✓' : ''}</td>
                <td>
                  <b>پرونده ناتمام</b>
                  {op === 'INCOMPLETE' && c.finalReason ? <>: {c.finalReason}</> : null}
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <b>توصیه‌های پزشکی:</b> {v(c.finalAdvice) || '—'}
                </td>
              </tr>
            </tbody>
          </table>
          <table className="print-form-table mb-2 text-[9.5pt]">
            <tbody>
              <tr>
                <td className="w-[20%] bg-slate-50 font-semibold">نام پزشک متخصص طب کار</td>
                <td className="font-bold">{v(c.finalDoctorName)}</td>
                <td className="w-[18%] bg-slate-50 font-semibold">کد معاینات سلامت شغلی</td>
                <td>{v(c.finalDoctorCode)}</td>
              </tr>
              <tr>
                <td className="bg-slate-50 font-semibold">تاریخ</td>
                <td>{v(c.finalDate)}</td>
                <td className="bg-slate-50 font-semibold">مهر و امضا</td>
                <td className="h-16 text-center align-middle">
                  <StampAndSign
                    signature={c.finalSignature}
                    stamp={c.finalStamp}
                    name={c.finalDoctorName}
                    placeholder="مهر و امضای پزشک"
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* اظهارنامه شاغل */}
          <div className="border border-slate-600 p-2 text-[9.5pt]">
            <p className="mb-2 leading-6">
              کلید مندرجات پرونده را مطالعه نموده و توضیحات و شروط به من اعلام شد. عواقب بروز هرگونه مشکل ناشی از عدم رعایت موارد فوق را به عهده می‌گیرم.
            </p>
            <div className="flex items-end justify-between gap-4">
              <span>
                نام و امضای شاغل: <b>{v(c.workerDeclarationName) || `${p.firstName} ${p.lastName}`}</b>
              </span>
              <SignOrLine src={c.workerDeclaration} alt="امضای شاغل" placeholder="امضای شاغل" />
            </div>
          </div>
        </PrintPage>

        {/* ═══════════ صفحه ۵ — ادیوگرام ═══════════ */}
        <PrintPage draft={draft}>
          <PersonLine text={personLine} />
          <SectionBar>ادیوگرام</SectionBar>
          {isRestricted('S7B') ? (
            <RestrictedTable cols={4} />
          ) : (
            <>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[9.5pt]">
                <span>
                  تاریخ آزمایش: <b>{dd(s7b?.testDate)}</b>
                </span>
                <span>
                  نام ادیولوژیست: <b>{v(s7b?.audiologistName) || '—'}</b>
                </span>
              </div>
              <AudiogramChart compact right={s7b?.right ?? { ac: {}, bc: {} }} left={s7b?.left ?? { ac: {}, bc: {} }} />
              <table className="print-form-table mt-2 text-[9.5pt]">
                <tbody>
                  <tr>
                    <td className="w-[16%] bg-slate-50 font-semibold">تفصیر گوش راست</td>
                    <td>{dd(s7b?.interpretationRight)}</td>
                    <td className="w-[16%] bg-slate-50 font-semibold">تفصیر گوش چپ</td>
                    <td>{dd(s7b?.interpretationLeft)}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 font-semibold">پرده گوش راست</td>
                    <td>{dd(s7b?.tympanicRight)}</td>
                    <td className="bg-slate-50 font-semibold">پرده گوش چپ</td>
                    <td>{dd(s7b?.tympanicLeft)}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 font-semibold">مجرای گوش</td>
                    <td>{dd(s7b?.canalEar)}</td>
                    <td className="bg-slate-50 font-semibold">بیماری گوش</td>
                    <td>{dd(s7b?.earDisease)}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 font-semibold">وزوز گوش</td>
                    <td>{dd(s7b?.tinnitus)}</td>
                    <td className="bg-slate-50 font-semibold">نویز شنوایی / سابقه کار با صدا</td>
                    <td>{dd(s7b?.noiseHistory)}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 font-semibold">تروما</td>
                    <td>{dd(s7b?.earTrauma)}</td>
                    <td className="bg-slate-50 font-semibold">سرگیجه</td>
                    <td>{dd(s7b?.dizziness)}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 font-semibold">توضیحات بیشتر</td>
                    <td colSpan={3}>{v(s7b?.moreNotes) || '—'}</td>
                  </tr>
                </tbody>
              </table>
              {!has('S7B') ? <div className="mt-1 text-center text-[9.5pt] text-slate-400">ادیوگرامی ثبت نشده است</div> : null}
            </>
          )}
        </PrintPage>

        {/* ═══════════ صفحه ۶ — خلاصه نتایج معاینات پزشکی ═══════════ */}
        <PrintPage draft={draft}>
          <PersonLine text={personLine} />
          <SectionBar>خلاصه نتایج معاینات پزشکی</SectionBar>

          {/* سربرگ کوچک */}
          <table className="print-form-table mb-2 text-[9pt]">
            <tbody>
              <tr>
                <td className="w-[14%] bg-slate-50 font-semibold">نوع معاینات</td>
                <td colSpan={3}>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {EXAM_TYPES.map((t) => (
                      <TickBox key={t} on={c.examType === t} label={EXAM_TYPE_LABELS[t]} />
                    ))}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="bg-slate-50 font-semibold">تاریخ</td>
                <td>{v(c.visitDate)}</td>
                <td className="w-[14%] bg-slate-50 font-semibold">کد ملی</td>
                <td>{v(p.nationalId)}</td>
              </tr>
              <tr>
                <td className="bg-slate-50 font-semibold">نام و نام خانوادگی</td>
                <td className="font-bold">{p.firstName} {p.lastName}</td>
                <td className="bg-slate-50 font-semibold">نام پدر</td>
                <td>{v(p.fatherName)}</td>
              </tr>
              <tr>
                <td className="bg-slate-50 font-semibold">جنسیت</td>
                <td>{GENDER_LABELS[p.gender] ?? v(p.gender)}</td>
                <td className="bg-slate-50 font-semibold">شماره همراه</td>
                <td>{v(p.phone)}</td>
              </tr>
              <tr>
                <td className="bg-slate-50 font-semibold">وضعیت تأهل</td>
                <td>{MARITAL_LABELS[p.maritalStatus ?? ''] ?? v(p.maritalStatus)}</td>
                <td className="bg-slate-50 font-semibold">تعداد فرزند</td>
                <td>{p.childrenCount != null ? toFa(p.childrenCount) : ''}</td>
              </tr>
              <tr>
                <td className="bg-slate-50 font-semibold">سال تولد</td>
                <td>{v(p.birthYear)}</td>
                <td className="bg-slate-50 font-semibold">سن</td>
                <td>{age !== null ? toFa(age) : ''}</td>
              </tr>
              <tr>
                <td className="bg-slate-50 font-semibold">واحد کاری</td>
                <td>{v(c.workUnit)}</td>
                <td className="bg-slate-50 font-semibold">عنوان شغل</td>
                <td>{v(c.jobTitle)}</td>
              </tr>
            </tbody>
          </table>

          {/* مشخصات فیزیولوژیک */}
          <div className="mb-1 text-[10pt] font-bold">مشخصات فیزیولوژیک</div>
          {isRestricted('S5') ? (
            <RestrictedTable cols={5} />
          ) : (
            <table className="print-form-table mb-2 text-center text-[9pt]">
              <tbody>
                <tr>
                  <td className="bg-slate-50 font-semibold">وزن (kg)</td>
                  <td>{v(s5?.weight)}</td>
                  <td className="bg-slate-50 font-semibold">قد (cm)</td>
                  <td>{v(s5?.height)}</td>
                  <td className="bg-slate-50 font-semibold">BMI</td>
                  <td>{v(s5?.bmi)}</td>
                  <td className="bg-slate-50 font-semibold">نبض</td>
                  <td>{v(s5?.pulse)}</td>
                  <td className="bg-slate-50 font-semibold">فشار خون (mmHg)</td>
                  <td>
                    {v(s5?.systolic)}
                    {s5?.systolic || s5?.diastolic ? ' / ' : ''}
                    {v(s5?.diastolic)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* یافته‌های بالینی */}
          <div className="mb-1 text-[10pt] font-bold">یافته‌های بالینی</div>
          {isRestricted('S5') ? (
            <RestrictedTable cols={2} />
          ) : (
            <div className="mb-2 border border-slate-700 px-2 py-1 text-[9.5pt] leading-6">
              {clinicalAny
                ? clinicalRows
                    .filter((r) => r.items.length > 0)
                    .map((r) => (
                      <div key={r.label}>
                        <b>{r.label}:</b> {r.items.join('، ')}
                        {r.notes ? ` — ${r.notes}` : ''}
                      </div>
                    ))
                : 'یافته غیرطبیعی ثبت نشده'}
            </div>
          )}

          {/* ادیومتری / اپتومتری */}
          <div className="mb-2 grid grid-cols-2 gap-2 text-[9pt]">
            <table className="print-form-table">
              <tbody>
                <tr>
                  <td colSpan={2} className={`${TEAL} text-center font-bold`}>تست شنوایی (ادیومتری)</td>
                </tr>
                <tr>
                  <td className="w-[36%] bg-slate-50 font-semibold">گوش راست</td>
                  <td>{isRestricted('S7B') ? 'محرمانه' : dd(s7b?.interpretationRight)}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 font-semibold">گوش چپ</td>
                  <td>{isRestricted('S7B') ? 'محرمانه' : dd(s7b?.interpretationLeft)}</td>
                </tr>
              </tbody>
            </table>
            <table className="print-form-table">
              <tbody>
                <tr>
                  <td colSpan={2} className={`${TEAL} text-center font-bold`}>تست بینایی (اپتومتری)</td>
                </tr>
                <tr>
                  <td className="w-[36%] bg-slate-50 font-semibold">راست — با اصلاح</td>
                  <td>{isRestricted('S7A') ? 'محرمانه' : v(s7a?.acuityRightWith)}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 font-semibold">راست — بدون اصلاح</td>
                  <td>{isRestricted('S7A') ? 'محرمانه' : v(s7a?.acuityRightWithout)}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 font-semibold">چپ — با اصلاح</td>
                  <td>{isRestricted('S7A') ? 'محرمانه' : v(s7a?.acuityLeftWith)}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 font-semibold">چپ — بدون اصلاح</td>
                  <td>{isRestricted('S7A') ? 'محرمانه' : v(s7a?.acuityLeftWithout)}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 font-semibold">دید رنگی / میدان بینایی</td>
                  <td>
                    {isRestricted('S7A')
                      ? 'محرمانه'
                      : `رنگی راست: ${vs(s7a?.colorRight) || '—'} | رنگی چپ: ${vs(s7a?.colorLeft) || '—'} | میدان راست: ${vs(s7a?.fieldRight) || '—'} | میدان چپ: ${vs(s7a?.fieldLeft) || '—'}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* اسپیرومتری / نوار قلب و بافت‌ها */}
          <div className="mb-2 grid grid-cols-2 gap-2 text-[9pt]">
            <table className="print-form-table">
              <tbody>
                <tr>
                  <td colSpan={2} className={`${TEAL} text-center font-bold`}>تست ریوی (اسپیرومتری)</td>
                </tr>
                <tr>
                  <td className="w-[36%] bg-slate-50 font-semibold">تفصیر</td>
                  <td>{isRestricted('S7C') ? 'محرمانه' : dd(s7c?.interpretation)}</td>
                </tr>
                <tr>
                  <td className="bg-slate-50 font-semibold">FEV1 / FVC</td>
                  <td>
                    {isRestricted('S7C')
                      ? 'محرمانه'
                      : `${dd(s7c?.fev1Value)} / ${dd(s7c?.fvcValue)} — ${dd(s7c?.fev1Fvc)}%`}
                  </td>
                </tr>
              </tbody>
            </table>
            <table className="print-form-table">
              <tbody>
                <tr>
                  <td colSpan={2} className={`${TEAL} text-center font-bold`}>نوار قلب و بافت‌های بالینی</td>
                </tr>
                <tr>
                  <td className="w-[36%] bg-slate-50 font-semibold">نوار قلب (ECG)</td>
                  <td>
                    {isRestricted('S7D')
                      ? 'محرمانه'
                      : `${dd(s7d?.ecg)}${s7d?.ecgDate ? ` (${toFa(s7d.ecgDate)})` : ''}`}
                  </td>
                </tr>
                <tr>
                  <td className="bg-slate-50 font-semibold">بافت‌های CXR (P-A)</td>
                  <td>
                    {isRestricted('S7D')
                      ? 'محرمانه'
                      : `${dd(s7d?.cxr)}${s7d?.cxrDate ? ` (${toFa(s7d.cxrDate)})` : ''}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* آزمایشات غیر نرمال */}
          <div className="mb-1 text-[10pt] font-bold">آزمایشات غیر نرمال</div>
          {isRestricted('S6') ? (
            <RestrictedTable cols={1} />
          ) : allLabChips.length ? (
            <table className="print-form-table mb-2 text-[8.5pt]">
              <tbody>
                <tr>
                  <td>
                    <div className="grid grid-cols-2 gap-px sm:grid-cols-3 print:grid-cols-6">
                      {allLabChips.map((it, i) => (
                        <div key={`${it.label}-${i}`} className="border border-slate-300 px-1 py-px">
                          {it.label}: <b>{v(it.value)}</b>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="mb-2 border-b border-dashed border-slate-500" />
          )}

          {/* ارجاعات + توصیه‌ها */}
          <table className="print-form-table mb-2 text-[9.5pt]">
            <tbody>
              <tr className="align-top">
                <td className="w-[16%] bg-slate-50 font-semibold">ارجاعات</td>
                <td>
                  {refs.length
                    ? refs.map((r) => (
                        <div key={r.id}>
                          • {dd(r.date)} — {r.reason} ({r.specialty}):{' '}
                          {r.resolved && r.result ? r.result : 'در انتظار تعیین تکلیف'}
                        </div>
                      ))
                    : 'ندارد'}
                </td>
              </tr>
              <tr>
                <td className="bg-slate-50 font-semibold">توصیه‌های پزشکی</td>
                <td>{v(c.finalAdvice) || '—'}</td>
              </tr>
            </tbody>
          </table>

          {/* نظریه پزشک طب کار */}
          <div className="mb-1 text-[10pt] font-bold">نظریه پزشک طب کار</div>
          <table className="print-form-table mb-2 text-[9.5pt]">
            <tbody>
              <tr>
                <td className="w-[16%] bg-slate-50 font-semibold">نظریه</td>
                <td className="font-bold">{FINAL_OPINION_LABELS[op] ?? '—'}</td>
              </tr>
              {c.finalText ? (
                <tr>
                  <td className="bg-slate-50 font-semibold">متن نظریه</td>
                  <td>{c.finalText}</td>
                </tr>
              ) : null}
              {op === 'FIT' ? (
                <tr>
                  <td className="bg-slate-50 font-semibold">جمع‌بندی</td>
                  <td className="font-bold">اشتغال به کار بلامانع است.</td>
                </tr>
              ) : null}
            </tbody>
          </table>

          {/* پانویس ثابت */}
          <div className="border-t border-slate-500 pt-1 text-[9pt] leading-6">
            کلید مندرجات پرونده را مطالعه نموده و توضیحات و شروط به من اعلام شد. عواقب بروز هرگونه مشکل ناشی از عدم رعایت موارد فوق را به عهده می‌گیرم. امضای شاغل:{' '}
            <span className="inline-block w-40 border-b border-dashed border-slate-500 align-middle">&nbsp;</span>
          </div>
        </PrintPage>

        {/* ═══════════ صفحه ۷ — فرم آزمایشات فردی ═══════════ */}
        <PrintPage draft={draft}>
          <PersonLine text={personLine} />
          <SectionBar>فرم آزمایشات فردی</SectionBar>
          <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-[9.5pt]">
            <span>
              نام و نام خانوادگی: <b>{p.firstName} {p.lastName}</b>
            </span>
            <span>
              کد ملی: <b>{v(p.nationalId)}</b>
            </span>
            <span>
              شماره همراه: <b>{v(p.phone)}</b>
            </span>
            <span>
              تاریخ آزمایش: <b>{dd(s6?.testDate)}</b>
            </span>
          </div>
          {isRestricted('S6') ? (
            <RestrictedTable cols={2} />
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
              {LAB_GROUPS.map((g) => (
                <table key={g.key} className="print-form-table text-[9pt]">
                  <thead>
                    <tr>
                      <th colSpan={2} className={`${TEAL} text-center`}>
                        {g.label}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.fields.map((f) => {
                      const val = s6?.values?.[f.key]
                      return (
                        <tr key={f.key}>
                          <td className="w-1/2">{f.label}</td>
                          <td className="w-1/2">{val ? <b>{v(val)}</b> : ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ))}
            </div>
          )}
        </PrintPage>
      </div>
    </main>
  )
}
