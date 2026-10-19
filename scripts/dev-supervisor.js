#!/usr/bin/env node
/**
 * راه‌انداز خودکار سرور توسعه — چندسکویی (ویندوز / مک / لینوکس)
 * - اگر سرور به هر دلیلی از کار بیفتد، ظرف چند ثانیه دوباره بالا می‌آید
 * - پس از هر راه‌اندازی، مسیرهای اصلی گرم می‌شوند تا اولین درخواست سریع باشد
 * - اجرا: npm run dev
 */
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const root = path.resolve(__dirname, '..')
const logFile = path.join(root, 'dev.log')
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next')

function log(line) {
  try {
    fs.appendFileSync(logFile, line + '\n')
  } catch {}
  console.log(line)
}

// مسیر فایل فونت/باینری next
if (!fs.existsSync(nextBin)) {
  console.error('next not found — first run: npm install  then: npx prisma generate')
  process.exit(1)
}

const runner = process.execPath // node.exe روی ویندوز، node/bun روی لینوکس و مک

let child = null
let stopping = false

async function warmup() {
  await new Promise((r) => setTimeout(r, 4000))
  for (const p of ['/', '/api/auth/me']) {
    try {
      await fetch(`http://localhost:3000${p}`, { signal: AbortSignal.timeout(30000) })
    } catch {}
  }
  log(`[supervisor] warmup done at ${new Date().toISOString()}`)
}

function start() {
  const env = { ...process.env }
  // سقف حافظه V8 — در صورت نبود تنظیم قبلی
  if (!env.NODE_OPTIONS || !env.NODE_OPTIONS.includes('max-old-space-size')) {
    env.NODE_OPTIONS = [env.NODE_OPTIONS, '--max-old-space-size=1536'].filter(Boolean).join(' ')
  }
  log(`[supervisor] starting next dev at ${new Date().toISOString()}`)
  child = spawn(runner, [nextBin, 'dev', '-p', '3000'], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  const out = fs.createWriteStream(logFile, { flags: 'a' })
  child.stdout.pipe(out)
  child.stderr.pipe(out)
  child.stdout.pipe(process.stdout)
  child.stderr.pipe(process.stderr)

  child.on('exit', (code) => {
    out.end()
    if (stopping) return
    log(`[supervisor] server exited (code=${code}) at ${new Date().toISOString()} — restarting in 2s...`)
    warmup()
    setTimeout(start, 2000)
  })
}

process.on('SIGINT', () => {
  stopping = true
  if (child) child.kill()
  process.exit(0)
})
process.on('SIGTERM', () => {
  stopping = true
  if (child) child.kill()
  process.exit(0)
})

warmup() // گرم‌سازی پس از راه‌اندازی اولیه
start()
