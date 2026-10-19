'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw } from 'lucide-react'

// مرز خطای سطح مسیر — به‌جای صفحه سفید، پیام فارسی و دکمه تلاش مجدد نشان می‌دهد
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[App Error]', error)
  }, [error])

  return (
    <main
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-background p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-sm p-6 sm:p-8 text-center space-y-5">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AlertTriangle className="size-7" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">
            خطایی غیرمنتظره رخ داد
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            در پردازش این صفحه مشکلی پیش آمد. لطفاً دوباره تلاش کنید؛ در صورت تکرار،
            صفحه را کامل بارگذاری مجدد کنید (Ctrl+Shift+R).
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={reset} className="w-full sm:w-auto gap-2">
            <RotateCcw className="size-4" aria-hidden="true" />
            تلاش مجدد
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => window.location.reload()}
          >
            بارگذاری کامل صفحه
          </Button>
        </div>
        {error?.digest ? (
          <p className="text-[11px] text-muted-foreground" dir="ltr">
            کد خطا: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  )
}
