import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}
const reply = (body: object, status: number) => new Response(JSON.stringify(body), { status, headers: cors })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return reply({ error: 'Sign in required' }, 401)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userResult, error: authError } = await auth.auth.getUser(token)
  const user = userResult.user
  if (authError || !user?.email) return reply({ error: 'Invalid session' }, 401)

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: profile, error: profileError } = await db.from('profiles').select('role,active').eq('id', user.id).maybeSingle()
  if (profileError || profile?.role !== 'admin' || !profile.active) return reply({ error: 'Admin access required' }, 403)

  let body: { password?: unknown; confirmation?: unknown }
  try { body = await request.json() } catch { return reply({ error: 'Invalid request' }, 400) }
  if (!body || typeof body !== 'object' || body.confirmation !== 'DELETE ORDERS' || typeof body.password !== 'string' || body.password.length < 1 || body.password.length > 1024) {
    return reply({ error: 'Confirmation and password required' }, 400)
  }

  const { data: passwordResult, error: passwordError } = await auth.auth.signInWithPassword({ email: user.email, password: body.password })
  if (passwordError || passwordResult.user?.id !== user.id) return reply({ error: 'Password verification failed' }, 401)

  const { data: count, error: clearError } = await db.rpc('admin_clear_order_history', { admin_user_id: user.id })
  if (clearError) {
    const paused = clearError.message.includes('Pause checkout before cleaning order history')
    return reply({ error: paused ? 'Pause checkout before cleaning order history' : 'Cleanup failed' }, paused ? 409 : 500)
  }
  return reply({ deleted_orders: count }, 200)
})
