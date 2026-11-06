import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(line => /^\s*VITE_SUPABASE_\w+\s*=/.test(line))
  .map(line => { const [name, ...rest] = line.split('='); return [name.trim(), rest.join('=').trim().replace(/^['"]|['"]$/g, '')] }))

const response = await fetch(new URL('/auth/v1/settings', env.VITE_SUPABASE_URL), {
  headers: { apikey: env.VITE_SUPABASE_ANON_KEY },
  signal: AbortSignal.timeout(12000),
})
if (!response.ok) throw new Error(`Auth settings HTTP ${response.status}`)
const settings = await response.json()
console.log(`Public signup disabled: ${settings.disable_signup === true ? 'yes' : settings.disable_signup === false ? 'no' : 'not exposed by this endpoint'}`)
if (settings.disable_signup === false) process.exitCode = 1
