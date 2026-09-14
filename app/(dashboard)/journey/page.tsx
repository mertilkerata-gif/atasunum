'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore } from '@/data/seed/mock-data'

const STEPS = [
  { key: 'order',    label: 'Sipariş',     icon: '📱', color: '#7c6af7' },
  { key: 'kds',      label: 'Mutfak',      icon: '🖥️', color: '#4ea8f0' },
  { key: 'prep',     label: 'Hazırlama',   icon: '🔥', color: '#f0a843' },
  { key: 'packing',  label: 'Paketleme',   icon: '📦', color: '#f0a843' },
  { key: 'ready',    label: 'Hazır',       icon: '✅', color: '#22d3a0' },
  { key: 'courier',  label: 'Kurye',       icon: '🛵', color: '#f0a843' },
  { key: 'delivery', label: 'Teslimat',    icon: '🏠', color: '#22d3a0' },
]

function getJourneyData(restaurantId: string) {
  const pulse = getPulseScore(restaurantId)
  const f = pulse.score / 100
  return [
    { key: 'order',    min: 0.5,                  bottleneck: false, desc: 'Müşteri siparişi verdi' },
    { key: 'kds',      min: 0.8 + f * 0.5,        bottleneck: false, desc: 'KDS ekranında göründü' },
    { key: 'prep',     min: pulse.avg_prep_time,   bottleneck: pulse.avg_prep_time > 9, desc: 'Izgara ve fryer' },
    { key: 'packing',  min: pulse.avg_packing_time,bottleneck: (pulse.station_scores as unknown as Record<string,number>).packing > 80, desc: 'Ürünler kutulanıyor' },
    { key: 'ready',    min: 0.3,                   bottleneck: false, desc: 'Kurye alabilir' },
    { key: 'courier',  min: pulse.courier_wait,    bottleneck: pulse.courier_wait > 6, desc: 'Kurye bekleme' },
    { key: 'delivery', min: 12 + f * 5,            bottleneck: false, desc: 'Müşteriye ulaştı' },
  ]
}

export default function JourneyPage() {
  const [restaurantId, setRestaurantId] = useState('r1')
  const jd = getJourneyData(restaurantId)
  const total = jd.reduce((s, d) => s + d.min, 0)
  const bottlenecks = jd.filter(d => d.bottleneck)
  const maxMin = Math.max(...jd.map(d => d.min))

  return (
    <div className="dm">
      <Topbar title="Müşteri Yolculuğu" subtitle="Sipariş → Teslimat akışı" />
      <div className="scroll" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <select value={restaurantId} onChange={e => setRestaurantId(e.target.value)} className="inp"
            style={{ width: 'auto', padding: '7px 12px', fontSize: 13 }}>
            {RESTAURANTS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
            Toplam: <span style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, color: 'var(--tx)' }}>{total.toFixed(1)} dk</span>
          </div>
          {bottlenecks.length > 0 && (
            <span className="badge badge-red">⚠ {bottlenecks.length} darboğaz</span>
          )}
        </div>

        {/* Journey flow */}
        <div className="card">
          <div className="card-h">
            <span className="card-title">Sipariş Akış Haritası</span>
            <span className="card-meta">{STEPS.length} adım</span>
          </div>
          <div style={{ padding: '28px 24px', position: 'relative' }}>
            {/* Connector line */}
            <div style={{ position: 'absolute', top: 64, left: 60, right: 60, height: 2, background: 'var(--s4)', zIndex: 0 }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
              {STEPS.map((step) => {
                const d = jd.find(j => j.key === step.key)!
                const barW = (d.min / maxMin) * 100
                return (
                  <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: `${100 / STEPS.length}%` }}>
                    {/* Circle */}
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%', border: `2px solid ${d.bottleneck ? 'var(--red)' : step.color + '50'}`,
                      background: d.bottleneck ? 'var(--red2)' : 'var(--s2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, marginBottom: 10, position: 'relative',
                      boxShadow: d.bottleneck ? '0 0 16px rgba(242,87,87,0.3)' : `0 0 10px ${step.color}18`,
                    }}>
                      {step.icon}
                      {d.bottleneck && (
                        <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>!</div>
                      )}
                    </div>

                    {/* Bar */}
                    <div style={{ width: '80%', marginBottom: 8 }}>
                      <div className="prog">
                        <div className="prog-fill" style={{ width: `${barW}%`, background: d.bottleneck ? 'var(--red)' : step.color }} />
                      </div>
                    </div>

                    {/* Label */}
                    <div style={{ textAlign: 'center', padding: '0 4px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: d.bottleneck ? 'var(--red)' : 'var(--tx2)', marginBottom: 2 }}>{step.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', color: d.bottleneck ? 'var(--red)' : 'var(--tx)', letterSpacing: '-.03em' }}>
                        {d.min.toFixed(1)}<span style={{ fontSize: 9, color: 'var(--tx3)', marginLeft: 1 }}>dk</span>
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--tx3)', marginTop: 2 }}>{d.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Bottlenecks */}
        {bottlenecks.length > 0 && (
          <div className="card" style={{ borderLeft: '3px solid var(--red)' }}>
            <div className="card-h">
              <span className="card-title" style={{ color: 'var(--red)' }}>Tespit Edilen Darboğazlar</span>
              <span className="badge badge-red">{bottlenecks.length} kritik adım</span>
            </div>
            <div>
              {bottlenecks.map(b => {
                const step = STEPS.find(s => s.key === b.key)!
                const target = b.key === 'prep' ? 7 : b.key === 'packing' ? 3 : 5
                const overPct = Math.round((b.min / target - 1) * 100)
                return (
                  <div key={b.key} className="row">
                    <span style={{ fontSize: 20 }}>{step.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>{step.label}</p>
                      <p style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 1 }}>Hedef: {target} dk</p>
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, color: 'var(--red)', fontSize: 16 }}>{b.min.toFixed(1)} dk</span>
                    <span className="badge badge-red">+%{overPct}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Restaurant comparison */}
        <div className="card">
          <div className="card-h">
            <span className="card-title">Tüm Restoranlar — Süre Karşılaştırması</span>
            <span className="card-meta">Seçmek için tıkla</span>
          </div>
          <div>
            {RESTAURANTS.map(r => {
              const rd = getJourneyData(r.id)
              const rtotal = rd.reduce((s, d) => s + d.min, 0)
              const pulse = getPulseScore(r.id)
              const isSelected = r.id === restaurantId
              const barColor = rtotal > 30 ? 'var(--red)' : rtotal > 24 ? 'var(--amber)' : 'var(--green)'
              return (
                <div key={r.id} className="row" style={{ cursor: 'pointer', background: isSelected ? 'var(--ac3)' : undefined, borderLeft: isSelected ? '2px solid var(--ac)' : '2px solid transparent' }}
                  onClick={() => setRestaurantId(r.id)}>
                  <span style={{ fontSize: 12, color: 'var(--tx2)', width: 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name.replace('Burger King ', 'BK ').replace('Popeyes ', 'Pop.')}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="prog">
                      <div className="prog-fill" style={{ width: `${Math.min(100, rtotal / 0.4)}%`, background: barColor }} />
                    </div>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, color: 'var(--tx)', fontSize: 13, width: 52, textAlign: 'right', flexShrink: 0 }}>{rtotal.toFixed(1)} dk</span>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: 12, color: pulse.score >= 80 ? 'var(--red)' : pulse.score >= 60 ? 'var(--amber)' : 'var(--green)', width: 28, textAlign: 'right', flexShrink: 0 }}>{pulse.score}</span>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
