import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, BarChart3, Check, ShoppingBag, X } from 'lucide-react'
import { money, supabase } from './lib'

type ReportOrder = { id: string; status: string; total: number; quantity: number; created_at: string }
type Period = 'week' | 'month'

const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const shortDate = (date: Date) => new Intl.DateTimeFormat('bn-BD', { day: 'numeric', month: 'short' }).format(date)

function windowFor(period: Period, anchor: string) {
  const [year, month, day] = anchor.split('-').map(Number)
  const start = new Date(year, month - 1, period === 'month' ? 1 : day)
  if (period === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const end = new Date(start)
  if (period === 'week') end.setDate(end.getDate() + 7)
  else end.setMonth(end.getMonth() + 1)
  return { start, end }
}

export function SalesReports() {
  const [period, setPeriod] = useState<Period>('week')
  const [anchor, setAnchor] = useState(() => localDate(new Date()))
  const [orders, setOrders] = useState<ReportOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { start, end } = useMemo(() => windowFor(period, anchor), [period, anchor])

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError('')
      const all: ReportOrder[] = []
      for (let offset = 0; ; offset += 500) {
        const { data, error: queryError } = await supabase!.from('orders')
          .select('id,status,total,quantity,created_at')
          .gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
          .order('created_at', { ascending: true }).order('id', { ascending: true }).range(offset, offset + 499)
        if (!alive) return
        if (queryError) { setError('রিপোর্ট লোড করা যায়নি। আবার চেষ্টা করুন।'); setLoading(false); return }
        all.push(...(data as ReportOrder[]))
        if (!data || data.length < 500) break
      }
      if (alive) { setOrders(all); setLoading(false) }
    }
    void load()
    return () => { alive = false }
  }, [start.getTime(), end.getTime()])

  const delivered = orders.filter(order => order.status === 'delivered')
  const deliveredSales = delivered.reduce((sum, order) => sum + Number(order.total), 0)
  const placedValue = orders.reduce((sum, order) => sum + Number(order.total), 0)
  const cancelled = orders.filter(order => order.status === 'cancelled' || order.status === 'returned').length
  const units = delivered.reduce((sum, order) => sum + order.quantity, 0)
  const buckets = [] as { label: string; count: number; delivered: number; sales: number }[]
  for (let cursor = new Date(start); cursor < end;) {
    const next = new Date(cursor)
    next.setDate(next.getDate() + (period === 'week' ? 1 : 7))
    if (next > end) next.setTime(end.getTime())
    const rows = orders.filter(order => { const time = new Date(order.created_at); return time >= cursor && time < next })
    buckets.push({
      label: period === 'week' ? shortDate(cursor) : `${shortDate(cursor)}–${shortDate(new Date(next.getTime() - 1))}`,
      count: rows.length,
      delivered: rows.filter(order => order.status === 'delivered').length,
      sales: rows.filter(order => order.status === 'delivered').reduce((sum, order) => sum + Number(order.total), 0),
    })
    cursor = next
  }
  const maxSales = Math.max(1, ...buckets.map(bucket => bucket.sales))

  function downloadCsv() {
    const rows = [['Period', 'Orders', 'Delivered', 'Delivered sales (BDT)'], ...buckets.map(bucket => [bucket.label, String(bucket.count), String(bucket.delivered), String(bucket.sales)])]
    const csv = '\uFEFF' + rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `karana-${period}-report-${localDate(start)}.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <><div className="admin-page-head"><div><span className="admin-eyebrow">SALES PERFORMANCE</span><h1>বিক্রয় রিপোর্ট</h1><p>নির্বাচিত সময়ে তৈরি অর্ডারগুলোর মধ্যে বর্তমানে ডেলিভারি সম্পন্ন অর্ডারের মূল্যকে বিক্রয় আয় ধরা হয়েছে।</p></div><button className="btn btn-outline" onClick={downloadCsv} disabled={loading || Boolean(error)}><ArrowDownToLine size={17} /> CSV ডাউনলোড</button></div>
    <div className="admin-panel report-controls"><label>সময়কাল<select value={period} onChange={event => setPeriod(event.target.value as Period)}><option value="week">সাপ্তাহিক</option><option value="month">মাসিক</option></select></label><label>{period === 'week' ? 'সপ্তাহের একটি দিন' : 'মাস'}<input type={period === 'week' ? 'date' : 'month'} value={period === 'week' ? anchor : anchor.slice(0, 7)} onChange={event => { if (event.target.value) setAnchor(period === 'week' ? event.target.value : `${event.target.value}-01`) }} /></label><span>{shortDate(start)} – {shortDate(new Date(end.getTime() - 1))}</span></div>
    {error && <p className="admin-notice error" role="alert">{error}</p>}
    <div className="stat-grid"><ReportStat icon={<ShoppingBag size={22} />} label="মোট অর্ডার" value={loading ? '…' : String(orders.length)} /><ReportStat icon={<Check size={22} />} label="ডেলিভারি হয়েছে" value={loading ? '…' : String(delivered.length)} /><ReportStat icon={<BarChart3 size={22} />} label="বিক্রয় আয়" value={loading ? '…' : money(deliveredSales)} /><ReportStat icon={<X size={22} />} label="বাতিল/রিটার্ন" value={loading ? '…' : String(cancelled)} /></div>
    <div className="admin-panel report-details"><div><span>অর্ডারের মোট মূল্য</span><strong>{loading ? '…' : money(placedValue)}</strong></div><div><span>ডেলিভারি হওয়া পিস</span><strong>{loading ? '…' : String(units)}</strong></div><div><span>গড় ডেলিভারি অর্ডার</span><strong>{loading ? '…' : money(delivered.length ? deliveredSales / delivered.length : 0)}</strong></div><div><span>ডেলিভারি হার</span><strong>{loading ? '…' : `${orders.length ? Math.round(delivered.length / orders.length * 100) : 0}%`}</strong></div></div>
    <section className="admin-panel"><div className="panel-header"><h2>{period === 'week' ? 'প্রতিদিনের' : 'প্রতি সাত দিনের'} বিক্রয়</h2></div><div className="report-bars">{buckets.map(bucket => <div key={bucket.label}><span>{bucket.label}</span><div><i style={{ width: `${bucket.sales / maxSales * 100}%` }} /></div><strong>{money(bucket.sales)}</strong><small>{bucket.delivered}/{bucket.count} অর্ডার</small></div>)}</div></section>
  </>
}

function ReportStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><span>{label}</span><strong>{value}</strong></div>
}
