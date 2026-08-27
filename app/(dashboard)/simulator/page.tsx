'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { getRiskConfig, cn } from '@/lib/utils'
import { RiskLevel } from '@/types'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot } from '@/data/seed/mock-data'
import { Play, Loader2 } from 'lucide-react'

interface SimResult {
  current: { score: number; risk_level: RiskLevel; avg_prep_time: number; station_scores: Record<string, number> }
  simulated: { score: number; risk_level: RiskLevel; avg_prep_time: number; station_scores: Record<string, number> }
  delta: { score: number; score_pct: number; prep_time: number; risk_improved: boolean }
}

interface SimParams {
  extraPacking: number
  extraGrill: number
  extraStaff: number
  orderIncrease: number
  campaignActive: boolean
}

const DEFAULT: SimParams = { extraPacking: 0, extraGrill: 0, extraStaff: 0, orderIncrease: 0, campaignActive: true }

export default function SimulatorPage() {
  const [restaurantId, setRestaurantId] = useState('r1')
  const [params, setParams] = useState<SimParams>(DEFAULT)
  const [result, setResult] = useState<SimResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pulse = getPulseScore(restaurantId)
  const snapshot = getSnapshot(restaurantId)
  const origConfig = getRiskConfig(pulse.risk_level)

  const runSimulation = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current: {
            restaurant_id: restaurantId,
            open_orders: snapshot.open_orders,
            orders_last_5m: snapshot.orders_last_5m,
            orders_last_15m: snapshot.orders_last_15m,
            avg_preparation_time: snapshot.avg_preparation_time,
            avg_packing_time: snapshot.avg_packing_time,
            avg_courier_wait: snapshot.avg_courier_wait,
            grill_load: snapshot.grill_load,
            fryer_load: snapshot.fryer_load,
            packing_load: snapshot.packing_load,
            courier_load: snapshot.courier_load,
            active_staff: snapshot.active_staff,
            restaurant_capacity: RESTAURANTS.find(r => r.id === restaurantId)?.capacity ?? 80,
            rain_intensity: snapshot.rain_intensity,
            campaign_active: snapshot.campaign_active,
            special_event: snapshot.special_event,
            delay_rate: snapshot.delay_rate,
            cancellation_rate: snapshot.cancellation_rate,
          },
          changes: {
            extra_packing_staff: params.extraPacking || undefined,
            extra_grill_staff: params.extraGrill || undefined,
            extra_staff: params.extraStaff || undefined,
            order_increase_pct: params.orderIncrease || undefined,
            campaign_active: params.campaignActive,
          },
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setResult(data.data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const simConfig = result ? getRiskConfig(result.simulated.risk_level) : null

  return (
    <div>
      <Topbar title="What-If Simülatör" subtitle="Server-side Pulse Engine · Senaryo bazlı tahmin" />
      <div className="p-6 max-w-5xl space-y-6">

        {/* Restoran seç */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-3">Restoran</div>
          <div className="grid grid-cols-5 gap-2">
            {RESTAURANTS.map(r => {
              const p = getPulseScore(r.id)
              const c = getRiskConfig(p.risk_level)
              return (
                <button key={r.id} onClick={() => { setRestaurantId(r.id); setResult(null) }}
                  className={cn('rounded-lg border px-3 py-2 text-xs text-left transition-all',
                    restaurantId === r.id ? `${c.bg} ${c.border} ${c.color}` : 'border-white/[0.08] text-white/40 hover:text-white/60')}>
                  <div className="font-medium truncate">{r.name.split(' ').slice(-1)[0]}</div>
                  <div className="text-white/30">{r.district}</div>
                  <div className={cn('font-bold mt-1', c.color)}>{p.score}</div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Parametreler */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 space-y-5">
            <div className="text-xs text-white/40 uppercase tracking-wide font-medium">Senaryo Parametreleri</div>

            {[
              { key: 'extraPacking' as const, label: '+Packing Personeli', options: [0, 1, 2] },
              { key: 'extraGrill' as const, label: '+Grill Personeli', options: [0, 1, 2] },
              { key: 'extraStaff' as const, label: '+Genel Personel', options: [0, 1, 2] },
              { key: 'orderIncrease' as const, label: 'Sipariş Artışı', options: [0, 20, 40] },
            ].map(({ key, label, options }) => (
              <div key={key}>
                <div className="text-xs text-white/60 mb-2">{label}</div>
                <div className="flex gap-2">
                  {options.map(opt => (
                    <button key={opt} onClick={() => setParams(p => ({ ...p, [key]: opt }))}
                      className={cn('flex-1 py-1.5 rounded-lg border text-sm font-medium transition-all',
                        params[key] === opt ? 'border-orange-500/50 bg-orange-500/15 text-orange-300' : 'border-white/[0.08] text-white/40 hover:text-white/60')}>
                      {opt === 0 ? 'Yok' : key === 'orderIncrease' ? `+${opt}%` : `+${opt}`}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <div className="text-xs text-white/60 mb-2">Kampanya</div>
              <div className="flex gap-2">
                {[true, false].map(v => (
                  <button key={String(v)} onClick={() => setParams(p => ({ ...p, campaignActive: v }))}
                    className={cn('flex-1 py-1.5 rounded-lg border text-sm font-medium transition-all',
                      params.campaignActive === v ? 'border-orange-500/50 bg-orange-500/15 text-orange-300' : 'border-white/[0.08] text-white/40 hover:text-white/60')}>
                    {v ? 'Aktif' : 'Pasif'}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={runSimulation} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {loading ? 'Hesaplanıyor...' : 'Simülasyonu Çalıştır'}
            </button>

            {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</div>}
          </div>

          {/* Sonuçlar */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
            <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">Karşılaştırma</div>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className={cn('rounded-xl border p-4', origConfig.bg, origConfig.border)}>
                <div className="text-xs text-white/40 mb-2">Mevcut</div>
                <div className={cn('text-4xl font-bold tabular-nums', origConfig.color)}>{pulse.score}</div>
                <div className={cn('text-xs mt-1 font-medium', origConfig.color)}>{origConfig.label}</div>
                <div className="text-xs text-white/35 mt-2">{snapshot.avg_preparation_time.toFixed(1)} dk hazırlama</div>
              </div>
              <div className={cn('rounded-xl border p-4 transition-all', result && simConfig ? `${simConfig.bg} ${simConfig.border}` : 'border-white/[0.06] bg-white/[0.02]')}>
                <div className="text-xs text-white/40 mb-2">Simülasyon</div>
                {result && simConfig ? (
                  <>
                    <div className={cn('text-4xl font-bold tabular-nums', simConfig.color)}>{result.simulated.score}</div>
                    <div className={cn('text-xs mt-1 font-medium', simConfig.color)}>{simConfig.label}</div>
                    <div className="text-xs text-white/35 mt-2">{result.simulated.avg_prep_time.toFixed(1)} dk hazırlama</div>
                  </>
                ) : (
                  <div className="text-white/20 text-sm mt-4">{loading ? 'Hesaplanıyor...' : 'Simülasyonu çalıştır'}</div>
                )}
              </div>
            </div>

            {result && (
              <div className="space-y-3">
                <div className={cn('rounded-lg border p-3', result.delta.score > 0 ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : result.delta.score < 0 ? 'border-red-500/30 bg-red-500/[0.06]' : 'border-white/[0.08]')}>
                  <div className="text-xs text-white/40 mb-1">Nabız Skoru Değişimi</div>
                  <div className={cn('text-2xl font-bold tabular-nums', result.delta.score > 0 ? 'text-emerald-400' : result.delta.score < 0 ? 'text-red-400' : 'text-white/50')}>
                    {result.delta.score > 0 ? '▼' : result.delta.score < 0 ? '▲' : '='} {Math.abs(result.delta.score)} puan
                    <span className="text-sm font-normal text-white/30 ml-2">(%{Math.abs(result.delta.score_pct)})</span>
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-3">
                  <div className="text-xs text-white/40 mb-1">Hazırlama Süresi</div>
                  <div className={cn('text-2xl font-bold tabular-nums', result.delta.prep_time > 0 ? 'text-emerald-400' : result.delta.prep_time < 0 ? 'text-red-400' : 'text-white/50')}>
                    {result.delta.prep_time > 0 ? '▼' : result.delta.prep_time < 0 ? '▲' : '='} {Math.abs(result.delta.prep_time).toFixed(1)} dk
                  </div>
                </div>
                {result.delta.risk_improved && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3 text-xs text-emerald-300">
                    ✓ Risk seviyesi düştü: {result.current.risk_level} → {result.simulated.risk_level}
                  </div>
                )}

                {/* İstasyon karşılaştırma */}
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                  <div className="text-xs text-white/30 mb-2">İstasyon Değişimi</div>
                  {(['grill', 'fryer', 'packing', 'courier'] as const).map(st => {
                    const before = result.current.station_scores[st]
                    const after = result.simulated.station_scores[st]
                    const diff = after - before
                    return (
                      <div key={st} className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs text-white/40 w-12 capitalize">{st}</span>
                        <span className="text-xs tabular-nums text-white/60 w-6">{before}</span>
                        <span className="text-white/20">→</span>
                        <span className={cn('text-xs tabular-nums font-bold w-6', diff < 0 ? 'text-emerald-400' : diff > 0 ? 'text-red-400' : 'text-white/50')}>{after}</span>
                        {diff !== 0 && <span className={cn('text-[10px]', diff < 0 ? 'text-emerald-400' : 'text-red-400')}>({diff > 0 ? '+' : ''}{diff})</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
