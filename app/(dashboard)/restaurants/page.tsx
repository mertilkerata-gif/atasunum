'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchRestaurants, fetchAllPulseScores } from '@/lib/supabase-client'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore } from '@/data/seed/mock-data'
import { getRiskConfig, cn } from '@/lib/utils'
import { Store, MapPin, Loader2, Wifi, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Array<{
    id: string; name: string; brand: string; district: string; region: string
    capacity: number; is_active: boolean; score: number; risk_level: string; open_orders: number
  }>>([])
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [restRows, pulseRows] = await Promise.all([fetchRestaurants(), fetchAllPulseScores()])
      const pulseMap = Object.fromEntries(pulseRows.map(p => [p.restaurant_id, p]))

      const merged = restRows.length > 0
        ? restRows.map(r => ({ ...r, ...(pulseMap[r.id] ? { score: pulseMap[r.id].score, risk_level: pulseMap[r.id].risk_level, open_orders: pulseMap[r.id].open_orders } : { score: 0, risk_level: 'NORMAL', open_orders: 0 }) }))
        : RESTAURANTS.map(r => { const p = pulseMap[r.id] ?? getPulseScore(r.id); return { ...r, is_active: true, score: p.score, risk_level: p.risk_level, open_orders: p.open_orders } })

      merged.sort((a, b) => (b.score as number) - (a.score as number))
      setRestaurants(merged)
      setIsLive(restRows.length > 0 && pulseRows.length > 0)
    } catch {
      setRestaurants(RESTAURANTS.map(r => { const p = getPulseScore(r.id); return { ...r, is_active: true, score: p.score, risk_level: p.risk_level, open_orders: p.open_orders } }))
      setIsLive(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="animate-fade-in">
      <Topbar title="Restoranlar" subtitle="Aktif lokasyonlar ve anlık durum"
        action={
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ background: isLive ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.04)', border: isLive ? '1px solid rgba(34,197,94,0.18)' : '1px solid rgba(255,255,255,0.08)' }}>
            <Wifi size={10} className={isLive ? 'text-emerald-400' : 'text-white/20'} />
            <span className="text-[9px]" style={{ color: isLive ? 'rgba(34,197,94,0.8)' : 'rgba(245,245,245,0.25)' }}>
              {isLive ? 'Supabase' : 'Demo'}
            </span>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
          {[
            { label: 'Toplam', value: restaurants.length, color: 'var(--text-primary)' },
            { label: 'BK', value: restaurants.filter(r => r.brand === 'BURGER_KING').length, color: '#60a5fa' },
            { label: 'Popeyes', value: restaurants.filter(r => r.brand === 'POPEYES').length, color: '#fb923c' },
            { label: 'Kritik', value: restaurants.filter(r => r.risk_level === 'KRITIK').length, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} className="rounded-[11px] px-4 py-3"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-faint)' }}>
              <div className="text-[9px] uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--text-ghost)' }}>{s.label}</div>
              <div className="text-[20px] font-bold num" style={{ color: s.color, letterSpacing: '-0.04em' }}>
                {loading ? '—' : s.value}
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="text-white/20 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {restaurants.map((r, i) => {
              const rc = getRiskConfig(r.risk_level as 'KRITIK' | 'RISKLI' | 'YOGUN' | 'NORMAL')
              return (
                <Link href={`/restaurants/${r.id}`} key={r.id}
                  className="flex items-center gap-4 rounded-[11px] px-4 py-3 border transition-all hover:border-white/10 animate-fade-in"
                  style={{ animationDelay: `${i * 25}ms`, background: 'var(--bg-surface)', borderColor: 'var(--border-faint)' }}>

                  <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                    style={{ background: r.brand === 'BURGER_KING' ? 'rgba(96,165,250,0.08)' : 'rgba(249,115,22,0.08)', border: `1px solid ${r.brand === 'BURGER_KING' ? 'rgba(96,165,250,0.15)' : 'rgba(249,115,22,0.15)'}` }}>
                    <Store size={13} style={{ color: r.brand === 'BURGER_KING' ? '#60a5fa' : '#fb923c' }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <MapPin size={9} className="text-white/20 shrink-0" />
                      <span className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>{r.district} · {r.region}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center hidden md:block">
                      <div className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>Açık sipariş</div>
                      <div className="text-[14px] font-bold num" style={{ color: 'var(--text-primary)' }}>{r.open_orders}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>Nabız</div>
                      <div className="text-[18px] font-bold num" style={{ color: rc.color, letterSpacing: '-0.04em' }}>{r.score}</div>
                    </div>
                    <div className="text-[9px] font-semibold px-2 py-1 rounded-[6px]"
                      style={{ background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }}>
                      {r.risk_level}
                    </div>
                    <ExternalLink size={12} className="text-white/15" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
