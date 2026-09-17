'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchAllPulseScores, fetchLatestSnapshots, fetchRestaurants } from '@/lib/supabase-client'
import { getPulseScore, getSnapshot } from '@/data/seed/mock-data'
import { getRiskConfig } from '@/lib/utils'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { Info } from 'lucide-react'

const COMPONENTS = [
  { key: 'order_pressure',   label: 'Sipariş Baskısı',      weight: 25, icon: '📦', desc: 'Açık sipariş sayısı / baseline oranı + geliş hızı' },
  { key: 'prep_performance', label: 'Hazırlama Perf.',       weight: 20, icon: '⏱️', desc: 'Hazırlama süresi / hedef + packing süresi' },
  { key: 'station_load',     label: 'İstasyon Yükü',         weight: 25, icon: '🔥', desc: 'En yüklü 2 istasyonun ağırlıklı ortalaması' },
  { key: 'courier_load',     label: 'Kurye Baskısı',         weight: 15, icon: '🛵', desc: 'Kurye bekleme süresi + kurye istasyon yükü' },
  { key: 'delay_risk',       label: 'Gecikme Riski',         weight: 15, icon: '⚠️', desc: 'Gecikme oranı + iptal oranı sinyali' },
]

function barColor(score: number) {
  if (score >= 80) return 'var(--red)'
  if (score >= 60) return 'var(--amber)'
  if (score >= 40) return 'var(--yellow, #eab308)'
  return 'var(--green)'
}

