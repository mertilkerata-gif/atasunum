'use client'
import { useState, useEffect, useRef } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot, restaurantProfiles } from '@/data/seed/mock-data'
import { getRiskConfig, cn } from '@/lib/utils'
import { PulseScore, OperationSnapshot } from '@/types'

interface LiveData {
  pulse: PulseScore
  snapshot: OperationSnapshot
}

function getLiveData(restaurantId: string, jitter: number): LiveData {
  const base = getPulseScore(restaurantId)
  const snap = getSnapshot(restaurantId)
  // Small realistic fluctuation every tick
  const delta = Math.sin(jitter * 0.7 + restaurantId.charCodeAt(1)) * 3
  const newScore = Math.max(0, Math.min(100, Math.round(base.score + delta)))
  return {
    pulse: { ...base, score: newScore, open_orders: Math.max(0, base.open_orders + Math.round(delta * 0.4)) },
    snapshot: snap,
  }
}

export default function LiveOperationsPage() {
  const [jitter, setJitter] = useState(0)
  const [flash, setFlash] = useState<string | null>(null)
  const tickRef = useRef(0)

  useEffect(() => {
    const t = setInterval(() => {
      tickRef.current += 1
      setJitter(tickRef.current)
      // Random restaurant flash (simulates new order spike)
      if (Math.random() > 0.7) {
        const r = RESTAURANTS[Math.floor(Math.random() * RESTAURANTS.length)]
        setFlash(r.id)
        setTimeout(() => setFlash(null), 1200)
      }
    }, 5000)
    return () => clearInterval(t)
  }, [])

  const data = RESTAURANTS.map(r => ({ restaurant: r, ...getLiveData(r.id, jitter) }))
    .sort((a, b) => b.pulse.score - a.pulse.score)

  const criticalCount = data.filter(d => d.pulse.risk_level === 'KRITIK').length
  const riskliCount = data.filter(d => d.pulse.risk_level === 'RISKLI').length

  return (
    <div>
      <Topbar title="Canlı Operasyonlar" subtitle="Anlık sipariş ve istasyon durumu" />
      <div className="p-6 space-y-4">

        {/* Live indicator + summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative w-2 h-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
              </div>
              <span className="text-xs text-white/50">Canlı — her 5 saniyede güncelleniyor</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {criticalCount > 0 && (
              <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-xs font-semibold text-red-400">{criticalCount} Kritik</span>
              </div>
            )}
            {riskliCount > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span className="text-xs font-semibold text-orange-400">{riskliCount} Riskli</span>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-white/[0.08] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                {['Restoran', 'Nabız Skoru', 'Açık Sipariş', 'Ort. Hazırlama', 'Packing', 'Kurye Bekl.', '🔥 Grill', '🍟 Fryer', '📦 Packing', '🛵 Kurye', 'Personel'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-white/30 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(({ restaurant, pulse, snapshot }) => {
                const config = getRiskConfig(pulse.risk_level)
                const isFlashing = flash === restaurant.id
                return (
                  <tr key={restaurant.id}
                    className={cn('border-b border-white/[0.04] transition-all duration-300',
                      isFlashing ? 'bg-orange-500/[0.08]' : 'hover:bg-white/[0.02]')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} />
                        <div>
                          <div className="text-sm text-white font-medium">{restaurant.name}</div>
                          <div className="text-xs text-white/30">{restaurant.district}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xl font-bold tabular-nums transition-all', config.color)}>{pulse.score}</span>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', config.badge)}>{config.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('text-sm font-bold tabular-nums', pulse.open_orders > 25 ? 'text-red-400' : 'text-white')}>{pulse.open_orders}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('text-sm tabular-nums', pulse.avg_prep_time > 10 ? 'text-red-400' : pulse.avg_prep_time > 8 ? 'text-orange-400' : 'text-white/70')}>{pulse.avg_prep_time.toFixed(1)}dk</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-white/70 tabular-nums">{pulse.avg_packing_time.toFixed(1)}dk</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('text-sm tabular-nums', pulse.courier_wait > 7 ? 'text-red-400' : 'text-white/70')}>{pulse.courier_wait.toFixed(1)}dk</span>
                    </td>
                    {(['grill', 'fryer', 'packing', 'courier'] as const).map(st => {
                      const score = pulse.station_scores[st]
                      return (
                        <td key={st} className="px-4 py-3 text-center">
                          <span className={cn('text-sm font-bold tabular-nums transition-all',
                            score >= 80 ? 'text-red-400' : score >= 60 ? 'text-orange-400' : score >= 40 ? 'text-yellow-400' : 'text-emerald-400')}>
                            {score}
                          </span>
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-white/50">{snapshot.active_staff}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Ticker */}
        <div className="text-xs text-white/20 text-right">
          Son güncelleme: {new Date().toLocaleTimeString('tr-TR')} · Tick #{jitter}
        </div>
      </div>
    </div>
  )
}
