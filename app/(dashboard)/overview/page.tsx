'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RestaurantCard } from '@/components/cards/restaurant-card'
import { fetchAllPulseScores, fetchRestaurants, fetchLatestSnapshots } from '@/lib/supabase-client'
import { getPredictions, getWeather, getHourlyForecast, getRecommendation, getSnapshot, getPulseScore } from '@/data/seed/mock-data'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { RestaurantDashboard, RiskLevel } from '@/types'
import { getRiskConfig, cn } from '@/lib/utils'
import { Loader2, RefreshCw, Database, Wifi } from 'lucide-react'

function buildDashboard(restaurantId: string, pulseData?: Record<string, unknown>, snapshotData?: Record<string, unknown>): RestaurantDashboard {
  const restaurant = RESTAURANTS.find(r => r.id === restaurantId)!
  const pulse = pulseData ?? getPulseScore(restaurantId)
  const snapshot = snapshotData ?? getSnapshot(restaurantId)
  return {
    restaurant,
    pulse: pulse as RestaurantDashboard['pulse'],
    snapshot: snapshot as RestaurantDashboard['snapshot'],
    predictions: getPredictions(restaurantId),
    latest_recommendation: getRecommendation(restaurantId),
    weather: getWeather(restaurantId),
    hourly_forecast: getHourlyForecast(restaurantId),
  }
}

