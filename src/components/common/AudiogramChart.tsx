'use client'

// نمودار شنوایی (ادیوگرام) — مطابق استاندارد: گوش راست دایره قرمز، گوش چپ ضربدر آبی
interface Row {
  ac: Record<string, string>
  bc: Record<string, string>
}
interface Props {
  right: Row
  left: Row
  compact?: boolean
}

const FREQS = ['250', '500', '1000', '2000', '3000', '4000', '6000', '8000']
const DBS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

const W = 340
const H = 210
const mL = 34
const mT = 22
const cw = (W - mL - 8) / FREQS.length
const ch = (H - mT - 12) / (DBS.length - 1)

const xAt = (i: number) => mL + i * cw + cw / 2
function yAt(db: number): number {
  const idx = DBS.indexOf(db)
  if (idx < 0) return mT + ch * 2.5
  return mT + idx * ch
}
function yOf(v: string): number | null {
  if (!v || v.trim() === '') return null
  const n = Number(v)
  if (isNaN(n)) return null
  if (n < DBS[0]) return yAt(DBS[0])
  if (n > DBS[DBS.length - 1]) return yAt(DBS[DBS.length - 1])
  const lo = Math.floor(n / 10) * 10
  const hi = lo + 10
  const t = (n - lo) / 10
  return yAt(lo) * (1 - t) + yAt(hi) * t
}

function linePts(row: Row, mode: 'ac' | 'bc'): string {
  const pts: string[] = []
  FREQS.forEach((f, i) => {
    const yy = yOf(row[mode]?.[f])
    if (yy !== null) pts.push(`${xAt(i)},${yy}`)
  })
  return pts.join(' ')
}

function Panel({ row, label, color, symbol }: { row: Row; label: string; color: string; symbol: 'circle' | 'cross' }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[420px]" role="img" aria-label={`ادیوگرام ${label}`}>
      <text x={W / 2} y={12} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#334155">{label}</text>
      {DBS.map((db, i) => (
        <g key={db}>
          <line x1={mL} y1={mT + i * ch} x2={W - 6} y2={mT + i * ch} stroke="#dbe4ec" strokeWidth="1" />
          <text x={mL - 4} y={mT + i * ch + 3} textAnchor="end" fontSize="8.5" fill="#64748b">{db}</text>
        </g>
      ))}
      {FREQS.map((f, i) => (
        <g key={f}>
          <line x1={mL + i * cw} y1={mT} x2={mL + i * cw} y2={H - 12} stroke="#dbe4ec" strokeWidth="1" />
          <text x={mL + i * cw + cw / 2} y={H - 2} textAnchor="middle" fontSize="8" fill="#64748b">{f}</text>
        </g>
      ))}
      <text x={2} y={mT - 8} fontSize="8.5" fill="#475569">dB</text>
      <text x={W - 6} y={H - 2} textAnchor="end" fontSize="8" fill="#475569">Hz</text>
      {linePts(row, 'ac') && <polyline points={linePts(row, 'ac')} fill="none" stroke={color} strokeWidth="1.6" />}
      {linePts(row, 'bc') && <polyline points={linePts(row, 'bc')} fill="none" stroke={color} strokeWidth="1.4" strokeDasharray="4 3" />}
      {FREQS.map((f, i) => {
        const yyAc = yOf(row.ac?.[f])
        const yyBc = yOf(row.bc?.[f])
        return (
          <g key={f}>
            {yyAc !== null && symbol === 'circle' && <circle cx={xAt(i)} cy={yyAc} r="4.6" fill="none" stroke={color} strokeWidth="2" />}
            {yyAc !== null && symbol === 'cross' && (
              <g stroke={color} strokeWidth="2">
                <line x1={xAt(i) - 4} y1={yyAc - 4} x2={xAt(i) + 4} y2={yyAc + 4} />
                <line x1={xAt(i) - 4} y1={yyAc + 4} x2={xAt(i) + 4} y2={yyAc - 4} />
              </g>
            )}
            {yyBc !== null && (
              <path
                d={`M ${xAt(i) - 4} ${yyBc} L ${xAt(i)} ${yyBc - 3.5} L ${xAt(i) + 4} ${yyBc} L ${xAt(i)} ${yyBc + 3.5} Z`}
                fill="none"
                stroke={color}
                strokeWidth="1.6"
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}

export function AudiogramChart({ right, left, compact }: Props) {
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'}`}>
      <Panel row={right} label="گوش راست (Right Ear)" color="#dc2626" symbol="circle" />
      <Panel row={left} label="گوش چپ (Left Ear)" color="#2563eb" symbol="cross" />
    </div>
  )
}
