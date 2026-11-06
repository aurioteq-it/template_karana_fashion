import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowDownToLine, ArrowLeft, BarChart3, Box, Check, ChevronRight, ClipboardList, LayoutDashboard, LogOut, Menu, Package, Plus, Search, Settings, Shield, ShoppingBag, Users, X } from 'lucide-react'
import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { configured, money, supabase } from './lib'

type Role = 'admin' | 'staff'
type Profile = { id: string; email: string; role: Role; active: boolean }
type Order = {
  id: string; reference: string; status: string; name: string; phone: string; district: string; area: string; address: string
  quantity: number; product_name: string; variant_label: string; unit_price: number; delivery_fee: number; total: number
  internal_note: string | null; created_at: string
}
type ProductRow = { id: string; name: string; subtitle: string; description: string; details: string[]; image_urls: string[]; active: boolean; is_demo: boolean }
type VariantRow = { id: string; product_id: string; label: string; sku: string; price: number; compare_at_price: number | null; stock: number; active: boolean }
type ZoneRow = { id: string; label: string; fee: number; active: boolean }
type SettingsRow = { id: string; brand_name: string; contact_phone: string; support_hours: string; delivery_note: string; return_policy: string; privacy_policy: string; terms: string }

const statuses = ['new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']
const statusLabel: Record<string, string> = { new: 'নতুন', confirmed: 'নিশ্চিত', processing: 'প্রসেসিং', shipped: 'পাঠানো হয়েছে', delivered: 'ডেলিভারি হয়েছে', cancelled: 'বাতিল', returned: 'রিটার্ন' }
const date = (value: string) => new Intl.DateTimeFormat('bn-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

function MissingSetup() { return <div className="admin-auth"><div className="auth-card"><span className="auth-logo">KF</span><h1>Supabase সেটআপ প্রয়োজন</h1><p><code>.env</code> ফাইলে Supabase URL ও public anon key দিন। বিস্তারিত <code>README.md</code> দেখুন।</p><Link to="/" className="back-link"><ArrowLeft size={16} /> স্টোরে ফিরুন</Link></div></div> }

export function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  if (!configured || !supabase) return <MissingSetup />
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError('')
    const result = await supabase!.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (result.error) setError('ইমেইল বা পাসওয়ার্ড সঠিক নয়।')
    else navigate('/admin')
  }
  return <div className="admin-auth"><div className="auth-card"><Link to="/" className="auth-back"><ArrowLeft size={17} /> স্টোরে ফিরুন</Link><span className="auth-logo">KF</span><span className="section-kicker">STAFF ACCESS</span><h1>স্বাগতম</h1><p>অর্ডার ও স্টোর পরিচালনা করতে সাইন ইন করুন।</p><form onSubmit={login}><label>ইমেইল<input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" /></label><label>পাসওয়ার্ড<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="আপনার পাসওয়ার্ড" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn btn-dark" disabled={busy}>{busy ? 'সাইন ইন হচ্ছে…' : 'সাইন ইন করুন'} <ChevronRight size={18} /></button></form><small>শুধু অনুমোদিত স্টাফ ও অ্যাডমিনের জন্য।</small></div></div>
}

