import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronDown, LockKeyhole, Menu, Minus, Plus, ShieldCheck, ShoppingBag, Truck, X } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { configured, demoProduct, demoSettings, demoZones, loadStore, money, supabase, type Product, type PublicSettings, type Zone } from './lib'

type Store = { product: Product; zones: Zone[]; settings: PublicSettings }

function DemoBanner() {
  return <div className="demo-banner">ডেমো স্টোর · পণ্যের বিবরণ, মূল্য ও নীতিমালা প্রকাশের আগে যাচাই করুন</div>
}

function Header({ brand, onOrder }: { brand: string; onOrder?: () => void }) {
  const [menu, setMenu] = useState(false)
  return <header className="site-header">
    <div className="container header-inner">
      <Link to="/" className="brand" aria-label={`${brand} হোম`}><img className="brand-logo" src="/karana-logo.jpg" alt="" /><span className="brand-name">{brand}</span></Link>
      <nav className={menu ? 'nav-links open' : 'nav-links'} aria-label="প্রধান নেভিগেশন">
        <Link onClick={() => setMenu(false)} to="/#product">প্রোডাক্ট</Link>
        <Link onClick={() => setMenu(false)} to="/#details">বিস্তারিত</Link>
        <Link onClick={() => setMenu(false)} to="/#delivery">ডেলিভারি</Link>
        <button className="nav-order" onClick={() => { setMenu(false); onOrder?.() }}>অর্ডার করুন <ArrowRight size={15} /></button>
      </nav>
      <button className="mobile-menu" aria-label={menu ? 'মেনু বন্ধ করুন' : 'মেনু খুলুন'} onClick={() => setMenu(!menu)}>{menu ? <X size={24} /> : <Menu size={24} />}</button>
    </div>
  </header>
}

function ProductVisual({ image, small = false }: { image?: string; small?: boolean }) {
  if (image) return <img className={small ? 'product-photo small' : 'product-photo'} src={image} alt="পণ্যের ছবি" />
  return <div className={small ? 'product-visual small' : 'product-visual'} aria-label="ডেমো পণ্যের অলংকারমূলক ছবি">
    <div className="visual-ring" />
    <div className="bag-handle" />
    <div className="bag-body"><div className="bag-wordmark">KARANA<br /><span>FASHION</span></div></div>
    {!small && <div className="visual-caption">DEMO PRODUCT VISUAL</div>}
  </div>
}

function Footer({ settings, demo = false }: { settings: PublicSettings; demo?: boolean }) {
  return <footer className="footer"><div className="container footer-grid"><div><div className="footer-brand"><img className="footer-logo" src="/karana-logo.jpg" alt="" />{settings.brand_name}</div><p>একটি সহজ ও সুন্দর কেনাকাটার অভিজ্ঞতা।</p>{demo && <span className="footer-note">এই সাইটে প্রদর্শিত পণ্যের তথ্য ডেমো হিসেবে চিহ্নিত, যতক্ষণ না বাস্তব তথ্য যোগ করা হয়।</span>}</div><div><h4>সহায়তা</h4><Link to="/policy/return">রিটার্ন ও রিফান্ড</Link><Link to="/policy/privacy">প্রাইভেসি পলিসি</Link><Link to="/policy/terms">শর্তাবলি</Link></div><div><h4>যোগাযোগ</h4><p>{settings.contact_phone || 'যোগাযোগের নম্বর যোগ করা হয়নি'}</p><p>{settings.support_hours}</p></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} {settings.brand_name}</span></div></footer>
}

