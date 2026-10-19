'use client'

// ─── مؤلفه عکس پرسنلی: عکس‌برداری با وب‌کم + انتخاب فایل، خروجی dataURL با نسبت ۳:۴ ───
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Camera, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react'

interface PhotoCaptureProps {
  value: string // dataURL یا ''
  onChange: (dataUrl: string) => void
  disabled?: boolean
  width?: number  // پهنای کادر پیش‌نمایش (پیش‌فرض ۹۰)
  height?: number // بلندی کادر پیش‌نمایش (پیش‌فرض ۱۲۰)
}

// سقف حجم dataURL خروجی (~۱۵۰ هزار نویسه ≈ ۱۱۰ کیلوبایت)
const MAX_URL_LEN = 150_000
// حداکثر بلندی خروجی نهایی
const MAX_OUT_H = 480

// برش ۳:۴ از مرکز تصویر مبدأ + کاهش مقیاس تا بلندی ۴۸۰ + خروجی JPEG با کیفیت مناسب
// mirror = آینه‌افقی (برای عکس وب‌کم تا مثل آینه دیده شود)
function cropToDataURL(
  source: HTMLVideoElement | HTMLImageElement,
  sw: number,
  sh: number,
  mirror = false,
): string {
  // برش نسبت ۳:۴ از مرکز
  let cw = sw
  let ch = sh
  if (sw / sh > 3 / 4) cw = Math.round(sh * (3 / 4))
  else ch = Math.round(sw / (3 / 4))
  const sx = Math.round((sw - cw) / 2)
  const sy = Math.round((sh - ch) / 2)
  // کاهش مقیاس تا حداکثر بلندی ۴۸۰ پیکسل (هرگز بزرگ‌نمایی نمی‌کنیم)
  const scale = Math.min(1, MAX_OUT_H / ch)
  const w = Math.max(1, Math.round(cw * scale))
  const h = Math.max(1, Math.round(ch * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.imageSmoothingQuality = 'high'
  if (mirror) {
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(source, sx, sy, cw, ch, 0, 0, w, h)
  // تضمین حجم خروجی: در صورت نیاز کیفیت پله‌پله کم می‌شود
  for (const q of [0.85, 0.75, 0.6] as const) {
    const url = canvas.toDataURL('image/jpeg', q)
    if (url.length <= MAX_URL_LEN) return url
  }
  return canvas.toDataURL('image/jpeg', 0.5)
}

export function PhotoCapture({
  value,
  onChange,
  disabled = false,
  width = 90,
  height = 120,
}: PhotoCaptureProps) {
  const [camOpen, setCamOpen] = useState(false)
  const [camReady, setCamReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // قطع کامل دسترسی وب‌کم (همه ترک‌ها) — idempotent
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  // شروع وب‌کم هنگام باز شدن دیالوگ + قطع هنگام بستن
  useEffect(() => {
    if (!camOpen) return
    let cancelled = false
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          v.play().catch(() => {})
        }
      } catch {
        // اجازه دسترسی داده نشد یا دستگاه در دسترس نیست
        toast.error('دسترسی به وب‌کم ممکن نیست')
        setCamOpen(false)
      }
    }
    void start()
    return () => {
      cancelled = true
      stopStream()
    }
  }, [camOpen, stopStream])

  // قطع دسترسی وب‌کم هنگام حذف مؤلفه از صفحه
  useEffect(() => () => stopStream(), [stopStream])

  const openCamera = () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast.error('دسترسی به وب‌کم ممکن نیست')
      return
    }
    setCamReady(false)
    setCamOpen(true)
  }

  const closeCamera = () => {
    stopStream()
    setCamOpen(false)
  }

  const capture = () => {
    const v = videoRef.current
    if (!v || !v.videoWidth || !v.videoHeight) {
      toast.error('تصویر وب‌کم آماده نیست')
      return
    }
    const url = cropToDataURL(v, v.videoWidth, v.videoHeight, true)
    if (url) onChange(url)
    closeCamera()
  }

  const onFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('فقط فایل تصویر قابل پذیرش است')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const url = cropToDataURL(img, img.naturalWidth, img.naturalHeight)
        if (url) onChange(url)
        else toast.error('پردازش تصویر ممکن نشد')
      }
      img.onerror = () => toast.error('فایل تصویر معتبر نیست')
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const btn = 'h-7 px-2 text-xs'

  return (
    <div dir="rtl" className="inline-flex flex-col items-start gap-2">
      {/* کادر پیش‌نمایش ۳:۴ مثل عکس پرسنلی */}
      <div
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50"
        style={{ width, height }}
      >
        {value ? (
          <img src={value} alt="عکس پرسنلی" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 p-1 text-center text-slate-400">
            <Camera className="size-5" />
            <span className="text-[11px] leading-tight">عکس پرسنلی</span>
          </div>
        )}
      </div>

      {/* ورودی فایل پنهان */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          onFile(e.target.files?.[0])
          e.target.value = '' // اجازه انتخاب دوباره همان فایل
        }}
      />

      {!value ? (
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" size="sm" variant="outline" className={btn} onClick={openCamera} disabled={disabled}>
            <Camera className="size-3.5" />
            عکس‌برداری با وب‌کم
          </Button>
          <Button type="button" size="sm" variant="outline" className={btn} onClick={() => fileRef.current?.click()} disabled={disabled}>
            <Upload className="size-3.5" />
            انتخاب از کامپیوتر
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" size="sm" variant="outline" className={btn} onClick={openCamera} disabled={disabled}>
            <RefreshCw className="size-3.5" />
            عکس‌برداری مجدد
          </Button>
          <Button type="button" size="sm" variant="outline" className={btn} onClick={() => fileRef.current?.click()} disabled={disabled}>
            <Upload className="size-3.5" />
            جایگزینی
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={`${btn} text-rose-600 hover:bg-rose-50 hover:text-rose-700`}
            onClick={() => onChange('')}
            disabled={disabled}
          >
            <Trash2 className="size-3.5" />
            حذف عکس
          </Button>
        </div>
      )}

      {/* دیالوگ عکس‌برداری با وب‌کم */}
      <Dialog open={camOpen} onOpenChange={(open) => { if (!open) closeCamera(); else setCamOpen(true) }}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="size-4 text-teal-600" />
              عکس‌برداری با وب‌کم
            </DialogTitle>
            <DialogDescription>صورت خود را داخل چهارچوب قرار دهید و دکمه «ثبت عکس» را بزنید.</DialogDescription>
          </DialogHeader>
          <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-lg border bg-slate-900" style={{ aspectRatio: '4 / 3' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => setCamReady(true)}
              className="h-full w-full -scale-x-100 object-cover"
            />
            {/* راهنمای محل برش ۳:۴ */}
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[56.25%] -translate-x-1/2 rounded-md border-2 border-dashed border-white/60" />
            {!camReady && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-900/70 text-xs text-slate-200">
                <Loader2 className="size-4 animate-spin" />
                در حال اتصال به وب‌کم…
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" onClick={capture} disabled={!camReady}>
              <Camera className="size-4" />
              ثبت عکس
            </Button>
            <Button type="button" variant="outline" onClick={closeCamera}>
              انصراف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
