'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RestaurantCard } from '@/components/cards/restaurant-card'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot, getPredictions, getWeather, getHourlyForecast, getRecommendation } from '@/data/seed/mock-data'
import { RestaurantDashboard, RiskLevel } from '@/types'
import { getRiskConfig, cn } from '@/lib/utils'
import { AlertTriangle, Play, Loader2, Zap, Activity, RefreshCw, Database } from 'lucide-react'
import { addNotification } from '@/components/layout/notification-center'

// Mock fallback
function buildMockDashboard(restaurantId: string): RestaurantDashboard {
  return {
    restaurant: RESTAURANTS.find(r => r.id === restaurantId)!,
    pulse: getPulseScore(restaurantId),
    snapshot: getSnapshot(restaurantId),
    predictions: getPredictions(restaurantId),
    latest_recommendation: getRecommendation(restaurantId),
    weather: getWeather(restaurantId),
    hourly_forecast: getHourlyForecast(restaurantId),
  }
}

const SCENARIO_STEPS = [
  { delay: 0,    msg: 'Senaryo başlatılıyor — BK Kadıköy, saat 18:20' },
  { delay: 1500, msg: 'Packing yükü %94 eşiğini aştı' },
  { delay: 3000, msg: 'Nabız skoru 84 — Kritik seviye!' },
  { delay: 4500, msg: 'Kurye bekleme süresi 8 dakikaya çıktı' },
  { delay: 6000, msg: 'AI Operasyon Reçetesi üretildi' },
  { delay: 7500, msg: 'Senaryo tamamlandı' },
]

