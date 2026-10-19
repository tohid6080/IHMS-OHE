'use client'

import { toFa, JALALI_MONTHS, isValidJalali, currentJalaliYear } from '@/lib/jalali'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  value: string // مثل 1405/07/06 یا ''
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

function parse(v: string): { y: string; m: string; d: string } {
  const parts = (v || '').split('/')
  if (parts.length === 3) return { y: parts[0], m: String(Number(parts[1])), d: String(Number(parts[2])) }
  return { y: '', m: '', d: '' }
}

export function JalaliDateInput({ value, onChange, placeholder = 'انتخاب تاریخ', disabled, className = '' }: Props) {
  const { y, m, d } = parse(value)
  const thisYear = currentJalaliYear()
  const years = Array.from({ length: thisYear - 1300 + 2 }, (_, i) => thisYear + 1 - i)
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const valid = !value || isValidJalali(value)

  const update = (ny: string, nm: string, nd: string) => {
    if (!ny || !nm || !nd) {
      onChange('')
      return
    }
    onChange(`${ny}/${String(Number(nm)).padStart(2, '0')}/${String(Number(nd)).padStart(2, '0')}`)
  }

  return (
    <div className={`flex items-center gap-1 ${className}`} dir="rtl">
      <Select value={d} onValueChange={(v) => update(y, m, v)} disabled={disabled}>
        <SelectTrigger size="sm" className={`h-8 w-[68px] text-xs ${!valid ? 'border-rose-400' : ''}`} aria-label="روز">
          <SelectValue placeholder="روز" />
        </SelectTrigger>
        <SelectContent dir="rtl" className="max-h-64">
          {days.map((day) => (
            <SelectItem key={day} value={String(day)}>{toFa(day)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={m} onValueChange={(v) => update(y, v, d || '1')} disabled={disabled}>
        <SelectTrigger size="sm" className={`h-8 w-[100px] text-xs ${!valid ? 'border-rose-400' : ''}`} aria-label="ماه">
          <SelectValue placeholder={placeholder.slice(0, 8)} />
        </SelectTrigger>
        <SelectContent dir="rtl" className="max-h-64">
          {JALALI_MONTHS.map((mo, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>{mo}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={y} onValueChange={(v) => update(v, m || '1', d || '1')} disabled={disabled}>
        <SelectTrigger size="sm" className={`h-8 w-[88px] text-xs ${!valid ? 'border-rose-400' : ''}`} aria-label="سال">
          <SelectValue placeholder="سال" />
        </SelectTrigger>
        <SelectContent dir="rtl" className="max-h-64">
          {years.map((yr) => (
            <SelectItem key={yr} value={String(yr)}>{toFa(yr)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
