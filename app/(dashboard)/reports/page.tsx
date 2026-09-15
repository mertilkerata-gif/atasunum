'use client'
import { useState, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchDailyRevenue, fetchComplaints, fetchAllPulseScores, insertAuditLog } from '@/lib/supabase-client'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { FileText, Download, TrendingUp, AlertCircle, DollarSign, RefreshCw } from 'lucide-react'

const REPORT_TYPES = [
  { id: 'daily',      label: 'Günlük Özet',         Icon: FileText,    desc: 'Bugünkü operasyon raporu' },
  { id: 'revenue',    label: 'Ciro Analizi',         Icon: DollarSign,  desc: '7 günlük gelir dağılımı' },
  { id: 'complaints', label: 'Şikayet Raporu',       Icon: AlertCircle, desc: 'Şikayet türü ve dağılımı' },
  { id: 'pulse',      label: 'Nabız Geçmişi',        Icon: TrendingUp,  desc: 'Restoran risk seyri' },
]

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--bdr2)', borderRadius: 10, padding: '8px 12px' }}>
      <p style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontSize: 12, fontWeight: 600, color: p.color || 'var(--tx)', fontFamily: 'JetBrains Mono,monospace' }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const [active, setActive] = useState('daily')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      if (active === 'revenue') {
        const rv = await fetchDailyRevenue(undefined, 7)
        const byDate = [...new Set(rv.map((r: any) => r.date))].sort().map(date => ({
          label: new Date(date as string).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }),
          total: rv.filter((r: any) => r.date === date).reduce((s: number, r: any) => s + (r.total_revenue ?? 0), 0),
          tiklagelsin: rv.filter((r: any) => r.date === date).reduce((s: number, r: any) => s + (r.tiklagelsin_revenue ?? 0), 0),
        }))
        setData(byDate)
      } else if (active === 'complaints') {
        const c = await fetchComplaints()
        const reasons: Record<string, number> = {}
        c.forEach((x: any) => { reasons[x.reason] = (reasons[x.reason] ?? 0) + 1 })
        setData(Object.entries(reasons).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count))
      } else if (active === 'pulse') {
        const ps = await fetchAllPulseScores()
        setData(ps.map((p: any) => {
          const r = RESTAURANTS.find(x => x.id === p.restaurant_id)
          return { label: r?.name.replace('Burger King ', 'BK ').replace('Popeyes ', 'Pop.') ?? p.restaurant_id, score: p.score, risk: p.risk_level }
        }).sort((a: any, b: any) => b.score - a.score))
      } else {
        const [rv, c, ps] = await Promise.all([fetchDailyRevenue(undefined, 1), fetchComplaints(), fetchAllPulseScores()])
        const today = rv.filter((r: any) => r.date === new Date().toISOString().split('T')[0])
        setData([
          { label: 'Toplam Ciro', value: today.reduce((s: number, r: any) => s + (r.total_revenue ?? 0), 0).toLocaleString('tr-TR') + ' ₺' },
          { label: 'Sipariş Sayısı', value: today.reduce((s: number, r: any) => s + (r.order_count ?? 0), 0) },
          { label: 'Açık Şikayet', value: c.filter((x: any) => x.status === 'OPEN').length },
          { label: 'Kritik Restoran', value: ps.filter((p: any) => p.risk_level === 'KRITIK').length },
          { label: 'Ort. Nabız', value: ps.length ? Math.round(ps.reduce((s: number, p: any) => s + p.score, 0) / ps.length) : 0 },
        ])
      }
      await insertAuditLog({ user_role: '', action: 'GENERATE_REPORT', resource: 'reports', details: { type: active } })
      setGenerated(true)
    } finally { setLoading(false) }
  }, [active])

  const exportCSV = async () => {
    const url = `/api/reports/export?type=${active}`
    await insertAuditLog({ user_role: '', action: 'EXPORT', resource: 'reports', details: { type: active, format: 'csv' } })
    window.open(url, '_blank')
  }

  return (
    <div className="dm">
      <Topbar title="Raporlar" subtitle="Veri dışa aktarma ve analiz"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {generated && <button onClick={exportCSV} className="btn-ghost" style={{ padding: '5px 12px', fontSize: 12 }}><Download size={12}/> CSV İndir</button>}
            <button onClick={generate} disabled={loading} className="btn" style={{ padding: '6px 14px', fontSize: 12 }}>
              {loading ? '…' : <><RefreshCw size={12}/> Oluştur</>}
            </button>
          </div>
        }
      />
      <div className="scroll" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Rapor tipi seç */}
          <div className="card">
            {REPORT_TYPES.map(({ id, label, Icon, desc }) => (
              <button key={id} onClick={() => { setActive(id); setGenerated(false); setData([]) }}
                className={`sb-item ${active === id ? 'active' : ''}`}
                style={{ width: '100%', margin: '2px 0', flexDirection: 'column', alignItems: 'flex-start', padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="sb-icon"><Icon size={14} strokeWidth={1.8}/></span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 3, paddingLeft: 22 }}>{desc}</p>
              </button>
            ))}
          </div>

          {/* Rapor içeriği */}
          <div className="card">
            <div className="card-h">
              <span className="card-title">{REPORT_TYPES.find(r => r.id === active)?.label}</span>
              {generated && <span className="badge badge-green">Hazır</span>}
            </div>
            <div style={{ padding: '20px' }}>
              {!generated ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <FileText size={36} style={{ color: 'var(--tx3)', margin: '0 auto 12px', display: 'block', opacity: .4 }}/>
                  <p style={{ fontSize: 14, color: 'var(--tx2)', marginBottom: 6 }}>Raporu Oluştur</p>
                  <p style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 20 }}>Supabase'den anlık veri çeker</p>
                  <button onClick={generate} disabled={loading} className="btn" style={{ margin: '0 auto' }}>
                    {loading ? 'Yükleniyor…' : 'Raporu Oluştur'}
                  </button>
                </div>
              ) : active === 'daily' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                  {data.map(({ label, value }) => (
                    <div key={label} style={{ background: 'var(--s2)', border: '1px solid var(--bdr)', borderRadius: 12, padding: '18px', textAlign: 'center' }}>
                      <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', color: 'var(--ac)', letterSpacing: '-.04em', marginBottom: 6 }}>{value}</p>
                      <p style={{ fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</p>
                    </div>
                  ))}
                </div>
              ) : active === 'revenue' ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--s4)" vertical={false}/>
                    <XAxis dataKey="label" tick={{ fill: 'var(--tx3)', fontSize: 10 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill: 'var(--tx3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`}/>
                    <Tooltip content={<TT/>}/>
                    <Bar dataKey="tiklagelsin" name="Tıkla Gelsin" stackId="a" fill="var(--amber)" radius={[0,0,0,0]}/>
                    <Bar dataKey="total" name="Restoran" stackId="b" fill="var(--ac)" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              ) : active === 'complaints' ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--s4)" horizontal={false}/>
                    <XAxis type="number" tick={{ fill: 'var(--tx3)', fontSize: 10 }} axisLine={false} tickLine={false}/>
                    <YAxis dataKey="label" type="category" tick={{ fill: 'var(--tx2)', fontSize: 11 }} axisLine={false} tickLine={false} width={100}/>
                    <Tooltip content={<TT/>}/>
                    <Bar dataKey="count" name="Şikayet" fill="var(--red)" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div>
                  {data.map((d: any, i: number) => (
                    <div key={i} className="row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12.5, color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
                      <div style={{ width: 120 }}>
                        <div className="prog"><div className="prog-fill" style={{ width: `${d.score}%`, background: d.risk === 'KRITIK' ? 'var(--red)' : d.risk === 'RISKLI' ? 'var(--amber)' : 'var(--green)' }}/></div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', color: d.risk === 'KRITIK' ? 'var(--red)' : d.risk === 'RISKLI' ? 'var(--amber)' : 'var(--green)', width: 28, textAlign: 'right', flexShrink: 0 }}>{d.score}</span>
                      <span className={`badge badge-${d.risk === 'KRITIK' ? 'red' : d.risk === 'RISKLI' ? 'amber' : 'green'}`} style={{ fontSize: 10, flexShrink: 0 }}>{d.risk}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