export default function OverviewPage() {
  const [scenarioRunning, setScenarioRunning] = useState(false)
  const [scenarioStep, setScenarioStep] = useState(-1)
  const [filter, setFilter] = useState<RiskLevel | 'ALL'>('ALL')
  const [dashboards, setDashboards] = useState<RestaurantDashboard[]>([])
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/pulse/all')
      if (!res.ok) throw new Error('API hatası')
      const json = await res.json()

      if (json.success && json.data?.restaurants?.length > 0 && !json.data.demo_mode) {
        // Canlı veri — API'den gelen pulse skorlarını mock snapshot/weather ile birleştir
        const live = json.data.restaurants.map((r: { id: string; name: string; brand: string; district: string; region: string; score: number; risk_level: RiskLevel; computed_at: string; open_orders: number; top_signals: string[] }) => {
          const restaurant = RESTAURANTS.find(rest => rest.id === r.id) || {
            id: r.id, name: r.name, brand: r.brand, city: 'İstanbul',
            district: r.district, region: r.region, capacity: 80,
          }
          return {
            restaurant,
            pulse: {
              id: r.id,
              restaurant_id: r.id,
              score: r.score,
              risk_level: r.risk_level,
              computed_at: r.computed_at,
              open_orders: r.open_orders,
              avg_prep_time: null,
              avg_packing_time: null,
              courier_wait: null,
              station_scores: {},
              top_signals: r.top_signals || [],
              component_scores: {},
            },
            snapshot: getSnapshot(r.id),
            predictions: getPredictions(r.id),
            latest_recommendation: getRecommendation(r.id),
            weather: getWeather(r.id),
            hourly_forecast: getHourlyForecast(r.id),
          }
        })
        setDashboards(live)
        setIsLive(true)
      } else {
        // Demo mod — mock data kullan
        setDashboards(RESTAURANTS.map(r => buildMockDashboard(r.id)))
        setIsLive(false)
      }
    } catch {
      // API erişilemiyor — mock data
      setDashboards(RESTAURANTS.map(r => buildMockDashboard(r.id)))
      setIsLive(false)
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [])

  useEffect(() => {
    fetchData()
    // Her 5 dakikada otomatik yenile
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  const byRisk: Record<RiskLevel, number> = { NORMAL: 0, YOGUN: 0, RISKLI: 0, KRITIK: 0 }
  dashboards.forEach(d => { byRisk[d.pulse.risk_level]++ })

  const filtered = filter === 'ALL' ? dashboards : dashboards.filter(d => d.pulse.risk_level === filter)
  const sorted = [...filtered].sort((a, b) => b.pulse.score - a.pulse.score)
  const criticalSoon = dashboards.filter(d => d.pulse.score >= 70 && d.pulse.risk_level !== 'KRITIK')
  const avgScore = dashboards.length ? Math.round(dashboards.reduce((s, d) => s + d.pulse.score, 0) / dashboards.length) : 0

  const runScenario = () => {
    if (scenarioRunning) return
    setScenarioRunning(true)
    setScenarioStep(0)
    SCENARIO_STEPS.forEach((step, i) => {
      setTimeout(() => {
        setScenarioStep(i)
        if (i === 2) addNotification({ type: 'kritik', title: 'BK Kadıköy — KRİTİK', message: 'Nabız 84/100. Packing darboğazı.' })
        if (i === 3) addNotification({ type: 'riskli', title: 'Kurye Bekleme Artışı', message: 'BK Kadıköy — 8.1 dk ve artıyor.' })
        if (i === 4) addNotification({ type: 'success', title: 'AI Reçete Hazır', message: '4 aksiyon önerisi üretildi.' })
        if (i === SCENARIO_STEPS.length - 1) setTimeout(() => { setScenarioRunning(false); setScenarioStep(-1) }, 2000)
      }, step.delay)
    })
  }

  const riskLevels: { level: RiskLevel; emoji: string; label: string }[] = [
    { level: 'KRITIK', emoji: '🔴', label: 'Kritik' },
    { level: 'RISKLI', emoji: '🟠', label: 'Riskli' },
    { level: 'YOGUN',  emoji: '🟡', label: 'Yoğun' },
    { level: 'NORMAL', emoji: '🟢', label: 'Normal' },
  ]

  return (
    <div>
      <Topbar title="Genel Bakış" subtitle="Tüm ağ — anlık operasyon durumu"
        actions={
          <div className="flex items-center gap-2">
            {/* Canlı/Demo badge */}
            <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border',
              isLive
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-white/[0.04] border-white/[0.08] text-white/30')}>
              <Database className="w-3 h-3" />
              {isLive ? 'Canlı' : 'Demo'}
            </div>
            <button onClick={fetchData} disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] border border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/[0.15] transition-all">
              <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            </button>
            <button onClick={runScenario} disabled={scenarioRunning}
              className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                scenarioRunning
                  ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 cursor-not-allowed'
                  : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20')}>
              {scenarioRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {scenarioRunning ? 'Çalışıyor...' : 'Demo Senaryo'}
            </button>
          </div>
        } />

      <div className="page-container space-y-5">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
              <span className="text-sm text-white/30">Veriler yükleniyor...</span>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Scenario progress */}
            {scenarioRunning && (
              <div className="rounded-xl border p-4 fade-up"
                style={{ background: 'rgba(129,140,248,0.06)', borderColor: 'rgba(129,140,248,0.2)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-300">Canlı Demo Senaryosu</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {SCENARIO_STEPS.map((_, i) => (
                    <div key={i} className={cn('h-0.5 rounded-full transition-all duration-500',
                      i <= scenarioStep ? 'bg-indigo-400 flex-1' : 'bg-white/[0.08] w-4')} />
                  ))}
                </div>
                <p className="text-xs text-white/50">{SCENARIO_STEPS[scenarioStep]?.msg}</p>
              </div>
            )}

            {/* Summary stat bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 stat-grid">
              {/* Avg score */}
              <div className="rounded-2xl border p-4 relative overflow-hidden md:col-span-1"
                style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="absolute inset-0 opacity-10"
                  style={{ background: 'radial-gradient(circle at 80% 20%, #f97316, transparent 60%)' }} />
                <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Ağ Ortalaması</div>
                <div className="text-4xl font-bold font-mono" style={{ color: avgScore >= 60 ? '#f97316' : avgScore >= 40 ? '#eab308' : '#22c55e' }}>
                  {avgScore}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <Activity className="w-3 h-3 text-white/20" />
                  <span className="text-[10px] text-white/30">{dashboards.length} restoran</span>
                </div>
              </div>

              {/* Risk cards */}
              {riskLevels.map(({ level, emoji, label }) => {
                const config = getRiskConfig(level)
                const count = byRisk[level]
                const isActive = filter === level
                return (
                  <button key={level} onClick={() => setFilter(isActive ? 'ALL' : level)}
                    className={cn('rounded-2xl border p-4 text-left transition-all duration-200 relative overflow-hidden',
                      isActive ? `${config.bg} ${config.glow}` : 'hover:border-white/[0.1]',
                      count > 0 && !isActive ? config.bg : '')}
                    style={{
                      borderColor: isActive ? undefined : count > 0 ? config.colorHex + '25' : 'rgba(255,255,255,0.07)',
                      background: isActive ? undefined : count === 0 ? 'var(--bg-surface)' : undefined,
                    }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] text-white/30 uppercase tracking-widest">{label}</span>
                      <span className="text-sm">{emoji}</span>
                    </div>
                    <div className={cn('text-3xl font-bold font-mono leading-none', config.color)}
                      style={count > 0 ? { textShadow: `0 0 20px ${config.colorHex}40` } : undefined}>
                      {count}
                    </div>
                    {isActive && <div className="text-[9px] text-white/40 mt-2 uppercase tracking-wider">Filtreli</div>}
                  </button>
                )
              })}
            </div>

            {/* Critical soon alert */}
            {criticalSoon.length > 0 && (
              <div className="rounded-xl border p-4 flex items-start gap-3"
                style={{ background: 'rgba(249,115,22,0.05)', borderColor: 'rgba(249,115,22,0.18)' }}>
                <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-orange-300 mb-2">Önümüzdeki 30 dk içinde kritik hale gelmesi bekleniyor</div>
                  <div className="flex flex-wrap gap-2">
                    {criticalSoon.map(d => (
                      <div key={d.restaurant.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1 border"
                        style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                        <span className="text-xs text-white/60">{d.restaurant.name}</span>
                        <span className="text-xs font-bold text-orange-400 font-mono">{d.predictions[1]?.predicted_pulse_score ?? d.pulse.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Filter info */}
            {filter !== 'ALL' && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">
                  {sorted.length} restoran — <span className={getRiskConfig(filter).color}>{getRiskConfig(filter).label}</span> filtresi
                </span>
                <button onClick={() => setFilter('ALL')} className="text-xs text-white/30 hover:text-white/60 transition-colors">
                  Kaldır ×
                </button>
              </div>
            )}

            {/* Restaurant grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {sorted.map((data, i) => (
                <div key={data.restaurant.id} className="fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <RestaurantCard data={data} />
                </div>
              ))}
            </div>

            {/* Son güncelleme */}
            {lastRefresh && (
              <div className="text-center text-[10px] text-white/20 pt-2">
                Son güncelleme: {lastRefresh.toLocaleTimeString('tr-TR')} · {isLive ? 'Supabase' : 'Demo verisi'} · 5 dk otomatik yenileme
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