export default function OverviewPage() {
  const [dashboards, setDashboards] = useState<RestaurantDashboard[]>([])
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [filter, setFilter] = useState<RiskLevel | 'ALL'>('ALL')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [pulseRows, restaurantRows, snapshotRows] = await Promise.all([
        fetchAllPulseScores(),
        fetchRestaurants(),
        fetchLatestSnapshots(),
      ])

      const pulseMap = Object.fromEntries(pulseRows.map(p => [p.restaurant_id, p]))
      const snapshotMap = Object.fromEntries(snapshotRows.map(s => [s.restaurant_id, s]))

      // Supabase'den gelen restoranları önce, sonra mock'dakiler
      const allIds = [...new Set([
        ...restaurantRows.map(r => r.id),
        ...RESTAURANTS.map(r => r.id),
      ])]

      const result: RestaurantDashboard[] = allIds.map(id => {
        const sbRestaurant = restaurantRows.find(r => r.id === id)
        const mockRestaurant = RESTAURANTS.find(r => r.id === id)
        const restaurant = sbRestaurant ?? mockRestaurant
        if (!restaurant) return null

        return {
          restaurant: restaurant as RestaurantDashboard['restaurant'],
          pulse: (pulseMap[id] ?? getPulseScore(id)) as RestaurantDashboard['pulse'],
          snapshot: (snapshotMap[id] ?? getSnapshot(id)) as RestaurantDashboard['snapshot'],
          predictions: getPredictions(id),
          latest_recommendation: getRecommendation(id),
          weather: getWeather(id),
          hourly_forecast: getHourlyForecast(id),
        }
      }).filter(Boolean) as RestaurantDashboard[]

      const riskOrder: Record<RiskLevel, number> = { KRITIK: 0, RISKLI: 1, YOGUN: 2, NORMAL: 3 }
      result.sort((a, b) => riskOrder[a.pulse.risk_level] - riskOrder[b.pulse.risk_level])

      setDashboards(result)
      setIsLive(pulseRows.length > 0)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Veri çekme hatası:', err)
      // Fallback: mock data
      const fallback = RESTAURANTS.map(r => buildDashboard(r.id))
      const riskOrder: Record<RiskLevel, number> = { KRITIK: 0, RISKLI: 1, YOGUN: 2, NORMAL: 3 }
      fallback.sort((a, b) => riskOrder[a.pulse.risk_level] - riskOrder[b.pulse.risk_level])
      setDashboards(fallback)
      setIsLive(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 60000)
    return () => clearInterval(t)
  }, [fetchData])

  const filtered = dashboards.filter(d => filter === 'ALL' || d.pulse.risk_level === filter)

  const counts = {
    KRITIK: dashboards.filter(d => d.pulse.risk_level === 'KRITIK').length,
    RISKLI: dashboards.filter(d => d.pulse.risk_level === 'RISKLI').length,
    YOGUN:  dashboards.filter(d => d.pulse.risk_level === 'YOGUN').length,
    NORMAL: dashboards.filter(d => d.pulse.risk_level === 'NORMAL').length,
    avgScore: dashboards.length
      ? Math.round(dashboards.reduce((s, d) => s + d.pulse.score, 0) / dashboards.length)
      : 0,
  }

  const FILTERS: { key: RiskLevel | 'ALL'; label: string; count: number; color?: string }[] = [
    { key: 'ALL',    label: 'Tümü',   count: dashboards.length },
    { key: 'KRITIK', label: 'Kritik', count: counts.KRITIK, color: '#ef4444' },
    { key: 'RISKLI', label: 'Riskli', count: counts.RISKLI, color: '#f97316' },
    { key: 'YOGUN',  label: 'Yoğun',  count: counts.YOGUN,  color: '#eab308' },
    { key: 'NORMAL', label: 'Normal', count: counts.NORMAL, color: '#22c55e' },
  ]

  return (
    <div className="animate-fade-in">
      <Topbar
        title="Genel Bakış"
        subtitle="Tüm restoranlar — anlık nabız durumu"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{
                background: isLive ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.04)',
                border: isLive ? '1px solid rgba(34,197,94,0.18)' : '1px solid rgba(255,255,255,0.08)',
              }}>
              {isLive
                ? <Wifi size={10} className="text-emerald-400" />
                : <Database size={10} className="text-white/30" />
              }
              <span className="text-[9px] font-medium"
                style={{ color: isLive ? 'rgba(34,197,94,0.8)' : 'rgba(245,245,245,0.30)' }}>
                {isLive ? 'Supabase' : 'Demo'}
              </span>
            </div>
            <button onClick={fetchData} className="p-1.5 rounded-[7px] hover:bg-white/[0.05] transition-colors"
              style={{ border: '1px solid var(--border-faint)' }}>
              <RefreshCw size={11} className="text-white/25" />
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-5">

        {/* KPI summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Ort. Nabız', value: counts.avgScore, suffix: '/100', color: counts.avgScore > 70 ? '#ef4444' : counts.avgScore > 50 ? '#f97316' : '#22c55e' },
            { label: 'Kritik', value: counts.KRITIK, color: '#ef4444' },
            { label: 'Riskli', value: counts.RISKLI, color: '#f97316' },
            { label: 'Yoğun', value: counts.YOGUN, color: '#eab308' },
            { label: 'Normal', value: counts.NORMAL, color: '#22c55e' },
          ].map(k => (
            <div key={k.label} className="rounded-[12px] px-4 py-3"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-faint)' }}>
              <div className="text-[9px] uppercase tracking-[0.15em] mb-1.5" style={{ color: 'var(--text-ghost)' }}>
                {k.label}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[22px] font-bold num leading-none" style={{ color: k.color, letterSpacing: '-0.04em' }}>
                  {loading ? '—' : k.value}
                </span>
                {k.suffix && <span className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>{k.suffix}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Filtreler */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={cn('flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-[11px] font-medium transition-all duration-100')}
              style={{
                background: filter === f.key ? 'rgba(255,255,255,0.07)' : 'var(--bg-surface)',
                border: filter === f.key ? '1px solid rgba(255,255,255,0.12)' : '1px solid var(--border-faint)',
                color: filter === f.key ? 'var(--text-primary)' : 'var(--text-muted)',
              }}>
              {f.color && (
                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: filter === f.key ? f.color : 'rgba(255,255,255,0.15)' }} />
              )}
              {f.label}
              <span className="text-[10px] num px-1.5 py-px rounded-[5px]"
                style={{
                  background: filter === f.key ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                  color: 'var(--text-ghost)',
                }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Restoran kartları */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="text-white/20 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((d, i) => (
              <div key={d.restaurant.id} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                <RestaurantCard data={d} />
              </div>
            ))}
          </div>
        )}

        {lastRefresh && (
          <div className="text-[10px] num" style={{ color: 'var(--text-ghost)' }}>
            Son güncelleme: {lastRefresh.toLocaleTimeString('tr-TR')}
            {isLive && ' · Supabase bağlı'}
          </div>
        )}
      </div>
    </div>
  )
}
