'use client'
import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot } from '@/data/seed/mock-data'
import { getRiskConfig, cn } from '@/lib/utils'
import { Activity, Package, Clock, Users, TrendingUp } from 'lucide-react'

export default function LiveOperationsPage() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 10000)
    return () => clearInterval(t)
  }, [])

  const data = RESTAURANTS.map(r => ({
    restaurant: r,
    pulse: getPulseScore(r.id),
    snapshot: getSnapshot(r.id),
  })).sort((a, b) => b.pulse.score - a.pulse.score)

  return (
    <div>
      <Topbar title="Canlı Operasyonlar" subtitle="Anlık sipariş ve istasyon durumu" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-ring" />
          <span className="text-xs text-white/40">Canlı · Her 5 dakikada güncelleniyor</span>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-white/[0.08] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                {['Restoran', 'Nabız', 'Açık Sipariş', 'Hazırlama', 'Packing', 'Kurye Bekl.', 'Grill', 'Fryer', 'Packing', 'Kurye', 'Personel'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-white/30 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(({ restaurant, pulse, snapshot }) => {
                const config = getRiskConfig(pulse.risk_level)
                return (
                  <tr key={restaurant.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm text-white font-medium">{restaurant.name}</div>
                      <div className="text-xs text-white/30">{restaurant.district}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', config.dot)} />
                        <span className={cn('text-lg font-bold tabular-nums', config.color)}>{pulse.score}</span>
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
                          <span className={cn('text-sm font-bold tabular-nums', score >= 80 ? 'text-red-400' : score >= 60 ? 'text-orange-400' : score >= 40 ? 'text-yellow-400' : 'text-emerald-400')}>{score}</span>
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
      </div>
    </div>
  )
}