export function AdminApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [menu, setMenu] = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    let alive = true
    async function load(current: Session | null) {
      if (!alive) return
      setSession(current)
      if (current) {
        const { data } = await supabase!.from('profiles').select('id,email,role,active').eq('id', current.user.id).maybeSingle()
        if (alive) setProfile(data as Profile | null)
      } else setProfile(null)
      if (alive) setLoading(false)
    }
    supabase.auth.getSession().then(({ data }) => load(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, current) => { void load(current) })
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [])
  if (!configured || !supabase) return <MissingSetup />
  if (loading) return <div className="state-page">ড্যাশবোর্ড লোড হচ্ছে…</div>
  if (!session) return <Navigate to="/admin/login" replace />
  if (!profile?.active) return <div className="state-page"><h2>প্রবেশাধিকার নেই</h2><p>আপনার অ্যাকাউন্ট সক্রিয় নয়। প্রশাসকের সঙ্গে যোগাযোগ করুন।</p><button className="btn btn-dark" onClick={() => supabase!.auth.signOut()}>সাইন আউট</button></div>
  const admin = profile.role === 'admin'
  const nav = [
    { path: '/admin', label: 'ওভারভিউ', icon: LayoutDashboard, end: true },
    { path: '/admin/orders', label: 'অর্ডার', icon: ClipboardList },
    { path: '/admin/customers', label: 'কাস্টমার', icon: Users },
    ...(admin ? [
      { path: '/admin/product', label: 'প্রোডাক্ট', icon: Package },
      { path: '/admin/settings', label: 'সেটিংস', icon: Settings },
      { path: '/admin/reports', label: 'রিপোর্ট', icon: BarChart3 },
      { path: '/admin/staff', label: 'স্টাফ', icon: Shield },
    ] : []),
  ]
  return <div className="admin-shell"><aside className={menu ? 'admin-sidebar open' : 'admin-sidebar'}><div className="sidebar-top"><Link to="/" className="sidebar-brand"><span>KF</span><strong>KARANA<br />FASHION</strong></Link><button className="sidebar-close" onClick={() => setMenu(false)} aria-label="মেনু বন্ধ করুন"><X size={20} /></button></div><div className="sidebar-caption">WORKSPACE</div><nav>{nav.map(item => <NavLink key={item.path} to={item.path} end={item.end} onClick={() => setMenu(false)} className={({ isActive }) => isActive ? 'active' : ''}><item.icon size={19} />{item.label}</NavLink>)}</nav><div className="sidebar-bottom"><div className="sidebar-user"><span>{profile.email.slice(0, 1).toUpperCase()}</span><div><strong>{profile.email}</strong><small>{admin ? 'Administrator' : 'Staff member'}</small></div></div><button onClick={async () => { await supabase!.auth.signOut(); navigate('/admin/login') }}><LogOut size={18} /> সাইন আউট</button></div></aside><div className="admin-main"><header className="admin-topbar"><button className="admin-menu" aria-label="মেনু খুলুন" onClick={() => setMenu(true)}><Menu size={23} /></button><div className="topbar-crumb">Karana Fashion <ChevronRight size={14} /> Dashboard</div><div className="topbar-right"><span className="role-pill">{admin ? 'ADMIN' : 'STAFF'}</span><Link to="/" target="_blank">স্টোর দেখুন <ChevronRight size={15} /></Link></div></header><div className="admin-content"><Routes><Route index element={<Overview />} /><Route path="orders" element={<Orders />} /><Route path="customers" element={<Customers />} />{admin && <><Route path="product" element={<ProductEditor />} /><Route path="settings" element={<SettingsEditor />} /><Route path="reports" element={<Reports />} /><Route path="staff" element={<StaffManager />} /></>}<Route path="*" element={<Navigate to="/admin" replace />} /></Routes></div></div></div>
}

function PageHead({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) { return <div className="admin-page-head"><div><span className="admin-eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div> }
function Notice({ message, error = false }: { message: string; error?: boolean }) { return message ? <p className={error ? 'admin-notice error' : 'admin-notice'} role="status">{message}</p> : null }

function useOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  async function refresh() {
    setLoading(true)
    const result = await supabase!.from('orders').select('*').order('created_at', { ascending: false }).limit(500)
    if (result.error) setError(result.error.message)
    else { setOrders(result.data as Order[]); setError('') }
    setLoading(false)
  }
  useEffect(() => { void refresh() }, [])
  return { orders, loading, error, refresh }
}

function Overview() {
  const { orders, loading, error } = useOrders()
  const revenue = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + Number(o.total), 0)
  const pending = orders.filter(o => ['new', 'confirmed', 'processing'].includes(o.status)).length
  return <><PageHead eyebrow="OVERVIEW" title="স্টোর এক নজরে" description="সাম্প্রতিক অর্ডার ও কাজের সারাংশ।" /><Notice message={error} error /><div className="stat-grid"><Stat icon={<ShoppingBag size={23} />} label="মোট অর্ডার" value={loading ? '…' : String(orders.length)} /><Stat icon={<Box size={23} />} label="কাজ বাকি" value={loading ? '…' : String(pending)} /><Stat icon={<Check size={23} />} label="ডেলিভারি হয়েছে" value={loading ? '…' : String(orders.filter(o => o.status === 'delivered').length)} /><Stat icon={<BarChart3 size={23} />} label="ডেলিভারি আয়" value={loading ? '…' : money(revenue)} /></div><div className="admin-panel"><div className="panel-header"><h2>সাম্প্রতিক অর্ডার</h2><Link to="/admin/orders">সব দেখুন <ChevronRight size={16} /></Link></div><OrderTable orders={orders.slice(0, 6)} loading={loading} compact /></div></>
}
function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="stat-card"><div className="stat-icon">{icon}</div><span>{label}</span><strong>{value}</strong></div> }

