import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter(line => /^\s*VITE_SUPABASE_\w+\s*=/.test(line))
    .map(line => {
      const [name, ...rest] = line.split('=')
      return [name.trim(), rest.join('=').trim().replace(/^['"]|['"]$/g, '')]
    }),
)

const base = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY
if (!base || !key) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
const root = new URL(base)
if (root.protocol !== 'https:') throw new Error('Supabase URL must use HTTPS')

async function probe(label, path, options = {}) {
  try {
    const response = await fetch(new URL(path, root), {
      ...options,
      headers: { apikey: key, Authorization: `Bearer ${key}`, ...options.headers },
      signal: AbortSignal.timeout(12000),
    })
    let detail = ''
    if (response.headers.get('content-type')?.includes('application/json')) {
      const body = await response.text()
      const json = body ? JSON.parse(body) : null
      if (Array.isArray(json)) detail = `rows=${json.length}${label === 'Public product' && json[0] ? ` demo=${Boolean(json[0].is_demo)}` : ''}`
      else if (json && typeof json === 'object') detail = `code=${String(json.code ?? json.error_code ?? json.error ?? 'unknown').slice(0, 80)}`
    }
    console.log(`${label}: HTTP ${response.status}${detail ? ` ${detail}` : ''}`)
    return response.status
  } catch (error) {
    console.log(`${label}: ${error instanceof Error ? error.message : 'request failed'}`)
    return 0
  }
}

const results = await Promise.all([
  probe('Public product', '/rest/v1/products?select=id,is_demo,active&active=eq.true&limit=1'),
  probe('Public variants', '/rest/v1/product_variants?select=id,label,price,stock&limit=1'),
  probe('Delivery zones', '/rest/v1/delivery_zones?select=id,label,fee&limit=1'),
  probe('Public settings', '/rest/v1/public_business_settings?select=brand_name&limit=1'),
  probe('Orders anonymous read', '/rest/v1/orders?select=id&limit=1'),
  probe('Profiles anonymous read', '/rest/v1/profiles?select=id&limit=1'),
  probe('Order function', '/functions/v1/place-order', { method: 'OPTIONS' }),
  probe('Staff function', '/functions/v1/invite-staff', { method: 'OPTIONS' }),
])
const publicDataReady = results.slice(0, 4).every(status => status === 200)
const privateDataBlocked = results.slice(4, 6).every(status => status === 401 || status === 403)
const functionsReady = results.slice(6).every(status => status === 200 || status === 204)
console.log(`Summary: public data ${publicDataReady ? 'ready' : 'missing'}, private access ${privateDataBlocked ? 'blocked' : 'unverified'}, functions ${functionsReady ? 'ready' : 'missing'}`)
if (!publicDataReady || !privateDataBlocked || !functionsReady) process.exitCode = 1
