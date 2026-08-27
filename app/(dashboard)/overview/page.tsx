import { Topbar } from '@/components/layout/topbar'
import { RestaurantCard } from '@/components/cards/restaurant-card'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot, getPredictions, getWeather, getHourlyForecast, getRecommendation } from '@/data/seed/mock-data'
import { RestaurantDashboard, RiskLevel } from '@/types'
import { getRiskConfig } from '@/lib/utils'
import { AlertTriangle, Store, TrendingUp } from 'lucide-react'

function buildDashboard(restaurantId: string): RestaurantDashboard {
  const restaurant = RESTAURANTS.find(r => r.id === restaurantId)!
  return {
    restaurant,
    pulse: getPulseScore(restaurantId),
    snapshot: getSnapshot(restaurantId),
    predictions: getPredictions(restaurantId),
    latest_recommendation: getRecommendation(restaurantId),
    weather: getWeather(restaurantId),
    hourly_forecast: getHourlyForecast(restaurantId),
  }
}

export default function OverviewPage() {
  const dashboards = RESTAURANTS.map(r => buildDashboard(r.id))

  const byRisk: Record<RiskLevel, number> = { NORMAL: 0, YOGUN: 0, RISKLI: 0, KRITIK: 0 }
  dashboards.forEach(d => { byRisk[d.pulse.risk_level]++ })
  const criticalSoon = dashboards.filter(d => d.pulse.score >= 70).slice(0, 3)

  const riskLevels: { level: RiskLevel; emoji: string }[] = [
    { level: 'KRITIK', emoji: '🔴' },
    { level: 'RISKLI', emoji: '🟠' },
    { level: 'YOGUN', emoji: '🟡' },
    { level: 'NORMAL', emoji: '🟢' },
  ]

  return (
    <div>
      <Topbar title="Genel Bakış" subtitle="Tüm restoranlar — anlık operasyon durumu" />
      <div className="p-6 space-y-6">

        {/* Summary bar */}
        <div className="grid grid-cols-4 gap-4">
          {riskLevels.map(({ level, emoji }) => {
            const config = getRiskConfig(level)
            const count = byRisk[level]
            return (
              <div key={level} className={`rounded-xl border p-4 ${config.bg} ${config.border}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/40 uppercase tracking-wide font-medium">{config.label}</span>
                  <span className="text-lg">{emoji}</span>
                </div>
                <div className={`text-3xl font-bold ${config.color}`}>{count}</div>
                <div className="text-xs text-white/30 mt-0.5">restoran</div>
              </div>
            )
          })}
        </div>

        {/* Critical soon alert */}
        {criticalSoon.length > 0 && (
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/[0.06] p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-orange-300">Önümüzdeki 30 dakika kritik hale gelmesi beklenen restoranlar</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              {criticalSoon.map(d => (
                <div key={d.restaurant.id} className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-1.5">
                  <span className="text-xs text-white/70">{d.restaurant.name}</span>
                  <span className="text-xs font-bold text-orange-400">+{d.predictions[1]?.predicted_pulse_score ?? d.pulse.score}</span>
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
            {dashboards
              .sort((a, b) => b.pulse.score - a.pulse.score)
              .map(data => (
                <RestaurantCard key={data.restaurant.id} data={data} />
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
