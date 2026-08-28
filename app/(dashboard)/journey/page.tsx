'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore } from '@/data/seed/mock-data'
import { cn } from '@/lib/utils'

const STEPS = [
  { key: 'order',    label: 'Sipariş Alındı',  icon: '📱', color: '#818cf8', desc: 'Müşteri siparişi verdi' },
  { key: 'kds',      label: 'Mutfağa Düştü',   icon: '🖥️', color: '#f97316', desc: 'KDS ekranında göründü' },
  { key: 'prep',     label: 'Hazırlanıyor',    icon: '🔥', color: '#f97316', desc: 'Izgara ve fryer aktif' },
  { key: 'packing',  label: 'Paketleniyor',    icon: '📦', color: '#eab308', desc: 'Ürünler kutulanıyor' },
  { key: 'ready',    label: 'Hazır',           icon: '✅', color: '#22c55e', desc: 'Kurye teslim alabilir' },
  { key: 'courier',  label: 'Kurye Bekleme',   icon: '🛵', color: '#f97316', desc: 'Kurye geldi, hazır' },
  { key: 'delivery', label: 'Teslimat',        icon: '🏠', color: '#22c55e', desc: 'Müşteriye ulaştı' },
]

interface StepData { key: string; avgMinutes: number; pct: number; bottleneck: boolean }

function getJourneyData(restaurantId: string): StepData[] {
  const pulse = getPulseScore(restaurantId)
  const factor = pulse.score / 100
  return [
    { key: 'order',    avgMinutes: 0.5,                       pct: 2,  bottleneck: false },
    { key: 'kds',      avgMinutes: 0.8 + factor * 0.5,        pct: 3,  bottleneck: false },
    { key: 'prep',     avgMinutes: pulse.avg_prep_time,        pct: Math.round(pulse.avg_prep_time / 0.35), bottleneck: pulse.avg_prep_time > 9 },
    { key: 'packing',  avgMinutes: pulse.avg_packing_time,    pct: Math.round(pulse.avg_packing_time / 0.35), bottleneck: pulse.station_scores.packing > 80 },
    { key: 'ready',    avgMinutes: 0.3,                       pct: 1,  bottleneck: false },
    { key: 'courier',  avgMinutes: pulse.courier_wait,        pct: Math.round(pulse.courier_wait / 0.35), bottleneck: pulse.courier_wait > 6 },
    { key: 'delivery', avgMinutes: 12 + factor * 5,           pct: 0,  bottleneck: false },
  ]
}

