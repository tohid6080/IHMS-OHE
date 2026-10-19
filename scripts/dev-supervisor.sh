#!/usr/bin/env bash
# راه‌انداز خودکار سرور توسعه (Supervisor)
# اگر سرور به هر دلیلی از کار بیفتد — از جمله کشته‌شدن توسط OOM —
# ظرف چند ثانیه به‌صورت خودکار دوباره بالا می‌آید تا کاربر هرگز
# صفحه سفید یا «connection was reset» پایدار نبیند.
set -u
cd "$(dirname "$0")/.."

# سقف حافظه V8 heap — از OOM کشتن کل سیستم جلوگیری می‌کند
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=1536"

while true; do
  echo "[supervisor] starting next dev at $(date '+%Y-%m-%d %H:%M:%S')" >> dev.log
  next dev -p 3000 2>&1 | tee -a dev.log
  code=$?
  echo "[supervisor] server exited (code=$code) at $(date '+%Y-%m-%d %H:%M:%S') — restarting in 2s..." >> dev.log
  sleep 2
  # گرم‌سازی پس از هر ری‌استارت: مسیرهای اصلی از قبل کامپایل می‌شوند
  # تا اولین درخواست کاربر هرگز با تأخیر کامپایل مواجه نشود
  (
    sleep 4
    for warm in "/" "/api/auth/me"; do
      curl -s -o /dev/null --max-time 30 "http://localhost:3000$warm" &
    done
    wait
    echo "[supervisor] warmup done at $(date '+%Y-%m-%d %H:%M:%S')" >> dev.log
  ) &
done
