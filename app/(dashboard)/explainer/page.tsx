'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot } from '@/data/seed/mock-data'
import { getRiskConfig, cn } from '@/lib/utils'
import { calculatePulseScore } from '@/services/pulse'
import { Info } from 'lucide-react'

const COMPONENTS = [
  { key: 'order_pressure',   label: 'Sipariş Baskısı',     weight: 25, icon: '📦', desc: 'Açık sipariş sayısı / baseline oranı + hız' },
  { key: 'prep_performance', label: 'Hazırlama Performansı',weight: 20, icon: '⏱️', desc: 'Hazırlama süresi / hedef + packing süresi' },
  { key: 'station_load',     label: 'İstasyon Yükü',       weight: 25, icon: '🔥', desc: 'En yüklü 2 istasyonun ağırlıklı ortalaması' },
  { key: 'courier_load',     label: 'Kurye Baskısı',       weight: 15, icon: '🛵', desc: 'Kurye bekleme + kurye istasyon yükü' },
  { key: 'delay_risk',       label: 'Gecikme Riski',       weight: 15, icon: '⚠️', desc: 'Gecikme oranı + iptal oranı sinyali' },
]

export default function ExplainerPage() {
  const [restaurantId, setRestaurantId] = useState('r1')
  const [hoveredComp, setHoveredComp] = useState<string | null>(null)
  const snap = getSnapshot(restaurantId)
  const pulse = getPulseScore(restaurantId)
  const config = getRiskConfig(pulse.risk_level)

  const result = calculatePulseScore({
    open_orders: snap.open_orders, orders_last_5m: snap.orders_last_5m,
    orders_last_15m: snap.orders_last_15m, avg_preparation_time: snap.avg_preparation_time,
    avg_packing_time: snap.avg_packing_time, avg_courier_wait: snap.avg_courier_wait,
    delay_rate: snap.delay_rate, cancellation_rate: snap.cancellation_rate,
    grill_load: snap.grill_load, fryer_load: snap.fryer_load,
    packing_load: snap.packing_load, courier_load: snap.courier_load,
    active_staff: snap.active_staff, restaurant_capacity: RESTAURANTS.find(r=>r.id===restaurantId)?.capacity ?? 80,
    rain_intensity: snap.rain_intensity, campaign_active: snap.campaign_active, special_event: snap.special_event,
  })

  const compScores = result.component_scores

  return (
    <div>
      <Topbar title="Explainable AI" subtitle="Nabız skoru neden bu değeri aldı?" />
      <div className="p-6 space-y-5 max-w-4xl">

        <select value={restaurantId} onChange={e => setRestaurantId(e.target.value)}
          className="rounded-xl border px-4 py-2.5 text-sm text-white outline-none"
          style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.1)' }}>
          {RESTAURANTS.map(r => <option key={r.id} value={r.id} style={{ background: '#13131e' }}>{r.name}</option>)}
        </select>

        {/* Score breakdown */}
        <div className={cn('rounded-2xl border p-6', config.glow)} style={{ background: config.bg, borderColor: config.colorHex + '35' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Operasyon Nabız Skoru</div>
              <div className={cn('text-5xl font-bold font-mono', config.color)} style={{ textShadow: `0 0 30px ${config.colorHex}60` }}>
                {pulse.score}
              </div>
              <div className={cn('text-sm font-semibold mt-1', config.color)}>{config.label}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-white/30 mb-2">Formül</div>
              <div className="text-xs text-white/40 font-mono">Σ (bileşen × ağırlık) × dış_faktör</div>
            </div>
          </div>

          {/* Component bars */}
          <div className="space-y-4">
            {COMPONENTS.map(comp => {
              const rawScore = (compScores as any)[comp.key] ?? 0
              const weightedContribution = Math.round(rawScore * comp.weight / 100)
              const isHovered = hoveredComp === comp.key
              const barColor = rawScore >= 80 ? '#ff3d3d' : rawScore >= 60 ? '#f97316' : rawScore >= 40 ? '#eab308' : '#22c55e'
              return (
                <div key={comp.key}
                  onMouseEnter={() => setHoveredComp(comp.key)}
                  onMouseLeave={() => setHoveredComp(null)}
                  className="cursor-help">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-lg shrink-0">{comp.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white/70">{comp.label}</span>
                          <span className="text-[10px] text-white/25">ağırlık %{comp.weight}</span>
                          {isHovered && <Info className="w-3 h-3 text-white/30" />}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-white/40">{rawScore.toFixed(0)} puan</span>
                          <span className="text-xs font-bold font-mono" style={{ color: barColor }}>+{weightedContribution} katkı</span>
                        </div>
                      </div>
                      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${rawScore}%`, background: barColor, boxShadow: rawScore >= 80 ? `0 0 8px ${barColor}60` : 'none' }} />
                      </div>
                      {isHovered && (
                        <div className="text-[10px] text-white/35 mt-1">{comp.desc}</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* External factors */}
          <div className="mt-5 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Dış Faktör Çarpanı</span>
              <div className="flex items-center gap-3 text-white/50">
                {snap.rain_intensity > 0 && <span>🌧️ Yağmur +{Math.round(snap.rain_intensity * 1.2)}%</span>}
                {snap.campaign_active && <span>📢 Kampanya +8%</span>}
                {!snap.rain_intensity && !snap.campaign_active && <span>1.0 (etkisiz)</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Input values */}
        <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="text-xs text-white/40 uppercase tracking-widest font-medium mb-4">Motor Girdi Değerleri</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Açık Sipariş', value: snap.open_orders, baseline: '15', unit: '' },
              { label: 'Hazırlama', value: `${snap.avg_preparation_time.toFixed(1)}`, baseline: '7', unit: ' dk' },
              { label: 'Packing', value: `${snap.avg_packing_time.toFixed(1)}`, baseline: '3', unit: ' dk' },
              { label: 'Kurye Bekl.', value: `${snap.avg_courier_wait.toFixed(1)}`, baseline: '3', unit: ' dk' },
              { label: 'Gecikme', value: `%${Math.round(snap.delay_rate * 100)}`, baseline: '%3', unit: '' },
              { label: 'İptal', value: `%${Math.round(snap.cancellation_rate * 100)}`, baseline: '%2', unit: '' },
            ].map(({ label, value, baseline, unit }) => (
              <div key={label} className="rounded-xl border p-3" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="text-[10px] text-white/25 uppercase tracking-wider mb-1">{label}</div>
                <div className="text-lg font-bold font-mono text-white">{value}{unit}</div>
                <div className="text-[10px] text-white/20 mt-0.5">baz: {baseline}{unit}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
