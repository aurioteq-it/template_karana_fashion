import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(line => /^\s*VITE_SUPABASE_\w+\s*=/.test(line))
  .map(line => { const [name, ...rest] = line.split('='); return [name.trim(), rest.join('=').trim().replace(/^['"]|['"]$/g, '')] }))
const root = new URL(env.VITE_SUPABASE_URL)
const response = await fetch(new URL('/functions/v1/clear-order-history', root), {
  method: 'POST',
  headers: { apikey: env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ confirmation: 'DELETE ORDERS', password: 'invalid-smoke-test' }),
  signal: AbortSignal.timeout(12000),
})
console.log(`Unauthenticated cleanup rejected: HTTP ${response.status}`)
const rpc = await fetch(new URL('/rest/v1/rpc/admin_clear_order_history', root), {
  method: 'POST',
  headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ admin_user_id: '00000000-0000-0000-0000-000000000000' }),
  signal: AbortSignal.timeout(12000),
})
console.log(`Anonymous cleanup RPC rejected: HTTP ${rpc.status}`)
if (response.status !== 401 || ![401, 403].includes(rpc.status)) process.exitCode = 1