function OrderTable({ orders, loading, compact = false, onSelect }: { orders: Order[]; loading: boolean; compact?: boolean; onSelect?: (order: Order) => void }) {
  return <div className="table-scroll"><table className="admin-table"><thead><tr><th>রেফারেন্স</th><th>কাস্টমার</th><th>তারিখ</th><th>মোট</th><th>স্ট্যাটাস</th>{!compact && <th>বিস্তারিত</th>}</tr></thead><tbody>{loading ? <tr><td colSpan={compact ? 5 : 6}>লোড হচ্ছে…</td></tr> : orders.length ? orders.map(order => <tr key={order.id}><td><strong>{order.reference}</strong></td><td>{order.name}<small>{order.phone}</small></td><td>{date(order.created_at)}</td><td>{money(Number(order.total))}</td><td><span className={`status status-${order.status}`}>{statusLabel[order.status] ?? order.status}</span></td>{!compact && <td><button className="table-action" onClick={() => onSelect?.(order)}>দেখুন <ChevronRight size={15} /></button></td>}</tr>) : <tr><td colSpan={compact ? 5 : 6}>এখনো কোনো অর্ডার নেই।</td></tr>}</tbody></table></div>
}

function Orders() {
  const { orders, loading, error, refresh } = useOrders()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<Order | null>(null)
  const [status, setStatus] = useState('new')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const filtered = orders.filter(o => (filter === 'all' || o.status === filter) && `${o.reference} ${o.name} ${o.phone} ${o.district}`.toLowerCase().includes(search.toLowerCase()))
  function open(order: Order) { setSelected(order); setStatus(order.status); setNote(order.internal_note ?? ''); setMessage('') }
  async function save() {
    if (!selected) return
    setSaving(true)
    const result = await supabase!.from('orders').update({ status, internal_note: note.trim() }).eq('id', selected.id).select().single()
    setSaving(false)
    if (result.error) setMessage(result.error.message)
    else { setMessage('অর্ডার আপডেট হয়েছে।'); setSelected(result.data as Order); await refresh() }
  }
  return <><PageHead eyebrow="ORDER MANAGEMENT" title="অর্ডার" description="অর্ডার খুঁজুন, বিস্তারিত দেখুন ও স্ট্যাটাস বদলান।" /><Notice message={error} error /><div className="admin-panel"><div className="toolbar"><div className="search-field"><Search size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="নাম, ফোন বা রেফারেন্স খুঁজুন" /></div><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">সব স্ট্যাটাস</option>{statuses.map(item => <option key={item} value={item}>{statusLabel[item]}</option>)}</select></div><OrderTable orders={filtered} loading={loading} onSelect={open} /></div>{selected && <div className="drawer-backdrop" onClick={() => setSelected(null)}><aside className="order-drawer" onClick={e => e.stopPropagation()}><button className="drawer-close" onClick={() => setSelected(null)} aria-label="বন্ধ করুন"><X size={21} /></button><span className="admin-eyebrow">ORDER DETAILS</span><h2>{selected.reference}</h2><p className="drawer-date">{date(selected.created_at)}</p><div className="drawer-section"><h3>কাস্টমার ও ঠিকানা</h3><strong>{selected.name}</strong><p>{selected.phone}</p><p>{selected.address}, {selected.area}, {selected.district}</p></div><div className="drawer-section"><h3>পণ্যের তথ্য</h3><p>{selected.product_name} · {selected.variant_label}</p><p>{selected.quantity} × {money(Number(selected.unit_price))}</p><p>ডেলিভারি {money(Number(selected.delivery_fee))}</p><strong>মোট {money(Number(selected.total))}</strong></div><div className="drawer-section"><h3>অর্ডার আপডেট</h3><label>স্ট্যাটাস<select value={status} onChange={e => setStatus(e.target.value)}>{statuses.map(item => <option key={item} value={item}>{statusLabel[item]}</option>)}</select></label><label>ইন্টারনাল নোট<textarea rows={4} maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="শুধু স্টাফের জন্য" /></label><Notice message={message} error={message !== 'অর্ডার আপডেট হয়েছে।'} /><button className="btn btn-dark" disabled={saving} onClick={save}>{saving ? 'সেভ হচ্ছে…' : 'পরিবর্তন সেভ করুন'}</button></div></aside></div>}</>
}

