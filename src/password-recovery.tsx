import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { configured, supabase } from './lib'

const teamLogin = '/team/access'
const recoveryTokenChecks = new Map<string, Promise<boolean>>()

function verifyRecoveryToken(tokenHash: string) {
  let check = recoveryTokenChecks.get(tokenHash)
  if (!check) {
    check = supabase!.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error }) => !error).catch(() => false)
    recoveryTokenChecks.set(tokenHash, check)
  }
  return check
}

export function TeamForgotPassword() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/team/reset-password`,
    })
    setBusy(false)
    if (resetError) setError('এখন রিসেট ইমেইল পাঠানো যাচ্ছে না। কিছুক্ষণ পরে আবার চেষ্টা করুন।')
    else setSent(true)
  }

  if (!configured) return <div className="state-page">পাসওয়ার্ড রিসেটের জন্য Supabase সংযোগ প্রয়োজন।</div>
  return <div className="admin-auth"><div className="auth-card"><img className="auth-logo-img" src="/karana-logo.jpg" alt="Karana Fashion" /><span className="section-kicker">TEAM ACCESS</span><h1>পাসওয়ার্ড ভুলে গেছেন?</h1>
    {sent ? <p role="status">এই ইমেইলে অনুমোদিত অ্যাকাউন্ট থাকলে পাসওয়ার্ড রিসেটের লিংক পাঠানো হয়েছে। ইনবক্স ও স্প্যাম ফোল্ডার দেখুন।</p> : <><p>আপনার টিম অ্যাকাউন্টের ইমেইল দিন।</p><form onSubmit={submit}><label>ইমেইল<input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn btn-dark" disabled={busy}>{busy ? 'পাঠানো হচ্ছে…' : 'রিসেট লিংক পাঠান'}</button></form></>}
    <Link to={teamLogin} className="back-link">লগইনে ফিরুন</Link>
  </div></div>
}

export function TeamResetPassword() {
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) { setError('Supabase সংযোগ প্রয়োজন।'); setChecking(false); return }
    let alive = true
    async function check() {
      const tokenHash = new URLSearchParams(window.location.search).get('token_hash')
      if (tokenHash) {
        const tokenValid = await verifyRecoveryToken(tokenHash)
        if (!tokenValid) { if (alive) { setError('রিসেট লিংকটি মেয়াদোত্তীর্ণ বা অকার্যকর।'); setChecking(false) }; return }
      }
      const { data: auth, error: authError } = await supabase!.auth.getUser()
      if (!alive) return
      if (authError || !auth.user) { setError('ইমেইলের রিসেট লিংকটি খুলে আবার চেষ্টা করুন।'); setChecking(false); return }
      const { data: profile, error: profileError } = await supabase!.from('profiles').select('role,active').eq('id', auth.user.id).maybeSingle()
      if (!alive) return
      if (profileError || !profile?.active || !['admin', 'staff'].includes(profile.role)) {
        await supabase!.auth.signOut()
        if (alive) { setError('এই অ্যাকাউন্টের টিম অ্যাক্সেস নেই।'); setChecking(false) }
        return
      }
      setReady(true)
      setChecking(false)
    }
    void check()
    return () => { alive = false }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !ready) return
    if (password.length < 12) { setError('কমপক্ষে ১২ অক্ষরের পাসওয়ার্ড দিন।'); return }
    if (password !== confirm) { setError('দুটি পাসওয়ার্ড মেলেনি।'); return }
    setBusy(true)
    setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) { setError(updateError.message); setBusy(false); return }
    await supabase.auth.signOut()
    setDone(true)
    setBusy(false)
  }

  if (!configured) return <div className="state-page">পাসওয়ার্ড রিসেটের জন্য Supabase সংযোগ প্রয়োজন।</div>
  return <div className="admin-auth"><div className="auth-card"><img className="auth-logo-img" src="/karana-logo.jpg" alt="Karana Fashion" /><span className="section-kicker">TEAM ACCESS</span><h1>নতুন পাসওয়ার্ড</h1>
    {checking ? <p>লিংক যাচাই হচ্ছে…</p> : done ? <p role="status">পাসওয়ার্ড পরিবর্তন হয়েছে। নতুন পাসওয়ার্ড দিয়ে লগইন করুন।</p> : ready ? <form onSubmit={submit}><label>নতুন পাসওয়ার্ড<input type="password" required minLength={12} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label><label>আবার লিখুন<input type="password" required minLength={12} autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn btn-dark" disabled={busy}>{busy ? 'সেভ হচ্ছে…' : 'পাসওয়ার্ড সেভ করুন'}</button></form> : <p className="form-error" role="alert">{error}</p>}
    <Link to={teamLogin} className="back-link">লগইনে ফিরুন</Link>
  </div></div>
}
