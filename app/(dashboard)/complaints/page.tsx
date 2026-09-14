'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getComplaintSummary, getAllComplaintSummaries, REASON_LABELS } from '@/data/seed/complaints'
import { getPulseScore } from '@/data/seed/mock-data'
import { getRiskConfig } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts'
import { MessageSquare, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--bdr2)', borderRadius: 10, padding: '8px 12px' }}>
      <p style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontSize: 13, fontWeight: 600, color: p.color || 'var(--tx)', fontFamily: 'JetBrains Mono,monospace' }}>{p.value}{p.name === 'lostRevenue' ? ' ₺' : ''}</p>
      ))}
    </div>
  )
}

export default function ComplaintsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const allSummaries = getAllComplaintSummaries()
  const selected = selectedId ? getComplaintSummary(selectedId) : null
  const selectedRestaurant = selectedId ? RESTAURANTS.find(r => r.id === selectedId) : null

  const totalComplaints = allSummaries.reduce((s, c) => s + c.total, 0)
  const totalLost = allSummaries.reduce((s, c) => s + c.totalLostRevenue, 0)
  const avgRate = (allSummaries.reduce((s, c) => s + c.complaintRate, 0) / allSummaries.length * 100).toFixed(2)
  const ranked = [...allSummaries].sort((a, b) => b.total - a.total)
  const reasonData = Object.entries(REASON_LABELS).map(([key, label]) => ({
    label: label.length > 12 ? label.slice(0, 12) + '…' : label,
    count: allSummaries.reduce((s, c) => s + (c.byReason[key as keyof typeof c.byReason] ?? 0), 0),
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count)

  const kpis = [
    { label: 'Toplam Şikayet', value: totalComplaints, sub: 'bugün', color: 'var(--red)', iconBg: 'var(--red2)', Icon: MessageSquare },
    { label: 'Kayıp Ciro', value: `${totalLost.toLocaleString('tr-TR')} ₺`, sub: 'iade + iptal', color: 'var(--amber)', iconBg: 'var(--amber2)', Icon: TrendingDown },
    { label: 'Ort. Şikayet Oranı', value: `%${avgRate}`, sub: 'sipariş başına', color: 'var(--amber)', iconBg: 'var(--amber2)', Icon: AlertTriangle },
    { label: 'Çözüm Oranı', value: '%72', sub: 'ortalama', color: 'var(--green)', iconBg: 'var(--green2)', Icon: TrendingUp },
  ]

  return (
    <div className="dm">
      <Topbar title="Müşteri Şikayetleri" subtitle="Şikayet analizi ve kayıp ciro etkisi" />
      <div className="scroll" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {kpis.map((k, i) => {
            const Icon = k.Icon
            return (
              <div key={k.label} className="kpi" style={{ borderLeft: `2.5px solid ${k.color}`, animationDelay: `${i*40}ms` }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right,${k.iconBg},transparent 70%)`, pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: k.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={15} style={{ color: k.color }} strokeWidth={1.9} />
                  </div>
                </div>
                <p className="kpi-label">{k.label}</p>
                <p className="kpi-value" style={{ fontSize: 22, color: k.color }}>{k.value}</p>
                <p className="kpi-sub">{k.sub}</p>
              </div>
            )
          })}
        </div>

        {/* Content grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
          {/* Ranking */}
          <div className="card">
            <div className="card-h">
              <span className="card-title">Restoran Sıralaması</span>
              <span className="card-meta">{ranked.length} lokasyon</span>
            </div>
            <div>
              {ranked.map((summary, i) => {
                const restaurant = RESTAURANTS.find(r => r.id === summary.restaurantId)!
                const pulse = getPulseScore(summary.restaurantId)
                const config = getRiskConfig(pulse.risk_level)
                const isSelected = selectedId === summary.restaurantId
                return (
                  <div key={summary.restaurantId} className="row"
                    style={{ cursor: 'pointer', background: isSelected ? 'var(--ac3)' : undefined }}
                    onClick={() => setSelectedId(isSelected ? null : summary.restaurantId)}>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono,monospace', color: 'var(--tx3)', width: 16, flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{restaurant.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <span className={`badge badge-${config.label === 'Kritik' ? 'red' : config.label === 'Riskli' ? 'amber' : config.label === 'Yoğun' ? 'amber' : 'green'}`} style={{ fontSize: 10 }}>{config.label}</span>
                        <span style={{ fontSize: 10, color: 'var(--tx3)' }}>{summary.totalLostRevenue.toLocaleString('tr-TR')} ₺</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', color: summary.total > 15 ? 'var(--red)' : summary.total > 8 ? 'var(--amber)' : 'var(--tx2)' }}>{summary.total}</p>
                      <div>
                        {summary.trend === 'up' ? <TrendingUp size={10} style={{ color: 'var(--red)' }} /> : summary.trend === 'down' ? <TrendingDown size={10} style={{ color: 'var(--green)' }} /> : <Minus size={10} style={{ color: 'var(--tx3)' }} />}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Charts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <div className="card-h">
                <span className="card-title">Şikayet Türü Dağılımı</span>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={reasonData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--s4)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'var(--tx3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="label" type="category" tick={{ fill: 'var(--tx2)', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={<TT />} />
                    <Bar dataKey="count" name="Şikayet" radius={[0, 4, 4, 0]}>
                      {reasonData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? 'var(--red)' : i === 1 ? 'var(--amber)' : i === 2 ? 'var(--amber)' : 'var(--s4)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {selected && selectedRestaurant ? (
              <div className="card">
                <div className="card-h">
                  <div>
                    <span className="card-title">{selectedRestaurant.name}</span>
                    <p className="card-meta">Detay analizi</p>
                  </div>
                  <p style={{ fontSize: 26, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', color: 'var(--red)' }}>{selected.total}</p>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'Kayıp Ciro', value: `${selected.totalLostRevenue.toLocaleString('tr-TR')} ₺` },
                      { label: 'Ort. Puan', value: `${selected.avgScore}/5` },
                      { label: 'Çözüm Oranı', value: `%${Math.round(selected.resolvedRate * 100)}` },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: 'var(--s2)', border: '1px solid var(--bdr)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                        <p style={{ fontSize: 15, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', color: 'var(--tx)' }}>{value}</p>
                        <p style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 3 }}>{label}</p>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={90}>
                    <BarChart data={selected.weeklyTrend}>
                      <XAxis dataKey="day" tick={{ fill: 'var(--tx3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<TT />} />
                      <Bar dataKey="count" fill="var(--red)" radius={[3, 3, 0, 0]} name="Şikayet" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-h">
                  <span className="card-title">Haftalık Trend — Tüm Ağ</span>
                  <span className="card-meta">Restoran seçin</span>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map((day, i) => ({
                      day,
                      count: allSummaries.reduce((s, c) => s + (c.weeklyTrend[i]?.count ?? 0), 0),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--s4)" />
                      <XAxis dataKey="day" tick={{ fill: 'var(--tx3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--tx3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<TT />} />
                      <Line type="monotone" dataKey="count" stroke="var(--red)" strokeWidth={2} dot={{ fill: 'var(--red)', r: 3 }} name="Şikayet" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