function Customers() {
  const { orders, loading, error } = useOrders()
  const [search, setSearch] = useState('')
  const customers = Array.from(new Map(orders.map(o => [o.phone, o])).values()).filter(o => `${o.name} ${o.phone} ${o.district}`.toLowerCase().includes(search.toLowerCase()))
  return <><PageHead eyebrow="CUSTOMER LOOKUP" title="কাস্টমার" description="অর্ডারের তথ্য থেকে কাস্টমার খুঁজুন।" /><Notice message={error} error /><div className="admin-panel"><div className="toolbar"><div className="search-field"><Search size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="নাম, ফোন বা জেলা" /></div></div><div className="table-scroll"><table className="admin-table"><thead><tr><th>নাম</th><th>ফোন</th><th>জেলা</th><th>সর্বশেষ অর্ডার</th><th>অর্ডার সংখ্যা</th></tr></thead><tbody>{loading ? <tr><td colSpan={5}>লোড হচ্ছে…</td></tr> : customers.length ? customers.map(o => <tr key={o.phone}><td><strong>{o.name}</strong></td><td>{o.phone}</td><td>{o.district}</td><td>{date(o.created_at)}</td><td>{orders.filter(item => item.phone === o.phone).length}</td></tr>) : <tr><td colSpan={5}>কোনো কাস্টমার পাওয়া যায়নি।</td></tr>}</tbody></table></div></div></>
}

