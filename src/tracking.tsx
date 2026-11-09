import { useEffect, useState } from 'react'
import { supabase, type PublicSettings } from './lib'

type TrackingSettings = Pick<PublicSettings, 'facebook_pixel_id' | 'facebook_domain_verification' | 'google_analytics_id' | 'google_tag_manager_id' | 'google_domain_verification' | 'tracking_enabled'>
type PixelFunction = ((...args: unknown[]) => void) & { queue: unknown[][]; callMethod?: (...args: unknown[]) => void }
type TrackingWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; fbq?: PixelFunction }

function addScript(id: string, src: string) {
  if (document.getElementById(id)) return
  const script = document.createElement('script')
  script.id = id
  script.async = true
  script.src = src
  document.head.append(script)
}

function addVerification(name: string, value: string) {
  if (!value || !/^[A-Za-z0-9_-]{8,160}$/.test(value)) return
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!meta) { meta = document.createElement('meta'); meta.name = name; document.head.append(meta) }
  meta.content = value
}

function enableTracking(settings: TrackingSettings) {
  if (settings.google_tag_manager_id && /^GTM-[A-Z0-9]{4,20}$/.test(settings.google_tag_manager_id)) {
    const win = window as TrackingWindow
    win.dataLayer = win.dataLayer ?? []
    win.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
    addScript('karana-gtm', `https://www.googletagmanager.com/gtm.js?id=${settings.google_tag_manager_id}`)
  } else if (settings.google_analytics_id && /^G-[A-Z0-9]{4,20}$/.test(settings.google_analytics_id)) {
    const win = window as TrackingWindow
    win.dataLayer = win.dataLayer ?? []
    win.gtag = (...args: unknown[]) => { win.dataLayer!.push(args) }
    win.gtag('js', new Date())
    win.gtag('config', settings.google_analytics_id, { send_page_view: true })
    addScript('karana-ga4', `https://www.googletagmanager.com/gtag/js?id=${settings.google_analytics_id}`)
  }
  if (settings.facebook_pixel_id && /^\d{8,25}$/.test(settings.facebook_pixel_id)) {
    const win = window as TrackingWindow
    if (!win.fbq) {
      const fbq = ((...args: unknown[]) => { if (fbq.callMethod) fbq.callMethod(...args); else fbq.queue.push(args) }) as PixelFunction
      fbq.queue = []
      win.fbq = fbq
      fbq('init', settings.facebook_pixel_id)
      fbq('track', 'PageView')
      addScript('karana-meta-pixel', 'https://connect.facebook.net/en_US/fbevents.js')
    }
  }
}

export function TrackingConsent() {
  const [settings, setSettings] = useState<TrackingSettings | null>(null)
  const [choice, setChoice] = useState<string | null>(() => { try { return localStorage.getItem('karana-tracking-consent') } catch { return null } })
  useEffect(() => {
    if (!supabase) return
    let alive = true
    supabase.from('public_business_settings').select('facebook_pixel_id,facebook_domain_verification,google_analytics_id,google_tag_manager_id,google_domain_verification,tracking_enabled').limit(1).maybeSingle().then(({ data }) => {
      if (!alive || !data) return
      const next = data as TrackingSettings
      setSettings(next)
      addVerification('facebook-domain-verification', next.facebook_domain_verification)
      addVerification('google-site-verification', next.google_domain_verification)
    })
    return () => { alive = false }
  }, [])
  useEffect(() => { if (settings?.tracking_enabled && choice === 'yes') enableTracking(settings) }, [settings, choice])
  if (!settings?.tracking_enabled || choice) return null
  function decide(value: 'yes' | 'no') { try { localStorage.setItem('karana-tracking-consent', value) } catch { /* Keep the in-memory choice. */ } setChoice(value) }
  return <div className="tracking-consent" role="dialog" aria-label="Analytics সম্মতি"><p>সাইট ব্যবহার বোঝার জন্য Analytics ও বিজ্ঞাপনের tracking চালু করতে আপনার সম্মতি চাই। বিস্তারিত <a href="/policy/privacy">প্রাইভেসি পলিসিতে</a> দেখুন।</p><div><button type="button" onClick={() => decide('no')}>প্রত্যাখ্যান</button><button type="button" onClick={() => decide('yes')}>সম্মতি দিচ্ছি</button></div></div>
}