export function Storefront() {
  const [store, setStore] = useState<Store>({ product: demoProduct, zones: demoZones, settings: demoSettings })
  const [loading, setLoading] = useState(configured)
  const [loadError, setLoadError] = useState('')
  const [selectedVariant, setSelectedVariant] = useState(demoProduct.variants[0]?.id ?? '')
  const [selectedZone, setSelectedZone] = useState(demoZones[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [form, setForm] = useState({ name: '', phone: '', district: '', area: '', address: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let alive = true
    loadStore().then(data => {
      if (!alive) return
      setStore(data)
      setSelectedVariant(data.product.variants[0]?.id ?? '')
      setSelectedZone(data.zones[0]?.id ?? '')
    }).catch(error => { if (alive) setLoadError(error.message || 'পণ্য লোড করা যায়নি।') }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const { product, zones, settings } = store
  const variant = product.variants.find(item => item.id === selectedVariant) ?? product.variants[0]
  const variantPhotos = product.variants.filter(item => item.image_url)
  const galleryPhotos = variant?.image_url ? product.image_urls : product.image_urls.slice(1)
  const currentImage = activeImage === 0 ? (variant?.image_url || product.image_urls[0]) : galleryPhotos[activeImage - 1]
  const zone = zones.find(item => item.id === selectedZone) ?? zones[0]
  const total = useMemo(() => (variant?.price ?? 0) * quantity + (zone?.fee ?? 0), [variant, zone, quantity])
  const isDemo = !configured || product.is_demo
  const scrollToOrder = () => document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' })
  const chooseVariant = (id: string) => { setSelectedVariant(id); setActiveImage(0); setQuantity(1) }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || !supabase || isDemo || !variant || !zone) return
    const phone = form.phone.trim().replace(/[\s-]/g, '')
    if (!/^01[3-9][0-9]{8}$/.test(phone)) { setSubmitError('সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন।'); return }
    setSubmitting(true)
    setSubmitError('')
    const key = sessionStorage.getItem('karana-order-key') ?? crypto.randomUUID()
    sessionStorage.setItem('karana-order-key', key)
    try {
      const { data, error } = await supabase.functions.invoke('place-order', {
        body: { submission_key: key, variant_id: variant.id, quantity, zone_id: zone.id, name: form.name.trim(), phone, district: form.district.trim(), area: form.area.trim(), address: form.address.trim() },
      })
      if (error) throw new Error((data && typeof data === 'object' && 'error' in data ? String(data.error) : '') || error.message)
      if (!data?.reference) throw new Error('অর্ডার নিশ্চিত করা যায়নি। আবার চেষ্টা করুন।')
      sessionStorage.removeItem('karana-order-key')
      navigate(`/order-success?ref=${encodeURIComponent(data.reference)}`)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'অর্ডার জমা দেওয়া যায়নি। আবার চেষ্টা করুন।')
    } finally { setSubmitting(false) }
  }

  return <>
    {isDemo && <DemoBanner />}
    {loadError && <div className="setup-alert" role="alert">ডেমো প্রিভিউ — লাইভ স্টোরের ডেটা এখনো লোড হয়নি। সেটআপ নির্দেশনা README.md-তে আছে।</div>}
    <Header brand={settings.brand_name} onOrder={scrollToOrder} />
    <main>
      <section className="hero" id="product"><div className="container hero-grid">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> {product.category || 'KARANA EDITION'} <span className="eyebrow-line" /></div><h1>প্রতিদিনের সঙ্গে<br /><em>একটু আলাদা।</em></h1><p className="hero-description">{product.subtitle}</p><div className="hero-price"><span>{money(variant?.price ?? 0)}</span>{variant?.compare_at_price && <del>{money(variant.compare_at_price)}</del>}</div><div className="hero-actions"><button className="btn btn-dark" onClick={scrollToOrder}>অর্ডার করুন <ArrowRight size={19} /></button><a href="#details" className="text-link">বিস্তারিত দেখুন <ArrowRight size={16} /></a></div><div className="hero-assurances"><span><Truck size={18} /> ক্যাশ অন ডেলিভারি</span><span><ShieldCheck size={18} /> নিরাপদ অর্ডার</span></div></div>
        <div className="hero-art"><div className="art-label">EVERYDAY<br />ESSENTIALS</div><ProductVisual image={currentImage} /><div className="hero-art-tag">{String(activeImage + 1).padStart(2, '0')} / {String(Math.max(galleryPhotos.length + 1, 1)).padStart(2, '0')}</div></div>
      </div></section>

      <div className="marquee"><div>THOUGHTFUL EVERYDAY STYLE <span>✦</span> KARANA FASHION <span>✦</span> MADE FOR YOUR MOMENTS <span>✦</span> THOUGHTFUL EVERYDAY STYLE</div></div>

      <section className="section product-section" id="details"><div className="container product-grid"><div className="product-gallery"><div className="gallery-main"><ProductVisual image={currentImage} /></div>{(variantPhotos.length > 0 || galleryPhotos.length > 0) && <div className="gallery-thumbs" aria-label="রং ও ডিজাইনের ছবি">{variantPhotos.map(item => <button key={item.id} className={activeImage === 0 && item.id === variant?.id ? 'active' : ''} onClick={() => chooseVariant(item.id)} aria-label={`${item.label} ডিজাইন দেখুন`} title={item.label}><img src={item.image_url} alt="" /></button>)}{galleryPhotos.map((url, index) => <button key={`${url}-${index}`} className={activeImage === index + 1 ? 'active' : ''} onClick={() => setActiveImage(index + 1)} aria-label={`অতিরিক্ত ছবি ${index + 1} দেখুন`}><img src={url} alt="" /></button>)}</div>}</div><div className="product-info"><span className="section-kicker">{product.category || 'THE PRODUCT'}</span><h2>{product.name}</h2><p className="info-description">{product.description}</p><div className="detail-list"><h3>পণ্যের বিস্তারিত</h3>{product.details.map(detail => <div key={detail}><Check size={17} /> <span>{detail}</span></div>)}</div><div className="inline-note"><LockKeyhole size={20} /><span>আপনার অর্ডারের তথ্য কেবল অর্ডার প্রক্রিয়ায় ব্যবহৃত হবে।</span></div></div></div></section>

      <section className="editorial-section"><div className="container editorial-grid"><div><span className="section-kicker light">MADE FOR EVERY DAY</span><h2>আপনার দিনের<br /><em>নিজস্ব স্টাইল।</em></h2></div><p>পণ্যের প্রকৃত উপাদান, মাপ, যত্নের নির্দেশনা এবং ব্যবহার সম্পর্কে যাচাই করা তথ্য এখানে যোগ করুন। গ্রাহক যেন কেনার আগে পরিষ্কার ধারণা পান।</p></div></section>

      <section className="section checkout-section" id="order"><div className="container"><div className="section-heading"><span className="section-kicker">EASY CHECKOUT</span><h2>আপনার অর্ডার দিন</h2><p>তথ্য পূরণ করুন। নিশ্চিত করার আগে মোট মূল্য দেখে নিন।</p></div><div className="checkout-grid"><div className="checkout-form-card"><form onSubmit={submitOrder}><h3>১. পণ্য নির্বাচন</h3><label className="field-label">রঙ / ভ্যারিয়েশন</label><div className="variant-options">{product.variants.map(item => <button type="button" key={item.id} className={selectedVariant === item.id ? 'variant selected' : 'variant'} disabled={item.stock < 1} onClick={() => chooseVariant(item.id)}>{item.image_url ? <img className="variant-photo" src={item.image_url} alt="" /> : <span className="variant-dot" />}<span>{item.label}</span>{item.stock < 1 && <small>স্টক শেষ</small>}</button>)}</div><label className="field-label">পরিমাণ</label><div className="quantity-control"><button type="button" aria-label="পরিমাণ কমান" disabled={quantity <= 1} onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button><span>{quantity}</span><button type="button" aria-label="পরিমাণ বাড়ান" disabled={quantity >= Math.min(10, variant?.stock ?? 0)} onClick={() => setQuantity(Math.min(10, variant?.stock ?? 0, quantity + 1))}><Plus size={16} /></button></div><div className="form-divider" /><h3>২. ডেলিভারি তথ্য</h3><div className="field-grid"><label>আপনার নাম *<input required maxLength={80} autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="সম্পূর্ণ নাম" /></label><label>মোবাইল নম্বর *<input required inputMode="tel" pattern="01[3-9][0-9]{8}" maxLength={11} autoComplete="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" /></label><label>জেলা *<input required maxLength={80} value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} placeholder="আপনার জেলা" /></label><label>এলাকা *<input required maxLength={100} value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder="থানা / এলাকা" /></label></div><label className="full-label">সম্পূর্ণ ঠিকানা *<textarea required maxLength={300} rows={3} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="বাসা, রোড, এলাকা ও প্রয়োজনীয় নির্দেশনা" /></label><label className="full-label">ডেলিভারি এলাকা *<span className="select-wrap"><select required value={selectedZone} onChange={e => setSelectedZone(e.target.value)}>{zones.map(item => <option key={item.id} value={item.id}>{item.label} — {money(item.fee)}</option>)}</select><ChevronDown size={18} /></span></label><div className="payment-choice"><span className="payment-icon"><ShoppingBag size={19} /></span><div><strong>ক্যাশ অন ডেলিভারি</strong><small>পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন</small></div><Check size={17} /></div>{submitError && <p className="form-error" role="alert">{submitError}</p>}<button className="btn btn-dark submit-btn" type="submit" disabled={submitting || loading || isDemo || !variant || variant.stock < 1 || !zone}>{submitting ? 'অর্ডার জমা হচ্ছে…' : isDemo ? 'ডেমো মোডে অর্ডার বন্ধ' : 'অর্ডার নিশ্চিত করুন'} <ArrowRight size={18} /></button>{isDemo && <p className="demo-hint">আসল অর্ডার চালু করতে Supabase সংযোগ ও অনুমোদিত পণ্যের তথ্য যোগ করুন।</p>}</form></div><aside className="order-summary"><h3>অর্ডার সারাংশ</h3><div className="summary-product"><ProductVisual small image={variant?.image_url || product.image_urls[0]} /><div><strong>{product.name}</strong><span>{variant?.label || 'ভ্যারিয়েশন নেই'}</span><span>পরিমাণ: {quantity}</span></div></div><div className="summary-row"><span>পণ্যের মূল্য</span><strong>{money((variant?.price ?? 0) * quantity)}</strong></div><div className="summary-row"><span>ডেলিভারি চার্জ</span><strong>{money(zone?.fee ?? 0)}</strong></div><div className="summary-total"><span>মোট</span><strong>{money(total)}</strong></div><div className="summary-info"><Truck size={19} /><p>{settings.delivery_note}</p></div><div className="summary-info"><ShieldCheck size={19} /><p>মূল্য ও স্টক সার্ভারে পুনরায় যাচাই করে অর্ডার গ্রহণ করা হয়।</p></div></aside></div></div></section>

      <section className="support-strip" id="delivery"><div className="container support-inner"><div><span className="section-kicker">NEED HELP?</span><h2>আপনার প্রশ্নের উত্তর<br />পেতে যোগাযোগ করুন।</h2></div><div><p>{settings.contact_phone || 'যোগাযোগের নম্বর এখনো যোগ করা হয়নি'}</p><span>{settings.support_hours}</span></div></div></section>
    </main><Footer settings={settings} demo={isDemo} />
  </>
}

export function SuccessPage() {
  const [params] = useSearchParams()
  const reference = params.get('ref')
  const [settings, setSettings] = useState(demoSettings)
  useEffect(() => { loadStore().then(data => setSettings(data.settings)).catch(() => {}) }, [])
  return <><Header brand={settings.brand_name} /><main className="success-page"><div className="success-icon"><Check size={34} /></div><span className="section-kicker">ORDER RECEIVED</span><h1>ধন্যবাদ! আপনার অর্ডার<br />গ্রহণ করা হয়েছে।</h1><p>আমাদের টিম আপনার অর্ডারটি যাচাই করবে। প্রয়োজনে দেওয়া নম্বরে যোগাযোগ করা হবে।</p>{reference && <div className="reference-box"><span>অর্ডার রেফারেন্স</span><strong>{reference}</strong></div>}<Link className="btn btn-dark" to="/">হোমে ফিরুন <ArrowRight size={18} /></Link></main><Footer settings={settings} /></>
}

export function PolicyPage() {
  const { kind } = useParams()
  const [settings, setSettings] = useState(demoSettings)
  useEffect(() => { loadStore().then(data => setSettings(data.settings)).catch(() => {}) }, [])
  const title = kind === 'return' ? 'রিটার্ন ও রিফান্ড' : kind === 'privacy' ? 'প্রাইভেসি পলিসি' : 'শর্তাবলি'
  const content = kind === 'return' ? settings.return_policy : kind === 'privacy' ? settings.privacy_policy : settings.terms
  return <><Header brand={settings.brand_name} /><main className="policy-page container"><Link className="back-link" to="/"><ArrowLeft size={16} /> হোমে ফিরুন</Link><span className="section-kicker">CUSTOMER INFORMATION</span><h1>{title}</h1><div className="policy-content">{content.split('\n').map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div></main><Footer settings={settings} /></>
}
