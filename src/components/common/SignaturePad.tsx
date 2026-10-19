'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Eraser, PenLine } from 'lucide-react'

interface Props {
  value: string // dataURL یا ''
  onChange: (v: string) => void
  label?: string
  disabled?: boolean
}

// بوم امضای الکترونیکی
export function SignaturePad({ value, onChange, label = 'امضا', disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (value) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      img.src = value
    }
  }, [value])

  const pos = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvasRef.current!.width,
      y: ((e.clientY - rect.top) / rect.height) * canvasRef.current!.height,
    }
  }

  const start = (e: React.PointerEvent) => {
    if (disabled) return
    drawing.current = true
    last.current = pos(e)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || disabled) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const p = pos(e)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(last.current!.x, last.current!.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
  }
  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL('image/png'))
  }
  const clear = () => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
    onChange('')
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1"><PenLine className="size-3" /> {label}</span>
        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clear} disabled={disabled}>
          <Eraser className="size-3" /> پاک کردن
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        width={420}
        height={120}
        className="w-full max-w-[420px] h-[110px] rounded-md border border-dashed border-slate-300 bg-white touch-none cursor-crosshair"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
    </div>
  )
}
