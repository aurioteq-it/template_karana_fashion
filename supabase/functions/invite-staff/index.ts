import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors })
  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const publicSiteUrl = Deno.env.get('PUBLIC_SITE_URL')
  if (!publicSiteUrl) return new Response(JSON.stringify({ error: 'PUBLIC_SITE_URL is not configured' }), { status: 500, headers: cors })
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return new Response(JSON.stringify({ error: 'Sign in required' }), { status: 401, headers: cors })
  const auth = createClient(url, anonKey, { auth: { persistSession: false } })
  const { data: userResult, error: authError } = await auth.auth.getUser(token)
  if (authError || !userResult.user) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: cors })
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: profile } = await db.from('profiles').select('role,active').eq('id', userResult.user.id).maybeSingle()
  if (profile?.role !== 'admin' || !profile.active) return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: cors })
  try {
    const body = await request.json()
    const email = String(body.email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return new Response(JSON.stringify({ error: 'Valid email required' }), { status: 400, headers: cors })
    const { data: existing } = await db.from('profiles').select('id').eq('email', email).maybeSingle()
    if (existing) return new Response(JSON.stringify({ error: 'This person is already on the team' }), { status: 409, headers: cors })
    const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: `${publicSiteUrl.replace(/\/$/, '')}/admin/accept-invite` })
    if (error || !data.user) return new Response(JSON.stringify({ error: error?.message || 'Invite failed' }), { status: 400, headers: cors })
    const result = await db.from('profiles').insert({ id: data.user.id, email, role: 'staff', active: true })
    if (result.error) return new Response(JSON.stringify({ error: 'Invitation sent, but profile setup failed. Contact the project administrator.' }), { status: 500, headers: cors })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors })
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: cors })
  }
})
