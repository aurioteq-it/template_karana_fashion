import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configured = Boolean(url && anonKey && !url.includes('YOUR_PROJECT'))
export const supabase: SupabaseClient | null = configured ? createClient(url!, anonKey!) : null

export type Variant = { id: string; label: string; sku: string; image_url: string; price: number; compare_at_price: number | null; stock: number }
export type Product = {
  id: string
  name: string
  category: string
  subtitle: string
  description: string
  details: string[]
  image_urls: string[]
  variants: Variant[]
  active: boolean
  is_demo: boolean
}
export type Zone = { id: string; label: string; fee: number; active: boolean }
export type PublicSettings = {
  brand_name: string
  contact_phone: string
  support_hours: string
  delivery_note: string
  return_policy: string
  privacy_policy: string
  terms: string
  facebook_pixel_id: string
  facebook_domain_verification: string
  google_analytics_id: string
  google_tag_manager_id: string
  google_domain_verification: string
  tracking_enabled: boolean
}

export const demoProduct: Product = {
  id: 'demo-product',
  name: 'এভরিডে টোট ব্যাগ',
  category: 'ডেমো ফ্যাশন',
  subtitle: 'দৈনন্দিন ব্যবহারের জন্য একটি সহজ, পরিপাটি ডিজাইন',
  description: 'এটি প্রদর্শনের জন্য ডেমো পণ্য। আসল পণ্যের ছবি, উপাদান, মাপ ও বিবরণ প্রকাশের আগে যোগ করুন।',
  details: ['ডেমো পণ্য — প্রকৃত স্পেসিফিকেশন যোগ করুন', 'পণ্যের আসল ছবি ও মাপ যোগ করুন', 'মূল্য ও স্টক প্রকাশের আগে যাচাই করুন'],
  image_urls: [],
  is_demo: true,
  variants: [
    { id: 'demo-sand', label: 'স্যান্ড', sku: 'DEMO-SAND', image_url: '', price: 1290, compare_at_price: null, stock: 12 },
    { id: 'demo-olive', label: 'অলিভ', sku: 'DEMO-OLIVE', image_url: '', price: 1290, compare_at_price: null, stock: 8 },
    { id: 'demo-black', label: 'ব্ল্যাক', sku: 'DEMO-BLACK', image_url: '', price: 1290, compare_at_price: null, stock: 10 },
  ],
  active: true,
}

export const demoZones: Zone[] = [
  { id: 'demo-dhaka', label: 'ঢাকা শহর', fee: 70, active: true },
  { id: 'demo-outside', label: 'ঢাকার বাইরে', fee: 130, active: true },
]

export const demoSettings: PublicSettings = {
  brand_name: 'Karana Fashion',
  contact_phone: '',
  support_hours: 'সাপোর্ট সময় প্রকাশের আগে যোগ করুন',
  delivery_note: 'ডেলিভারির সময় ও শর্ত প্রকাশের আগে নিশ্চিত করুন।',
  return_policy: 'ডেমো নীতি। ব্যবসার অনুমোদিত রিটার্ন ও রিফান্ড নীতি এখানে প্রকাশ করুন।',
  privacy_policy: 'ডেমো নীতি। গ্রাহকের তথ্য কীভাবে ব্যবহার ও সংরক্ষণ করা হবে তা ব্যবসার অনুমোদিত নীতিতে লিখুন।',
  terms: 'ডেমো শর্তাবলি। ব্যবসার অনুমোদিত বিক্রয় ও ডেলিভারি শর্ত এখানে লিখুন।',
  facebook_pixel_id: '',
  facebook_domain_verification: '',
  google_analytics_id: '',
  google_tag_manager_id: '',
  google_domain_verification: '',
  tracking_enabled: false,
}

export const money = (amount: number) => `৳${new Intl.NumberFormat('bn-BD').format(amount)}`

export async function loadStore(): Promise<{ product: Product; zones: Zone[]; settings: PublicSettings }> {
  if (!supabase) return { product: demoProduct, zones: demoZones, settings: demoSettings }
  const [productResult, zoneResult, settingsResult] = await Promise.all([
    supabase.from('products').select('id,name,category,subtitle,description,details,image_urls,active,is_demo,product_variants(*)').eq('active', true).limit(1).maybeSingle(),
    supabase.from('delivery_zones').select('id,label,fee,active').eq('active', true).order('fee'),
    supabase.from('public_business_settings').select('*').limit(1).maybeSingle(),
  ])
  if (productResult.error) throw productResult.error
  if (zoneResult.error) throw zoneResult.error
  if (settingsResult.error) throw settingsResult.error
  if (!productResult.data) throw new Error('কোনো প্রকাশিত পণ্য পাওয়া যায়নি।')
  const raw = productResult.data as unknown as Omit<Product, 'variants'> & { product_variants: Variant[] }
  return {
    product: { ...raw, variants: raw.product_variants.filter(v => (v as Variant & { active: boolean }).active).map(v => ({ ...v, image_url: v.image_url ?? '' })) },
    zones: (zoneResult.data ?? []) as Zone[],
    settings: (settingsResult.data ?? demoSettings) as PublicSettings,
  }
}
