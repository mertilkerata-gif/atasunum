'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchAllPulseScores, fetchLatestSnapshots, fetchActiveOrders, subscribeToOrders, subscribeToPulseScores } from '@/lib/supabase-client'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot } from '@/data/seed/mock-data'
import { getRiskConfig, cn } from '@/lib/utils'
import { PulseScore, OperationSnapshot } from '@/types'
import { Activity, Loader2, Wifi, RefreshCw } from 'lucide-react'

interface LiveData {
  restaurant: typeof RESTAURANTS[0]
  pulse: PulseScore
  snapshot: OperationSnapshot
  activeOrders: number
}

export default function LiveOperationsPage() {
  const [data, setData] = useState<LiveData[]>([])
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [tick, setTick] = useState(0)

  const fetchData = useCallback(async () => {
    try {
      const [pulseRows, snapshotRows, orderRows] = await Promise.all([
        fetchAllPulseScores(),
        fetchLatestSnapshots(),
        fetchActiveOrders(),
      ])

      const pulseMap = Object.fromEntries(pulseRows.map(p => [p.restaurant_id, p]))
      const snapshotMap = Object.fromEntries(snapshotRows.map(s => [s.restaurant_id, s]))
      const orderCount = orderRows.reduce((acc: Record<string,number>, o:any) => {
        acc[o.restaurant_id] = (acc[o.restaurant_id] || 0) + 1
        return acc
      }, {})

      const result: LiveData[] = RESTAURANTS.map(r => ({
        restaurant: r,
        pulse: (pulseMap[r.id] ?? getPulseScore(r.id)) as PulseScore,
        snapshot: (snapshotMap[r.id] ?? getSnapshot(r.id)) as OperationSnapshot,
        activeOrders: orderCount[r.id] ?? (pulseMap[r.id]?.open_orders ?? getPulseScore(r.id).open_orders),
      }))

      result.sort((a, b) => b.pulse.score - a.pulse.score)
      setData(result)
      setIsLive(pulseRows.length > 0)
    } catch {
      const fallback: LiveData[] = RESTAURANTS.map(r => ({
        restaurant: r,
        pulse: getPulseScore(r.id),
        snapshot: getSnapshot(r.id),
        activeOrders: getPulseScore(r.id).open_orders,
      }))
      setData(fallback)
      setIsLive(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const t = setInterval(() => { fetchData(); setTick(v => v + 1) }, 5000)
    const pSub = subscribeToPulseScores(() => fetchData())
    const oSub = subscribeToOrders(() => fetchData())
    return () => {
      clearInterval(t)
      pSub.unsubscribe()
      oSub.unsubscribe()
    }
  }, [fetchData])

  const criticalCount = data.filter(d => d.pulse.risk_level === 'KRITIK').length

  return (
    <div className="dm">
      <Topbar title="Canlı Operasyon" subtitle="Anlık sipariş ve istasyon durumu — 5sn güncelleme"
        action={
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-[10px] font-bold">{criticalCount} Kritik</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{
                background: isLive ? 'rgba(34,197,94,0.07)' : 'var(--s2)',
                border: isLive ? '1px solid rgba(34,197,94,0.18)' : '1px solid rgba(255,255,255,0.08)',
              }}>
              <Wifi size={10} className={isLive ? 'text-emerald-400' : 'text-white/20'} />
              <span className="text-[9px]" style={{ color: isLive ? 'rgba(34,197,94,0.8)' : 'rgba(245,245,245,0.25)' }}>
                {isLive ? 'Canlı' : 'Demo'}
              </span>
            </div>
          </div>
        }
      />

      <div className="scroll" style={{ padding: 'clamp(14px,3vw,24px) clamp(14px,3vw,24px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((d, i) => {
              const rc = getRiskConfig(d.pulse.risk_level)
              const stations = d.pulse.station_scores as unknown as unknown as Record<string, number> || {}
              return (
                <div key={d.restaurant.id}
                  className="rounded-[12px] border px-4 py-3 transition-all duration-300"
                  style={{
                    background: 'var(--s1)',
                    borderColor: d.pulse.risk_level === 'KRITIK' ? 'rgba(239,68,68,0.18)' : 'var(--bdr)',
                  }}>
                  <div className="flex items-center gap-4">
                    {/* Score */}
                    <div className="w-10 text-center shrink-0">
                      <div className="text-[18px] font-bold num leading-none" style={{ color: rc.color, letterSpacing: '-0.04em' }}>
                        {d.pulse.score}
                      </div>
                      <div className="text-[8px] uppercase mt-0.5" style={{ color: rc.color, opacity: 0.6 }}>
                        {d.pulse.risk_level}
                      </div>
                    </div>

                    <div className="w-px h-8 shrink-0" style={{ background: 'var(--bdr)' }} />

                    {/* Restaurant name */}
                    <div className="w-36 shrink-0">
                      <div className="text-[12px] font-medium truncate">{d.restaurant.name}</div>
                      <div className="text-[9px] mt-px" style={{ color: 'var(--tx3)' }}>{d.restaurant.district}</div>
                    </div>

                    {/* Orders */}
                    <div className="w-16 shrink-0 text-center">
                      <div className="text-[15px] font-bold num" style={{ color: 'var(--tx)' }}>{d.activeOrders}</div>
                      <div className="text-[9px]" style={{ color: 'var(--tx3)' }}>açık</div>
                    </div>

                    {/* Prep time */}
                    <div className="w-16 shrink-0 text-center hidden md:block">
                      <div className="text-[13px] font-semibold num" style={{ color: 'var(--tx2)' }}>
                        {d.snapshot?.avg_preparation_time?.toFixed(1) ?? d.pulse.avg_prep_time?.toFixed(1) ?? '—'} dk
                      </div>
                      <div className="text-[9px]" style={{ color: 'var(--tx3)' }}>hazırlama</div>
                    </div>

                    {/* Station bars */}
                    <div className="flex-1 hidden lg:flex gap-2 items-center">
                      {['grill', 'fryer', 'packing', 'courier'].map(st => {
                        const val = stations[st] ?? (d.snapshot as unknown as unknown as Record<string, unknown>)?.[`${st}_load`] ?? 0
                        const barColor = val > 80 ? '#ef4444' : val > 60 ? '#f97316' : '#22c55e'
                        return (
                          <div key={st} className="flex-1">
                            <div className="text-[8px] uppercase mb-1" style={{ color: 'var(--tx3)' }}>{st}</div>
                            <div className="h-1 rounded-full" style={{ background: 'var(--s2)' }}>
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${val}%`, background: barColor }} />
                            </div>
                            <div className="text-[8px] mt-0.5 num" style={{ color: barColor }}>{val}%</div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Nabız bar */}
                    <div className="w-24 shrink-0 hidden xl:block">
                      <div className="h-1.5 rounded-full" style={{ background: 'var(--s2)' }}>
                        <div className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${d.pulse.score}%`, background: rc.color, opacity: 0.8 }} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