function ProductEditor() {
  const [product, setProduct] = useState<ProductRow | null>(null)
  const [variants, setVariants] = useState<VariantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { void (async () => { const result = await supabase!.from('products').select('*').limit(1).maybeSingle(); if (result.data) { setProduct(result.data as ProductRow); const vr = await supabase!.from('product_variants').select('*').eq('product_id', result.data.id).order('created_at'); setVariants(vr.data as VariantRow[] ?? []) } setLoading(false) })() }, [])
  async function save() {
    if (!product) return
    setSaving(true); setMessage('')
    const p = await supabase!.from('products').update({ name: product.name, subtitle: product.subtitle, description: product.description, details: product.details, image_urls: product.image_urls, active: product.active, is_demo: product.is_demo }).eq('id', product.id)
    if (p.error) { setMessage(p.error.message); setSaving(false); return }
    for (const variant of variants) { const result = await supabase!.from('product_variants').update({ label: variant.label, sku: variant.sku, price: variant.price, compare_at_price: variant.compare_at_price, stock: variant.stock, active: variant.active }).eq('id', variant.id); if (result.error) { setMessage(result.error.message); setSaving(false); return } }
    setMessage('পণ্যের তথ্য সেভ হয়েছে।'); setSaving(false)
  }
  if (loading) return <div className="state-page">লোড হচ্ছে…</div>
  if (!product) return <div className="state-page"><h2>পণ্য পাওয়া যায়নি</h2><p>প্রথম পণ্য তৈরির জন্য Supabase seed SQL চালান।</p></div>
  const field = (key: keyof ProductRow, value: string | boolean | string[]) => setProduct({ ...product, [key]: value })
  const variantField = (index: number, key: keyof VariantRow, value: string | number | boolean | null) => setVariants(variants.map((v, i) => i === index ? { ...v, [key]: value } : v))
  return <><PageHead eyebrow="CATALOG" title="প্রোডাক্ট" description="প্রকাশিত পণ্যের বিবরণ, মূল্য ও স্টক সম্পাদনা করুন।" action={<button className="btn btn-dark" onClick={save} disabled={saving}>{saving ? 'সেভ হচ্ছে…' : 'সেভ করুন'} <Check size={17} /></button>} /><Notice message={message} error={message !== 'পণ্যের তথ্য সেভ হয়েছে।'} /><div className="editor-grid"><section className="admin-panel editor-panel"><h2>মূল তথ্য</h2><label>পণ্যের নাম<input value={product.name} onChange={e => field('name', e.target.value)} /></label><label>সাবটাইটেল<input value={product.subtitle} onChange={e => field('subtitle', e.target.value)} /></label><label>বিবরণ<textarea rows={5} value={product.description} onChange={e => field('description', e.target.value)} /></label><label>বিস্তারিত (প্রতি লাইনে একটি)<textarea rows={5} value={product.details.join('\n')} onChange={e => field('details', e.target.value.split('\n').filter(Boolean))} /></label><label>ছবির URL (প্রতি লাইনে একটি)<textarea rows={4} value={product.image_urls.join('\n')} onChange={e => field('image_urls', e.target.value.split('\n').map(x => x.trim()).filter(Boolean))} /></label><label className="check-row"><input type="checkbox" checked={product.active} onChange={e => field('active', e.target.checked)} /> প্রকাশিত</label><label className="check-row"><input type="checkbox" checked={product.is_demo} onChange={e => field('is_demo', e.target.checked)} /> ডেমো পণ্য (অর্ডার বন্ধ)</label></section><section className="admin-panel editor-panel"><h2>ভ্যারিয়েশন ও স্টক</h2>{variants.map((variant, i) => <div className="variant-editor" key={variant.id}><h3>{variant.label}</h3><div className="editor-two"><label>নাম<input value={variant.label} onChange={e => variantField(i, 'label', e.target.value)} /></label><label>SKU<input value={variant.sku} onChange={e => variantField(i, 'sku', e.target.value)} /></label><label>মূল্য (৳)<input type="number" min="0" value={variant.price} onChange={e => variantField(i, 'price', Number(e.target.value))} /></label><label>স্টক<input type="number" min="0" value={variant.stock} onChange={e => variantField(i, 'stock', Number(e.target.value))} /></label></div><label className="check-row"><input type="checkbox" checked={variant.active} onChange={e => variantField(i, 'active', e.target.checked)} /> সক্রিয়</label></div>)}</section></div></>
}

