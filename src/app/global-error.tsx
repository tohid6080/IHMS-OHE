'use client'

// مرز خطای سراسری — آخرین لایه محافظ؛ حتی اگر layout از کار بیفتد اجرا می‌شود
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            padding: '32px 24px',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              margin: '0 auto 16px',
              borderRadius: '50%',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
            خطای جدی در بارگذاری سامانه
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.8, margin: '0 0 20px' }}>
            ارتباط سامانه مختل شده است. لطفاً دکمه زیر را بزنید یا صفحه را با
            Ctrl+Shift+R به‌صورت کامل بارگذاری مجدد کنید.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '10px 24px',
              borderRadius: 10,
              border: 'none',
              background: '#0f766e',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            تلاش مجدد
          </button>
          {error?.digest ? (
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 16, direction: 'ltr' }}>
              کد خطا: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  )
}
