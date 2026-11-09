import { useState, type ChangeEvent } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react'
import { supabase } from './lib'

const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const maxBytes = 5 * 1024 * 1024

export function VariantImage({ productId, variantId, url, onChange }: { productId: string; variantId: string; url: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !supabase) return
    if (!acceptedTypes.has(file.type) || file.size > maxBytes) { setError('JPG, PNG, WebP বা AVIF ছবি দিন (সর্বোচ্চ ৫ MB)।'); return }
    setUploading(true); setError('')
    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
    const path = `${productId}/variants/${variantId}/${crypto.randomUUID()}.${extension}`
    const result = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type, upsert: false })
    if (result.error) setError(`ছবি আপলোড হয়নি: ${result.error.message}`)
    else onChange(supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl)
    setUploading(false)
  }

  return <div className="variant-image-editor"><span>এই ডিজাইনের ছবি</span>{url && <img src={url} alt="নির্বাচিত ডিজাইনের ছবি" />}<label className="image-upload-button"><ImagePlus size={17} /> {uploading ? 'আপলোড হচ্ছে…' : url ? 'ছবি বদলান' : 'লোকাল ফোল্ডার থেকে ছবি দিন'}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} onChange={upload} /></label>{url && <button className="variant-image-remove" type="button" onClick={() => onChange('')}>ছবি সরান</button>}{error && <p className="form-error" role="alert">{error}</p>}</div>
}

export function ProductImages({ productId, urls, onChange }: { productId: string; urls: string[]; onChange: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length || !supabase) return
    setUploading(true)
    setError('')
    const next = [...urls]
    for (const file of files) {
      if (!acceptedTypes.has(file.type) || file.size > maxBytes) {
        setError('শুধু JPG, PNG, WebP বা AVIF ছবি (প্রতি ছবি সর্বোচ্চ ৫ MB) আপলোড করুন।')
        continue
      }
      const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
      const path = `${productId}/${crypto.randomUUID()}.${extension}`
      const result = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type, upsert: false })
      if (result.error) { setError(`ছবি আপলোড হয়নি: ${result.error.message}`); continue }
      next.push(supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl)
    }
    onChange(next)
    setUploading(false)
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= urls.length) return
    const next = [...urls]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return <div className="product-images-editor">
    <h2>পণ্যের ছবি</h2>
    <p>আপনার কম্পিউটার থেকে ছবি বেছে নিন। প্রথম ছবিটি প্রধান ছবি হিসেবে দেখানো হবে। ছবি আপলোডের পর উপরের “সেভ করুন” চাপুন।</p>
    <label className="image-upload-button"><ImagePlus size={18} /> {uploading ? 'আপলোড হচ্ছে…' : 'লোকাল ফোল্ডার থেকে ছবি যোগ করুন'}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={uploading} onChange={upload} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="product-image-grid">{urls.map((url, index) => <div className="product-image-card" key={`${url}-${index}`}>
      <img src={url} alt={`পণ্যের ছবি ${index + 1}`} />
      <div><span>{index === 0 ? 'প্রধান ছবি' : `ছবি ${index + 1}`}</span><span className="image-actions"><button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label="আগে নিন"><ArrowUp size={16} /></button><button type="button" disabled={index === urls.length - 1} onClick={() => move(index, 1)} aria-label="পরে নিন"><ArrowDown size={16} /></button><button type="button" onClick={() => onChange(urls.filter((_, i) => i !== index))} aria-label="ছবি তালিকা থেকে সরান"><Trash2 size={16} /></button></span></div>
    </div>)}</div>
    <small>তালিকা থেকে সরালে ছবি আর সাইটে দেখাবে না। Storage থেকে স্থায়ীভাবে মুছবে না।</small>
  </div>
}
