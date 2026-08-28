'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RestaurantCard } from '@/components/cards/restaurant-card'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot, getPredictions, getWeather, getHourlyForecast, getRecommendation } from '@/data/seed/mock-data'
import { RestaurantDashboard, RiskLevel } from '@/types'
import { getRiskConfig, cn } from '@/lib/utils'
import { AlertTriangle, Play, Loader2, Zap, Activity } from 'lucide-react'
import { addNotification } from '@/components/layout/notification-center'

function buildDashboard(restaurantId: string): RestaurantDashboard {
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

  const dashboards = RESTAURANTS.map(r => buildDashboard(r.id))
  const byRisk: Record<RiskLevel, number> = { NORMAL: 0, YOGUN: 0, RISKLI: 0, KRITIK: 0 }
  dashboards.forEach(d => { byRisk[d.pulse.risk_level]++ })

  const filtered = filter === 'ALL' ? dashboards : dashboards.filter(d => d.pulse.risk_level === filter)
  const sorted = [...filtered].sort((a, b) => b.pulse.score - a.pulse.score)

  const criticalSoon = dashboards.filter(d => d.pulse.score >= 70 && d.pulse.risk_level !== 'KRITIK')

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

  const avgScore = Math.round(dashboards.reduce((s, d) => s + d.pulse.score, 0) / dashboards.length)

  return (
    <div>
      <Topbar title="Genel Bakış" subtitle="Tüm ağ — anlık operasyon durumu"
        actions={
          <button onClick={runScenario} disabled={scenarioRunning}
            className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
              scenarioRunning
                ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 cursor-not-allowed'
                : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20')}>
            {scenarioRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {scenarioRunning ? 'Çalışıyor...' : 'Demo Senaryo'}
          </button>
        } />

      <div className="p-6 space-y-5">

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
                  i <= scenarioStep ? 'bg-indigo-400' : 'bg-white/[0.08]',
                  i <= scenarioStep ? 'flex-1' : 'w-4')} />
              ))}
            </div>
            <p className="text-xs text-white/50">{SCENARIO_STEPS[scenarioStep]?.msg}</p>
          </div>
        )}

        {/* Summary stat bar */}
        <div className="grid grid-cols-5 gap-3">
          {/* Avg score */}
          <div className="rounded-2xl border p-4 relative overflow-hidden"
            style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)', gridColumn: 'span 1' }}>
            <div className="absolute inset-0 opacity-10"
              style={{ background: 'radial-gradient(circle at 80% 20%, #f97316, transparent 60%)' }} />
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Ağ Ortalaması</div>
            <div className="text-4xl font-bold font-mono" style={{ color: avgScore >= 60 ? '#f97316' : avgScore >= 40 ? '#eab308' : '#22c55e' }}>
              {avgScore}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <Activity className="w-3 h-3 text-white/20" />
              <span className="text-[10px] text-white/30">{RESTAURANTS.length} restoran</span>
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
                  count > 0 && !isActive ? config.bg : ''
                )}
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
                {isActive && (
                  <div className="text-[9px] text-white/40 mt-2 uppercase tracking-wider">Filtreli</div>
                )}
              </button>
            )
          })}
        </div>

        {/* Upcoming risk alert */}
        {criticalSoon.length > 0 && (
          <div className="rounded-xl border p-4 flex items-start gap-3"
            style={{ background: 'rgba(249,115,22,0.05)', borderColor: 'rgba(249,115,22,0.18)' }}>
            <div className="relative mt-0.5 shrink-0">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
            </div>
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
              {sorted.length} restoran — <span className={getRiskConfig(filter).color}>{getRiskConfig(filter).label}</span> filtresi aktif
            </span>
            <button onClick={() => setFilter('ALL')} className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Filtreyi kaldır ×
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
      </div>
    </div>
  )
}
