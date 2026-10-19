// ─── تبدیل تاریخ شمسی/میلادی و اعداد فارسی ───
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

export function toFa(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return ''
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)])
}

export function toEn(input: string): string {
  if (!input) return ''
  let out = input
  for (let i = 0; i < 10; i++) out = out.split(FA_DIGITS[i]).join(String(i))
  return out
}

function div(a: number, b: number) { return ~~(a / b) }

// میلادی → شمسی
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  let jy = gy <= 1600 ? 0 : 979
  gy -= gy <= 1600 ? 621 : 1600
  const gy2 = gm > 2 ? gy + 1 : gy
  let days = 365 * gy + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400) - 80 + gd + g_d_m[gm - 1]
  jy += 33 * div(days, 12053)
  days %= 12053
  jy += 4 * div(days, 1461)
  days %= 1461
  if (days > 365) {
    jy += div(days - 1, 365)
    days = (days - 1) % 365
  }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30)
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30)
  return [jy, jm, jd]
}

// شمسی → میلادی
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = jy <= 979 ? 621 : 1600
  jy -= jy <= 979 ? 0 : 979
  let days = 365 * jy + div(jy, 33) * 8 + div((jy % 33) + 3, 4) + 78 + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186)
  gy += 400 * div(days, 146097)
  days %= 146097
  if (days > 36524) {
    gy += 100 * div(--days, 36524)
    days %= 36524
    if (days >= 365) days++
  }
  gy += 4 * div(days, 1461)
  days %= 1461
  if (days > 365) {
    gy += div(days - 1, 365)
    days = (days - 1) % 365
  }
  let gd = days + 1
  const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let gm = 0
  for (gm = 1; gm <= 12 && gd > sal_a[gm]; gm++) gd -= sal_a[gm]
  return [gy, gm, gd]
}

export const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']

// ISO (میلادی) → رشته شمسی مثل 1405/07/06
export function isoToJalali(iso: string | Date | null | undefined): string {
  if (!iso) return ''
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (isNaN(d.getTime())) return ''
  const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`
}

// رشته شمسی 1405/07/06 → Date میلادی (ابتدای روز به وقت تهران +03:30)
export function jalaliToISO(jalali: string): string | null {
  const s = toEn(jalali).trim().replace(/-/g, '/')
  const m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  const [gy, gm, gd] = jalaliToGregorian(Number(m[1]), Number(m[2]), Number(m[3]))
  const d = new Date(Date.UTC(gy, gm - 1, gd, 0, 0, 0))
  return d.toISOString()
}

export function todayJalali(): string {
  const now = new Date(Date.now() + 3.5 * 3600 * 1000) // تهران UTC+3:30
  return isoToJalali(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())))
}

export function currentJalaliYear(): number {
  return Number(todayJalali().split('/')[0])
}

export function formatJalaliDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${toFa(isoToJalali(d))} - ${toFa(hh)}:${toFa(mm)}`
}

// اعتبارسنجی رشته شمسی
export function isValidJalali(s: string): boolean {
  const v = toEn(s).trim().replace(/-/g, '/')
  if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(v)) return false
  const [y, m, d] = v.split('/').map(Number)
  if (y < 1300 || y > 1500 || m < 1 || m > 12 || d < 1 || d > 31) return false
  if (m > 6 && d > 30) return false
  return true
}

// محاسبه سن از سال تولد شمسی
export function calcAge(birthYear?: string | null): number | null {
  if (!birthYear) return null
  const by = Number(toEn(birthYear))
  if (!by || by < 1280 || by > 1420) return null
  return currentJalaliYear() - by
}
