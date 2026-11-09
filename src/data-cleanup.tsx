import { useEffect, useState } from 'react'
import { ArrowDownToLine, Shield, Trash2 } from 'lucide-react'
import { supabase } from './lib'

const confirmationText = 'DELETE ORDERS'

async function allRows(table: 'orders' | 'order_events') {
  const rows: Record<string, unknown>[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase!.from(table).select('*').order('id', { ascending: true }).range(offset, offset + 499)
    if (error) throw error
    rows.push(...(data as Record<string, unknown>[]))
    if (!data || data.length < 500) return rows
  }
}

export function DataCleanup({ adminEmail }: { adminEmail: string }) {
  const [step, setStep] = useState(1)
  const [orderCount, setOrderCount] = useState<number | null>(null)
  const [checkoutPaused, setCheckoutPaused] = useState(false)
  const [backupReady, setBackupReady] = useState(false)
  const [typed, setTyped] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deleted, setDeleted] = useState<number | null>(null)

  async function inspect() {
    setError('')
    const [product, count] = await Promise.all([
      supabase!.from('products').select('is_demo').eq('active', true).limit(1).maybeSingle(),
      supabase!.from('orders').select('id', { count: 'exact', head: true }),
    ])
    if (product.error || count.error) { setError('ডেটা যাচাই করা যায়নি। আবার চেষ্টা করুন।'); return }
    setCheckoutPaused(!product.data || product.data.is_demo === true)
    setOrderCount(count.count ?? 0)
  }
  useEffect(() => { void inspect() }, [])

  async function downloadBackup() {
    setBusy(true)
    setError('')
    try {
      const [orders, events] = await Promise.all([allRows('orders'), allRows('order_events')])
      const backup = { exported_at: new Date().toISOString(), orders, order_events: events }
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `karana-order-history-backup-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setBackupReady(true)
    } catch {
      setError('ব্যাকআপ ডাউনলোড তৈরি করা যায়নি। আবার চেষ্টা করুন।')
    } finally { setBusy(false) }
  }

  async function clearData() {
    if (!checkoutPaused || !backupReady || !acknowledged || typed !== confirmationText || !password) return
    setBusy(true)
    setError('')
    const { data, error: functionError } = await supabase!.functions.invoke('clear-order-history', {
      body: { password, confirmation: confirmationText },
    })
    setPassword('')
    setBusy(false)
    if (functionError || typeof data?.deleted_orders !== 'number') {
      const message = data?.error === 'Pause checkout before cleaning order history'
        ? 'Checkout আবার চালু হয়েছে। প্রথমে ডেমো মোড চালু করে নতুন করে শুরু করুন।'
        : data?.error === 'Password verification failed' ? 'অ্যাডমিন পাসওয়ার্ড সঠিক নয়।' : 'ডেটা মুছতে সমস্যা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।'
      setError(message)
      return
    }
    setDeleted(data.deleted_orders)
    setStep(5)
  }

  return <><div className="admin-page-head"><div><span className="admin-eyebrow">ADMIN ONLY</span><h1>অর্ডার ডেটা পরিষ্কার</h1><p>অর্ডার মুছলে সেগুলোর কাস্টমার তালিকা ও স্ট্যাটাস ইতিহাসও মুছে যাবে।</p></div><Shield size={32} /></div>
    <div className="admin-panel editor-panel cleanup-panel"><div className="cleanup-steps">{[1, 2, 3, 4].map(number => <span key={number} className={step >= number ? 'active' : ''}>{number}</span>)}</div>
      {step === 1 && <><h2>১. ডেটা ও checkout যাচাই</h2><p>শুধু অর্ডার এবং অর্ডার থেকে তৈরি কাস্টমার ইতিহাস মুছবে। পণ্য, ছবি, সেটিংস ও টিম সদস্যদের অ্যাকাউন্ট থাকবে।</p><p>বর্তমান অর্ডার: <strong>{orderCount ?? 'লোড হচ্ছে…'}</strong></p><p>Checkout: <strong>{checkoutPaused ? 'ডেমো মোডে বন্ধ' : 'চালু আছে'}</strong></p>{!checkoutPaused && <p className="form-error">প্রথমে Product পেজে “ডেমো পণ্য (অর্ডার বন্ধ)” চালু করে সেভ করুন।</p>}<button className="btn btn-outline" type="button" onClick={() => { void inspect() }}>আবার যাচাই করুন</button><button className="btn btn-dark" type="button" disabled={!checkoutPaused || orderCount === null} onClick={() => setStep(2)}>পরের ধাপ</button></>}
      {step === 2 && <><h2>২. ব্যাকআপ ডাউনলোড</h2><p>অর্ডার ও স্ট্যাটাস ইতিহাসের JSON ব্যাকআপ নিজের নিরাপদ জায়গায় রাখুন। এতে গ্রাহকের ব্যক্তিগত তথ্য আছে।</p><button className="btn btn-outline" type="button" disabled={busy} onClick={() => { void downloadBackup() }}><ArrowDownToLine size={17} /> {busy ? 'তৈরি হচ্ছে…' : 'ব্যাকআপ ডাউনলোড'}</button>{backupReady && <p className="admin-notice">ব্যাকআপ তৈরি হয়েছে। ফাইলটি সংরক্ষিত হয়েছে কি না যাচাই করুন।</p>}<div className="cleanup-actions"><button type="button" onClick={() => setStep(1)}>পেছনে</button><button className="btn btn-dark" type="button" disabled={!backupReady} onClick={() => setStep(3)}>পরের ধাপ</button></div></>}
      {step === 3 && <><h2>৩. স্থায়ী মুছে ফেলা নিশ্চিত করুন</h2><p>এই কাজ ফিরিয়ে আনা যাবে না। ব্যাকআপের কপি রেখে নিচের বাক্যটি লিখুন: <code>{confirmationText}</code></p><input className="cleanup-confirm-input" value={typed} onChange={event => setTyped(event.target.value)} autoComplete="off" spellCheck={false} /><label className="check-row"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /> আমি বুঝেছি অর্ডার ও কাস্টমার ইতিহাস স্থায়ীভাবে মুছে যাবে।</label><div className="cleanup-actions"><button type="button" onClick={() => setStep(2)}>পেছনে</button><button className="btn btn-dark" type="button" disabled={!acknowledged || typed !== confirmationText} onClick={() => setStep(4)}>চূড়ান্ত ধাপ</button></div></>}
      {step === 4 && <><h2>৪. অ্যাডমিন পাসওয়ার্ড দিন</h2><p>{adminEmail} অ্যাকাউন্টের পাসওয়ার্ড দিয়ে আবার পরিচয় যাচাই করা হবে। সার্ভার checkout বন্ধ আছে কি না পুনরায় পরীক্ষা করবে।</p><label>পাসওয়ার্ড<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label><div className="cleanup-actions"><button type="button" onClick={() => { setPassword(''); setStep(3) }}>পেছনে</button><button className="btn btn-danger" type="button" disabled={busy || !password} onClick={() => { void clearData() }}><Trash2 size={17} /> {busy ? 'যাচাই ও মুছে ফেলা হচ্ছে…' : 'সব অর্ডার ইতিহাস মুছুন'}</button></div></>}
      {step === 5 && <><h2>ডেটা পরিষ্কার হয়েছে</h2><p>{deleted}টি অর্ডার এবং সংশ্লিষ্ট কাস্টমার/স্ট্যাটাস ইতিহাস মুছে গেছে। পণ্য ডেমো মোডেই আছে।</p></>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  </>
}