export default function ExplainerPage() {
  const [restaurantId, setRestaurantId] = useState('r6') // en kritik default
  const [restaurants, setRestaurants] = useState<any[]>(RESTAURANTS)
  const [pulse, setPulse] = useState<any>(null)
  const [snap, setSnap] = useState<any>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pulseRows, snapRows, restRows] = await Promise.all([
        fetchAllPulseScores(), fetchLatestSnapshots(), fetchRestaurants()
      ])
      if (restRows.length) setRestaurants(restRows)
      const p = pulseRows.find((x: any) => x.restaurant_id === restaurantId) ?? getPulseScore(restaurantId)
      const s = snapRows.find((x: any) => x.restaurant_id === restaurantId) ?? getSnapshot(restaurantId)
      setPulse(p); setSnap(s)
    } catch {
      setPulse(getPulseScore(restaurantId)); setSnap(getSnapshot(restaurantId))
    } finally { setLoading(false) }
  }, [restaurantId])

  useEffect(() => {
    load()
    const t = setInterval(() => load(), 10000)
    return () => clearInterval(t)
  }, [load])

  const config = pulse ? getRiskConfig(pulse.risk_level) : getRiskConfig('NORMAL')
  // station_scores önce pulse'dan, boşsa snap'taki ayrı sütunlardan al
  const stations: Record<string, number> = (() => {
    const ps = pulse?.station_scores ?? {}
    if (Object.keys(ps).length > 0) return ps as Record<string, number>
    if (!snap) return {}
    return {
      grill:   snap.grill_load   ?? 0,
      fryer:   snap.fryer_load   ?? 0,
      packing: snap.packing_load ?? 0,
      courier: snap.courier_load ?? 0,
    }
  })()

  // Component skorları — station_scores'dan türet
  const compScores: Record<string, number> = {
    order_pressure:   Math.min(100, Math.round(((snap?.open_orders ?? pulse?.open_orders ?? 0) / 15) * 60)),
    prep_performance: Math.min(100, Math.round(((snap?.avg_preparation_time ?? pulse?.avg_prep_time ?? 0) / 7) * 50)),
    station_load:     Math.round(((stations.grill ?? 0) * 0.4 + (stations.packing ?? 0) * 0.6)),
    courier_load:     Math.min(100, Math.round(((snap?.avg_courier_wait ?? pulse?.courier_wait ?? 0) / 5) * 70)),
    delay_risk:       Math.min(100, Math.round(((snap?.delay_rate ?? 0) + (snap?.cancellation_rate ?? 0)) * 400 + (stations.courier >= 80 ? 20 : 0))),
  }

  const _o  = snap?.open_orders          ?? pulse?.open_orders    ?? 0
  const _pr = snap?.avg_preparation_time ?? pulse?.avg_prep_time  ?? 0
  const _pa = snap?.avg_packing_time     ?? pulse?.avg_packing_time?? 0
  const _cw = snap?.avg_courier_wait     ?? pulse?.courier_wait    ?? 0
  const _dr = snap?.delay_rate           ?? 0
  const _cr = snap?.cancellation_rate    ?? 0
  const inputs = [
    { label: 'Açık Sipariş', value: String(_o),               baseline: '15', unit: '' },
    { label: 'Hazırlama',    value: Number(_pr).toFixed(1),    baseline: '7',  unit: 'dk' },
    { label: 'Packing',      value: Number(_pa).toFixed(1),    baseline: '3',  unit: 'dk' },
    { label: 'Kurye Bekl.',  value: Number(_cw).toFixed(1),    baseline: '3',  unit: 'dk' },
    { label: 'Gecikme',      value: `%${Math.round(_dr*100)}`, baseline: '%3', unit: '' },
    { label: 'İptal',        value: `%${Math.round(_cr*100)}`, baseline: '%2', unit: '' },
  ]

  return (
    <div className="dm">
      <Topbar title="Explainable AI" subtitle="Nabız skoru neden bu değeri aldı?" />
      <div className="scroll" style={{ padding: 'clamp(14px,3vw,24px)', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Restoran seç */}
        <select value={restaurantId} onChange={e => setRestaurantId(e.target.value)}
          className="inp" style={{ width: 'auto', padding: '7px 12px', fontSize: 13, alignSelf: 'flex-start' }}>
          {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div style={{ width: 20, height: 20, border: '2px solid var(--s4)', borderTopColor: 'var(--ac)', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
          </div>
        ) : (
          <>
            {/* Skor breakdown */}
            <div style={{
              background: config.bg, border: `1px solid ${config.colorHex}35`,
              borderRadius: 16, padding: 'clamp(16px,3vw,28px)',
              boxShadow: pulse?.risk_level === 'KRITIK' ? `0 0 30px ${config.colorHex}12` : 'none',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 8 }}>Operasyon Nabız Skoru</p>
                  <p style={{ fontSize: 52, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', color: config.colorHex, letterSpacing: '-.04em', lineHeight: 1, marginBottom: 6 }}>
                    {pulse?.score ?? '—'}
                  </p>
                  <span className={`badge badge-${pulse?.risk_level === 'KRITIK' ? 'red' : pulse?.risk_level === 'RISKLI' ? 'amber' : pulse?.risk_level === 'YOGUN' ? 'amber' : 'green'}`}>
                    {config.label}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }} className="hide-mobile">
                  <p style={{ fontSize: 10, color: 'var(--tx3)', marginBottom: 6 }}>Hesaplama Formülü</p>
                  <p style={{ fontSize: 12, fontFamily: 'JetBrains Mono,monospace', color: 'var(--tx2)' }}>Σ (bileşen × ağırlık) × dış_faktör</p>
                </div>
              </div>

              {/* Bileşen barları */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {COMPONENTS.map(comp => {
                  const raw = Math.round(compScores[comp.key] ?? 0)
                  const contribution = Math.round(raw * comp.weight / 100)
                  const color = barColor(raw)
                  const isH = hovered === comp.key

                  return (
                    <div key={comp.key}
                      onMouseEnter={() => setHovered(comp.key)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ cursor: 'help' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{comp.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx)' }}>{comp.label}</span>
                              <span style={{ fontSize: 10, color: 'var(--tx3)' }}>ağırlık %{comp.weight}</span>
                              {isH && <Info size={11} style={{ color: 'var(--tx3)' }}/>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono,monospace', color: 'var(--tx2)' }}>{raw} puan</span>
                              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', color }}>+{contribution} katkı</span>
                            </div>
                          </div>

                          {/* Bar */}
                          <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 4, width: `${raw}%`,
                              background: color,
                              boxShadow: raw >= 80 ? `0 0 8px ${color}` : 'none',
                              transition: 'width .8s cubic-bezier(.4,0,.2,1)',
                            }}/>
                          </div>

                          {/* Hover açıklama */}
                          {isH && (
                            <p style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 5 }}>{comp.desc}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Dış faktörler */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--bdr)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--tx3)' }}>Dış Faktör Çarpanı</span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(snap?.rain_intensity ?? 0) > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--blue)' }}>🌧️ Yağmur +{Math.round((snap.rain_intensity ?? 0) * 1.2)}%</span>
                    )}
                    {snap?.campaign_active && (
                      <span style={{ fontSize: 12, color: 'var(--amber)' }}>📢 Kampanya +8%</span>
                    )}
                    {!snap?.rain_intensity && !snap?.campaign_active && (
                      <span style={{ fontSize: 12, color: 'var(--tx3)' }}>1.0 — dış etki yok</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Girdi değerleri */}
            <div className="card">
              <div className="card-h">
                <span className="card-title">Motor Girdi Değerleri</span>
                <span className="card-meta">Anlık snapshot</span>
              </div>
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,140px),1fr))', gap: 10 }}>
                {inputs.map(({ label, value, baseline, unit }) => {
                  const numVal = parseFloat(value ?? '0')
                  const numBase = parseFloat(baseline)
                  const over = numVal > numBase
                  return (
                    <div key={label} style={{ background: 'var(--s2)', border: `1px solid ${over ? 'rgba(242,87,87,.2)' : 'var(--bdr)'}`, borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ fontSize: 10, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>{label}</p>
                      <p style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', color: over ? 'var(--red)' : 'var(--tx)', letterSpacing: '-.03em' }}>
                        {value}{unit && <span style={{ fontSize: 11, color: 'var(--tx3)', marginLeft: 2 }}>{unit}</span>}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 4 }}>baz: {baseline}{unit}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* İstasyon detayı */}
            <div className="card">
              <div className="card-h"><span className="card-title">İstasyon Detayı</span></div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Grill',   val: stations.grill   ?? 0, color: 'var(--amber)' },
                  { label: 'Fryer',   val: stations.fryer   ?? 0, color: '#f0c040' },
                  { label: 'Packing', val: stations.packing ?? 0, color: 'var(--ac)' },
                  { label: 'Kurye',   val: stations.courier ?? 0, color: 'var(--green)' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 56, fontSize: 12, color: 'var(--tx3)', flexShrink: 0 }}>{label}</span>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }}>
                      <div style={{ height: '100%', borderRadius: 4, width: `${val}%`, background: val >= 80 ? 'var(--red)' : color, transition: 'width .8s ease' }}/>
                    </div>
                    <span style={{ width: 32, fontSize: 12, fontFamily: 'JetBrains Mono,monospace', color: val >= 80 ? 'var(--red)' : 'var(--tx3)', textAlign: 'right', flexShrink: 0 }}>{val}</span>
                    {val >= 80 && <span className="badge badge-red" style={{ fontSize: 9, flexShrink: 0 }}>KRİTİK</span>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