function SettingsEditor() {
  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [zones, setZones] = useState<ZoneRow[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  useEffect(() => { void (async () => { const [s, z] = await Promise.all([supabase!.from('business_settings').select('*').limit(1).maybeSingle(), supabase!.from('delivery_zones').select('*').order('fee')]); setSettings(s.data as SettingsRow | null); setZones(z.data as ZoneRow[] ?? []); setLoading(false) })() }, [])
  async function save() {
    if (!settings) return
    setMessage('')
    const result = await supabase!.from('business_settings').update(settings).eq('id', settings.id)
    if (result.error) { setMessage(result.error.message); return }
    for (const zone of zones) { const z = await supabase!.from('delivery_zones').update({ label: zone.label, fee: zone.fee, active: zone.active }).eq('id', zone.id); if (z.error) { setMessage(z.error.message); return } }
    setMessage('সেটিংস সেভ হয়েছে।')
  }
  if (loading) return <div className="state-page">লোড হচ্ছে…</div>
  if (!settings) return <div className="state-page">সেটিংস পাওয়া যায়নি। Supabase seed SQL চালান।</div>
  const field = (key: keyof SettingsRow, value: string) => setSettings({ ...settings, [key]: value })
  return <><PageHead eyebrow="STORE SETTINGS" title="সেটিংস" description="যোগাযোগ, ডেলিভারি ও গ্রাহক নীতিমালা সম্পাদনা করুন।" action={<button className="btn btn-dark" onClick={save}>সেভ করুন <Check size={17} /></button>} /><Notice message={message} error={message !== 'সেটিংস সেভ হয়েছে।'} /><div className="editor-grid"><section className="admin-panel editor-panel"><h2>ব্যবসার তথ্য</h2><label>ব্র্যান্ড<input value={settings.brand_name} onChange={e => field('brand_name', e.target.value)} /></label><label>যোগাযোগের নম্বর<input value={settings.contact_phone} onChange={e => field('contact_phone', e.target.value)} /></label><label>সাপোর্ট সময়<input value={settings.support_hours} onChange={e => field('support_hours', e.target.value)} /></label><label>ডেলিভারি বার্তা<textarea rows={3} value={settings.delivery_note} onChange={e => field('delivery_note', e.target.value)} /></label><h2>ডেলিভারি জোন</h2>{zones.map((zone, index) => <div className="editor-two" key={zone.id}><label>নাম<input value={zone.label} onChange={e => setZones(zones.map((z, i) => i === index ? { ...z, label: e.target.value } : z))} /></label><label>চার্জ (৳)<input type="number" min="0" value={zone.fee} onChange={e => setZones(zones.map((z, i) => i === index ? { ...z, fee: Number(e.target.value) } : z))} /></label></div>)}</section><section className="admin-panel editor-panel"><h2>নীতিমালা</h2><p>ব্যবসার মালিকের অনুমোদিত লেখা ছাড়া প্রকাশ করবেন না।</p><label>রিটার্ন ও রিফান্ড<textarea rows={7} value={settings.return_policy} onChange={e => field('return_policy', e.target.value)} /></label><label>প্রাইভেসি পলিসি<textarea rows={7} value={settings.privacy_policy} onChange={e => field('privacy_policy', e.target.value)} /></label><label>শর্তাবলি<textarea rows={7} value={settings.terms} onChange={e => field('terms', e.target.value)} /></label></section></div></>
}

function Reports() {
  const { orders, loading, error } = useOrders()
  const delivered = orders.filter(o => o.status === 'delivered')
  function exportCsv() {
    const headers = ['Reference', 'Date', 'Status', 'Name', 'Phone', 'District', 'Area', 'Address', 'Product', 'Variant', 'Quantity', 'Unit price', 'Delivery fee', 'Total']
    const rows = orders.map(o => [o.reference, o.created_at, o.status, o.name, o.phone, o.district, o.area, o.address, o.product_name, o.variant_label, o.quantity, o.unit_price, o.delivery_fee, o.total])
    const escape = (value: unknown) => `"${String(value ?? '').replace(/^([=+\-@])/, "'$1").replaceAll('"', '""')}"`
    const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n')
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = `karana-orders-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href)
  }
  return <><PageHead eyebrow="REPORTS" title="রিপোর্ট" description="বর্তমান অর্ডার ডেটার সারাংশ।" action={<button className="btn btn-outline" onClick={exportCsv} disabled={loading}><ArrowDownToLine size={18} /> CSV ডাউনলোড</button>} /><Notice message={error} error /><div className="stat-grid"><Stat icon={<ShoppingBag size={23} />} label="মোট অর্ডার" value={loading ? '…' : String(orders.length)} /><Stat icon={<Check size={23} />} label="ডেলিভারি হয়েছে" value={loading ? '…' : String(delivered.length)} /><Stat icon={<BarChart3 size={23} />} label="ডেলিভারি আয়" value={loading ? '…' : money(delivered.reduce((a, o) => a + Number(o.total), 0))} /><Stat icon={<Box size={23} />} label="বাতিল/রিটার্ন" value={loading ? '…' : String(orders.filter(o => ['cancelled', 'returned'].includes(o.status)).length)} /></div><div className="admin-panel"><div className="panel-header"><h2>স্ট্যাটাস অনুযায়ী অর্ডার</h2></div><div className="report-bars">{statuses.map(status => <div key={status}><span>{statusLabel[status]}</span><div><i style={{ width: `${orders.length ? (orders.filter(o => o.status === status).length / orders.length) * 100 : 0}%` }} /></div><strong>{orders.filter(o => o.status === status).length}</strong></div>)}</div></div></>
}

function StaffManager() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function refresh() { const result = await supabase!.from('profiles').select('id,email,role,active').order('email'); if (result.data) setProfiles(result.data as Profile[]) }
  useEffect(() => { void refresh() }, [])
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    const result = await supabase!.functions.invoke('invite-staff', { body: { email: email.trim() } })
    setBusy(false)
    if (result.error) setMessage(result.data?.error || result.error.message)
    else { setMessage('আমন্ত্রণ পাঠানো হয়েছে।'); setEmail(''); await refresh() }
  }
  async function toggle(profile: Profile) { const result = await supabase!.from('profiles').update({ active: !profile.active }).eq('id', profile.id); setMessage(result.error?.message || 'স্টাফ আপডেট হয়েছে।'); await refresh() }
  return <><PageHead eyebrow="TEAM ACCESS" title="স্টাফ" description="অনুমোদিত স্টাফকে আমন্ত্রণ জানান ও অ্যাক্সেস নিয়ন্ত্রণ করুন।" /><Notice message={message} error={!['আমন্ত্রণ পাঠানো হয়েছে।', 'স্টাফ আপডেট হয়েছে।'].includes(message)} /><div className="admin-panel editor-panel"><h2>স্টাফ আমন্ত্রণ</h2><form onSubmit={invite} className="invite-form"><label>ইমেইল<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@example.com" /></label><button className="btn btn-dark" disabled={busy}><Plus size={18} /> {busy ? 'পাঠানো হচ্ছে…' : 'আমন্ত্রণ পাঠান'}</button></form></div><div className="admin-panel"><div className="panel-header"><h2>টিম সদস্য</h2></div><div className="table-scroll"><table className="admin-table"><thead><tr><th>ইমেইল</th><th>রোল</th><th>অবস্থা</th><th>অ্যাকশন</th></tr></thead><tbody>{profiles.map(profile => <tr key={profile.id}><td>{profile.email}</td><td>{profile.role}</td><td>{profile.active ? 'সক্রিয়' : 'বন্ধ'}</td><td>{profile.role === 'staff' && <button className="table-action" onClick={() => toggle(profile)}>{profile.active ? 'বন্ধ করুন' : 'সক্রিয় করুন'}</button>}</td></tr>)}</tbody></table></div></div></>
}

export function AdminAcceptInvite() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    if (!supabase) { setError('Supabase সেটআপ প্রয়োজন।'); return }
    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token_hash')
    async function check() {
      if (tokenHash) {
        const result = await supabase!.auth.verifyOtp({ token_hash: tokenHash, type: 'invite' })
        if (result.error) { setError('আমন্ত্রণের লিংকটি মেয়াদোত্তীর্ণ বা অকার্যকর।'); return }
      }
      const { data } = await supabase!.auth.getSession()
      if (data.session) setReady(true)
      else setError('আমন্ত্রণের লিংকটি খুলে আবার চেষ্টা করুন।')
    }
    void check()
  }, [])
  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 12) { setError('কমপক্ষে ১২ অক্ষরের পাসওয়ার্ড দিন।'); return }
    if (password !== confirm) { setError('দুইবার দেওয়া পাসওয়ার্ড মিলছে না।'); return }
    setBusy(true); setError('')
    const result = await supabase!.auth.updateUser({ password })
    setBusy(false)
    if (result.error) setError(result.error.message)
    else navigate('/admin')
  }
  return <div className="admin-auth"><div className="auth-card"><span className="auth-logo">KF</span><span className="section-kicker">TEAM INVITATION</span><h1>অ্যাকাউন্ট সেটআপ</h1>{!ready ? <p>{error || 'আমন্ত্রণ যাচাই হচ্ছে…'}</p> : <><p>ড্যাশবোর্ডে প্রবেশের জন্য আপনার পাসওয়ার্ড তৈরি করুন।</p><form onSubmit={finish}><label>নতুন পাসওয়ার্ড<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e => setPassword(e.target.value)} /></label><label>আবার লিখুন<input type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e => setConfirm(e.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn btn-dark" disabled={busy}>{busy ? 'সেভ হচ্ছে…' : 'পাসওয়ার্ড সেভ করুন'}</button></form></>}<Link to="/admin/login" className="back-link">লগইনে ফিরুন</Link></div></div>
}
