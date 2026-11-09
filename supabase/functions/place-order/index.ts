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
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object' || JSON.stringify(body).length > 5000) {
      return new Response(JSON.stringify({ error: 'Invalid order data' }), { status: 400, headers: cors })
    }
    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    let customerUserId: string | null = null
    if (token && token !== anonKey) {
      const auth = createClient(url, anonKey, { auth: { persistSession: false } })
      const { data, error } = await auth.auth.getUser(token)
      if (error || !data.user) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: cors })
      customerUserId = data.user.id
    }
    const db = createClient(url, serviceKey, { auth: { persistSession: false } })
    const orderPayload = { ...body }
    delete orderPayload.customer_user_id
    const { data, error } = await db.rpc('place_cod_order', { payload: orderPayload, shopper_user_id: customerUserId })
    if (error) {
      const expected = error.code === 'P0001'
      return new Response(JSON.stringify({ error: expected ? error.message : 'অর্ডার গ্রহণ করা যায়নি। আবার চেষ্টা করুন।' }), { status: 400, headers: cors })
    }
    return new Response(JSON.stringify(data), { status: 200, headers: cors })
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid order data' }), { status: 400, headers: cors })
  }
})