export default function JourneyPage() {
  const [restaurantId, setRestaurantId] = useState('r1')
  const journeyData = getJourneyData(restaurantId)
  const totalMinutes = journeyData.reduce((s, d) => s + d.avgMinutes, 0)
  const bottlenecks = journeyData.filter(d => d.bottleneck)
  const maxMinutes = Math.max(...journeyData.map(d => d.avgMinutes))

  return (
    <div>
      <Topbar title="Müşteri Yolculuğu" subtitle="Sipariş → Teslimat — her adımın ortalama süresi" />
      <div className="p-6 space-y-5 max-w-5xl">

        <div className="flex items-center gap-4">
          <select value={restaurantId} onChange={e => setRestaurantId(e.target.value)}
            className="rounded-xl border px-4 py-2.5 text-sm text-white outline-none"
            style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.1)' }}>
            {RESTAURANTS.map(r => <option key={r.id} value={r.id} style={{ background: '#13131e' }}>{r.name}</option>)}
          </select>
          <div className="text-sm text-white/40">Toplam ortalama: <span className="text-white font-bold font-mono">{totalMinutes.toFixed(1)} dk</span></div>
          {bottlenecks.length > 0 && (
            <div className="text-xs text-red-400">⚠️ {bottlenecks.length} darboğaz tespit edildi</div>
          )}
        </div>

        {/* Journey visualization */}
        <div className="rounded-2xl border p-8" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-10 left-10 right-10 h-0.5" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div className="flex items-start justify-between relative">
              {STEPS.map((step, i) => {
                const d = journeyData.find(j => j.key === step.key)!
                const widthPct = (d.avgMinutes / maxMinutes) * 100
                return (
                  <div key={step.key} className="flex flex-col items-center" style={{ width: `${100 / STEPS.length}%` }}>
                    {/* Circle */}
                    <div className={cn('relative w-20 h-20 rounded-full border-2 flex items-center justify-center text-2xl mb-3 z-10 transition-all', d.bottleneck && 'animate-pulse')}
                      style={{
                        background: d.bottleneck ? 'rgba(255,61,61,0.12)' : 'var(--bg-elevated)',
                        borderColor: d.bottleneck ? 'rgba(255,61,61,0.5)' : step.color + '40',
                        boxShadow: d.bottleneck ? '0 0 20px rgba(255,61,61,0.3)' : `0 0 12px ${step.color}20`,
                      }}>
                      {step.icon}
                      {d.bottleneck && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white">!</div>
                      )}
                    </div>

                    {/* Duration bar */}
                    <div className="w-full px-2 mb-2">
                      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${widthPct}%`,
                            background: d.bottleneck ? '#ff3d3d' : step.color,
                            boxShadow: d.bottleneck ? '0 0 8px rgba(255,61,61,0.6)' : 'none',
                          }} />
                      </div>
                    </div>

                    {/* Label */}
                    <div className="text-center px-1">
                      <div className={cn('text-xs font-semibold mb-0.5', d.bottleneck ? 'text-red-400' : 'text-white/70')}>{step.label}</div>
                      <div className={cn('text-lg font-bold font-mono', d.bottleneck ? 'text-red-400' : 'text-white')}
                        style={d.bottleneck ? { textShadow: '0 0 12px rgba(255,61,61,0.5)' } : undefined}>
                        {d.avgMinutes.toFixed(1)}<span className="text-xs text-white/30 ml-0.5">dk</span>
                      </div>
                      <div className="text-[9px] text-white/25 mt-0.5">{step.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Bottleneck analysis */}
        {bottlenecks.length > 0 && (
          <div className="rounded-2xl border p-5" style={{ background: 'rgba(255,61,61,0.04)', borderColor: 'rgba(255,61,61,0.18)' }}>
            <div className="text-sm font-semibold text-red-300 mb-3">Tespit Edilen Darboğazlar</div>
            <div className="space-y-2">
              {bottlenecks.map(b => {
                const step = STEPS.find(s => s.key === b.key)!
                return (
                  <div key={b.key} className="flex items-center gap-3 text-sm">
                    <span className="text-xl">{step.icon}</span>
                    <span className="text-white/70 font-medium">{step.label}</span>
                    <span className="text-red-400 font-bold font-mono">{b.avgMinutes.toFixed(1)} dk</span>
                    <span className="text-white/30">— hedefin {Math.round((b.avgMinutes / (b.key === 'prep' ? 7 : b.key === 'packing' ? 3 : 5) - 1) * 100)}% üzerinde</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Comparison table */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="text-xs text-white/40 uppercase tracking-widest font-medium">Tüm Restoranlar — Toplam Süre Karşılaştırması</div>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {RESTAURANTS.map(r => {
              const jd = getJourneyData(r.id)
              const total = jd.reduce((s, d) => s + d.avgMinutes, 0)
              const pulse = getPulseScore(r.id)
              const isSelected = r.id === restaurantId
              return (
                <button key={r.id} onClick={() => setRestaurantId(r.id)}
                  className={cn('w-full flex items-center gap-4 px-6 py-3 text-left transition-all', isSelected && 'bg-orange-500/[0.06]')}>
                  <span className="text-xs text-white/50 w-32 truncate">{r.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.')}</span>
                  <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.min(100, total / 0.4)}%`, background: total > 30 ? '#ff3d3d' : total > 24 ? '#f97316' : '#22c55e' }} />
                  </div>
                  <span className="text-sm font-bold font-mono text-white w-14 text-right">{total.toFixed(1)} dk</span>
                  <span className={cn('text-xs font-bold w-8', pulse.score >= 80 ? 'text-red-400' : pulse.score >= 60 ? 'text-orange-400' : 'text-emerald-400')}>{pulse.score}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
