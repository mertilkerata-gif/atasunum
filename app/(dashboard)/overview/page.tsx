'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RestaurantCard } from '@/components/cards/restaurant-card'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot, getPredictions, getWeather, getHourlyForecast, getRecommendation } from '@/data/seed/mock-data'
import { RestaurantDashboard, RiskLevel } from '@/types'
import { getRiskConfig, cn } from '@/lib/utils'
import { AlertTriangle, Store, Play, Loader2, Zap } from 'lucide-react'
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
  { delay: 0, msg: '🎬 Senaryo başlatılıyor — BK Kadıköy, saat 18:20...' },
  { delay: 1500, msg: '📦 Packing yükü %94\'e çıktı' },
  { delay: 3000, msg: '🔴 Nabız skoru 84 → Kritik eşiği aştı!' },
  { delay: 4500, msg: '🛵 Kurye bekleme süresi 8 dakikaya ulaştı' },
  { delay: 6000, msg: '🤖 AI Operasyon Reçetesi üretildi' },
  { delay: 7500, msg: '✅ Senaryo tamamlandı' },
]

export default function OverviewPage() {
  const [scenarioRunning, setScenarioRunning] = useState(false)
  const [scenarioStep, setScenarioStep] = useState(-1)

  const dashboards = RESTAURANTS.map(r => buildDashboard(r.id))
  const byRisk: Record<RiskLevel, number> = { NORMAL: 0, YOGUN: 0, RISKLI: 0, KRITIK: 0 }
  dashboards.forEach(d => { byRisk[d.pulse.risk_level]++ })
  const criticalSoon = dashboards.filter(d => d.pulse.score >= 70).slice(0, 3)

  const runScenario = () => {
    if (scenarioRunning) return
    setScenarioRunning(true)
    setScenarioStep(0)
    SCENARIO_STEPS.forEach((step, i) => {
      setTimeout(() => {
        setScenarioStep(i)
        if (i === 2) addNotification({ type: 'kritik', title: 'BK Kadıköy — KRİTİK', message: 'Nabız skoru 84/100. Packing darboğazı.' })
        if (i === 3) addNotification({ type: 'riskli', title: 'Kurye Bekleme', message: 'BK Kadıköy kurye bekleme 8.1 dk — artıyor.' })
        if (i === 4) addNotification({ type: 'success', title: 'AI Reçete Hazır', message: 'BK Kadıköy için 4 aksiyon önerildi.' })
        if (i === SCENARIO_STEPS.length - 1) setTimeout(() => { setScenarioRunning(false); setScenarioStep(-1) }, 2000)
      }, step.delay)
    })
  }

  const riskLevels: { level: RiskLevel; emoji: string }[] = [
    { level: 'KRITIK', emoji: '🔴' }, { level: 'RISKLI', emoji: '🟠' },
    { level: 'YOGUN', emoji: '🟡' }, { level: 'NORMAL', emoji: '🟢' },
  ]

  return (
    <div>
      <Topbar title="Genel Bakış" subtitle="Tüm restoranlar — anlık operasyon durumu" />
      <div className="p-6 space-y-6">

        {/* Summary bar */}
        <div className="grid grid-cols-4 gap-4">
          {riskLevels.map(({ level, emoji }) => {
            const config = getRiskConfig(level)
            return (
              <div key={level} className={cn('rounded-xl border p-4', config.bg, config.border)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/40 uppercase tracking-wide font-medium">{config.label}</span>
                  <span className="text-lg">{emoji}</span>
                </div>
                <div className={cn('text-3xl font-bold', config.color)}>{byRisk[level]}</div>
                <div className="text-xs text-white/30 mt-0.5">restoran</div>
              </div>
            )
          })}
        </div>

        {/* Demo senaryo */}
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/[0.05] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-indigo-300">Canlı Demo Senaryosu</span>
              <span className="text-xs text-white/30">BK Kadıköy yoğunluk krizi — saat 18:20</span>
            </div>
            <button onClick={runScenario} disabled={scenarioRunning}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                scenarioRunning ? 'bg-indigo-500/20 text-indigo-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-400 text-white')}>
              {scenarioRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {scenarioRunning ? 'Çalışıyor...' : 'Senaryoyu Başlat'}
            </button>
          </div>
          {scenarioRunning && scenarioStep >= 0 && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex gap-1">
                {SCENARIO_STEPS.map((_, i) => (
                  <div key={i} className={cn('h-1 rounded-full transition-all', i <= scenarioStep ? 'bg-indigo-400 w-8' : 'bg-white/[0.08] w-4')} />
                ))}
              </div>
              <span className="text-xs text-indigo-300">{SCENARIO_STEPS[scenarioStep]?.msg}</span>
            </div>
          )}
        </div>

        {/* Critical soon alert */}
        {criticalSoon.length > 0 && (
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/[0.06] p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-orange-300">Önümüzdeki 30 dakikada risk artışı beklenen restoranlar</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              {criticalSoon.map(d => (
                <div key={d.restaurant.id} className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-1.5">
                  <span className="text-xs text-white/70">{d.restaurant.name}</span>
                  <span className="text-xs font-bold text-orange-400">{d.predictions[1]?.predicted_pulse_score ?? d.pulse.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Restaurant grid */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-4 h-4 text-white/40" />
            <span className="text-sm font-medium text-white/60">Tüm Restoranlar</span>
            <span className="text-xs text-white/30">({dashboards.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {dashboards.sort((a, b) => b.pulse.score - a.pulse.score).map(data => (
              <RestaurantCard key={data.restaurant.id} data={data} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
