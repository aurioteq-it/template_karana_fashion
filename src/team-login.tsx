import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { configured, supabase } from './lib'

export function TeamLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!supabase) { setChecking(false); return }
    let alive = true
    async function check() {
      const { data } = await supabase!.auth.getUser()
      if (data.user) {
        const { data: profile } = await supabase!.from('profiles').select('role,active').eq('id', data.user.id).maybeSingle()
        if (alive && profile?.active && ['admin', 'staff'].includes(profile.role)) navigate('/admin', { replace: true })
      }
      if (alive) setChecking(false)
    }
    void check()
    return () => { alive = false }
  }, [navigate])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    try {
      const result = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (result.error || !result.data.user) throw new Error('denied')
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role,active').eq('id', result.data.user.id).maybeSingle()
      if (profileError || !profile?.active || !['admin', 'staff'].includes(profile.role)) {
        await supabase.auth.signOut()
        throw new Error('denied')
      }
      navigate('/admin', { replace: true })
    } catch {
      setError('লগইন করা যায়নি। অনুমোদিত অ্যাকাউন্ট ও পাসওয়ার্ড যাচাই করুন।')
    } finally {
      setBusy(false)
    }
  }

  if (!configured) return <div className="state-page">লগইনের জন্য Supabase সংযোগ প্রয়োজন।</div>
  if (checking) return <div className="state-page">অ্যাকাউন্ট যাচাই হচ্ছে…</div>
  return <div className="admin-auth"><div className="auth-card"><img className="auth-logo-img" src="/karana-logo.jpg" alt="Karana Fashion" /><span className="section-kicker">KARANA FASHION TEAM</span><h1>টিম লগইন</h1><p>শুধু অনুমোদিত অ্যাডমিন ও স্টাফ সদস্যদের জন্য।</p>
    <form onSubmit={submit}><label>ইমেইল<input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label><label>পাসওয়ার্ড<input type="password" required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn btn-dark" disabled={busy}>{busy ? 'অপেক্ষা করুন…' : 'লগইন করুন'} <ArrowRight size={17} /></button></form><Link className="back-link" to="/team/forgot-password">পাসওয়ার্ড ভুলে গেছেন?</Link>
  </div></div>
}
