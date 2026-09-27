import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const api = spawn(process.execPath, ['--env-file-if-exists=.env', 'local-server.mjs'], {
  cwd: root,
  env: { ...process.env, PORT: '4174', DEALDISPATCH_API_ONLY: '1' },
  stdio: 'inherit',
})
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
})
const children = [api, vite]
let stopping = false

function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM')
  process.exitCode = code
}

for (const child of children) child.on('exit', code => {
  if (!stopping) stop(code ?? 1)
})
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
