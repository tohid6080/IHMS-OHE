// Utility: runs dev-supervisor in a fully detached daemon (double-fork style)
// Usage: node scripts/dev-daemon.js
const { spawn } = require('child_process')
const path = require('path')

const root = path.resolve(__dirname, '..')
const child = spawn(process.execPath, [path.join(__dirname, 'dev-supervisor.js')], {
  cwd: root,
  detached: true,
  stdio: 'ignore',
  env: { ...process.env },
})
child.unref()
console.log('dev-supervisor daemon started, pid=' + child.pid)
