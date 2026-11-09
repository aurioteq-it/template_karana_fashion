import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(line => /^\s*VITE_SUPABASE_\w+\s*=/.test(line))
  .map(line => { const [name, ...rest] = line.split('='); return [name.trim(), rest.join('=').trim().replace(/^['"]|['"]$/g, '')] }))
const root = new URL(env.VITE_SUPABASE_URL)
const key = env.VITE_SUPABASE_ANON_KEY

const invalidOrder = await fetch(new URL('/functions/v1/place-order', root), {
  method: 'POST',
  headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: '{}',
  signal: AbortSignal.timeout(12000),
})
console.log(`Invalid order rejected: HTTP ${invalidOrder.status}`)

const invalidSessionOrder = await fetch(new URL('/functions/v1/place-order', root), {
  method: 'POST',
  headers: { apikey: key, Authorization: 'Bearer invalid-session-smoke-test', 'Content-Type': 'application/json' },
  body: '{}',
  signal: AbortSignal.timeout(12000),
})
console.log(`Invalid shopper session rejected: HTTP ${invalidSessionOrder.status}`)

const noAuthInvite = await fetch(new URL('/functions/v1/invite-staff', root), {
  method: 'POST',
  headers: { apikey: key, 'Content-Type': 'application/json' },
  body: '{}',
  signal: AbortSignal.timeout(12000),
})
console.log(`Unauthenticated staff invite rejected: HTTP ${noAuthInvite.status}`)

if (invalidOrder.status !== 400 || invalidSessionOrder.status !== 401 || noAuthInvite.status !== 401) process.exitCode = 1
