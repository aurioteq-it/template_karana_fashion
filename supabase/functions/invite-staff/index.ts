import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const emailFailure = (error: { message: string; status?: number; code?: string }) => {
  const limited = error.status === 429 || error.code === 'over_email_send_rate_limit'
  return new Response(JSON.stringify({
    error: limited ? 'Email sending limit reached. Wait for the Supabase Auth limit to reset or configure custom SMTP.' : error.message,
    code: limited ? 'email_rate_limited' : 'email_send_failed',
  }), { status: limited ? 429 : 400, headers: cors })
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
    const redirectTo = `${publicSiteUrl.replace(/\/$/, '')}/admin/accept-invite`
    const { data: existing, error: profileError } = await db.from('profiles').select('id,role,invitation_accepted_at').eq('email', email).maybeSingle()
    if (profileError) return new Response(JSON.stringify({ error: 'Could not check the team account' }), { status: 500, headers: cors })
    if (existing) {
      if (existing.role !== 'staff' || existing.invitation_accepted_at) {
        return new Response(JSON.stringify({ error: 'This team member has already accepted the invitation' }), { status: 409, headers: cors })
      }
      const { data: account, error: accountError } = await db.auth.admin.getUserById(existing.id)
      if (accountError || !account.user || account.user.email?.toLowerCase() !== email || !account.user.invited_at) {
        return new Response(JSON.stringify({ error: 'Pending invitation account could not be verified' }), { status: 409, headers: cors })
      }
      if (account.user.email_confirmed_at) {
        // The invite link was opened, but password setup was not completed.
        const { error } = await auth.auth.resetPasswordForEmail(email, { redirectTo })
        if (error) return emailFailure(error)
      } else {
        const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo })
        if (error || data.user?.id !== existing.id) {
          return error ? emailFailure(error) : new Response(JSON.stringify({ error: 'Invite failed' }), { status: 400, headers: cors })
        }
      }
      return new Response(JSON.stringify({ ok: true, resent: true }), { status: 200, headers: cors })
    }
    const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo })
    if (error || !data.user) return error ? emailFailure(error) : new Response(JSON.stringify({ error: 'Invite failed' }), { status: 400, headers: cors })
    const result = await db.from('profiles').insert({ id: data.user.id, email, role: 'staff', active: false, invitation_accepted_at: null })
    if (result.error) return new Response(JSON.stringify({ error: 'Invitation sent, but profile setup failed. Contact the project administrator.' }), { status: 500, headers: cors })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors })
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: cors })
  }
})
