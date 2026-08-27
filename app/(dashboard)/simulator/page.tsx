'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { getRiskConfig, cn } from '@/lib/utils'
import { RiskLevel } from '@/types'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore } from '@/data/seed/mock-data'
import { FlaskConical, Play } from 'lucide-react'

function calcScore(base: number, params: SimParams): number {
  let delta = 0
  if (params.extraPacking > 0) delta -= params.extraPacking * 7
  if (params.extraGrill > 0) delta -= params.extraGrill * 6
  if (params.extraStaff > 0) delta -= params.extraStaff * 4
  if (params.orderIncrease > 0) delta += params.orderIncrease * 0.4
  if (!params.campaignActive) delta -= 5
  return Math.max(0, Math.min(100, Math.round(base + delta)))
}

function calcPrepTime(base: number, params: SimParams): number {
  let delta = 0
  if (params.extraPacking > 0) delta -= params.extraPacking * 1.2
  if (params.extraGrill > 0) delta -= params.extraGrill * 0.9
  if (params.orderIncrease > 0) delta += params.orderIncrease * 0.08
  return Math.max(3, +(base + delta).toFixed(1))
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
  const [ran, setRan] = useState(false)

  const pulse = getPulseScore(restaurantId)
  const newScore = calcScore(pulse.score, params)
  const newPrepTime = calcPrepTime(pulse.avg_prep_time, params)
  const newRisk: RiskLevel = newScore >= 80 ? 'KRITIK' : newScore >= 60 ? 'RISKLI' : newScore >= 40 ? 'YOGUN' : 'NORMAL'
  const origConfig = getRiskConfig(pulse.risk_level)
  const newConfig = getRiskConfig(newRisk)
  const improvement = pulse.score - newScore

  return (
    <div>
      <Topbar title="What-If Simülatör" subtitle="Senaryo bazlı operasyon tahmini" />
      <div className="p-6 max-w-5xl space-y-6">

        {/* Restoran seç */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-3">Restoran Seç</div>
          <div className="grid grid-cols-5 gap-2">
            {RESTAURANTS.map(r => (
              <button key={r.id} onClick={() => { setRestaurantId(r.id); setRan(false) }}
                className={cn('rounded-lg border px-3 py-2 text-xs text-left transition-all', restaurantId === r.id ? 'border-orange-500/50 bg-orange-500/10 text-orange-300' : 'border-white/[0.08] text-white/40 hover:text-white/60')}>
                <div className="font-medium">{r.name.split(' ').slice(-1)[0]}</div>
                <div className="text-white/30">{r.district}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Parameters */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 space-y-5">
            <div className="text-xs text-white/40 uppercase tracking-wide font-medium">Senaryo Parametreleri</div>

            {[
              { key: 'extraPacking', label: '+Packing Personeli', options: [0, 1, 2] },
              { key: 'extraGrill', label: '+Grill Personeli', options: [0, 1, 2] },
              { key: 'extraStaff', label: '+Genel Personel', options: [0, 1, 2] },
              { key: 'orderIncrease', label: 'Sipariş Artışı (%)', options: [0, 20, 40] },
            ].map(({ key, label, options }) => (
              <div key={key}>
                <div className="text-xs text-white/60 mb-2">{label}</div>
                <div className="flex gap-2">
                  {options.map(opt => (
                    <button key={opt} onClick={() => setParams(p => ({ ...p, [key]: opt }))}
                      className={cn('px-4 py-1.5 rounded-lg border text-sm font-medium transition-all', (params as any)[key] === opt ? 'border-orange-500/50 bg-orange-500/15 text-orange-300' : 'border-white/[0.08] text-white/40 hover:text-white/60')}>
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
                    className={cn('px-4 py-1.5 rounded-lg border text-sm font-medium transition-all', params.campaignActive === v ? 'border-orange-500/50 bg-orange-500/15 text-orange-300' : 'border-white/[0.08] text-white/40 hover:text-white/60')}>
                    {v ? 'Aktif' : 'Pasif'}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setRan(true)}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors mt-2">
              <Play className="w-4 h-4" />
              Simülasyonu Çalıştır
            </button>
          </div>

          {/* Results */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
            <div className="text-xs text-white/40 uppercase tracking-wide font-medium mb-4">Karşılaştırma</div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={cn('rounded-xl border p-4', origConfig.bg, origConfig.border)}>
                <div className="text-xs text-white/40 mb-2">Mevcut Durum</div>
                <div className={cn('text-4xl font-bold tabular-nums', origConfig.color)}>{pulse.score}</div>
                <div className={cn('text-xs mt-1 font-medium', origConfig.color)}>{origConfig.label}</div>
                <div className="text-xs text-white/40 mt-2">{pulse.avg_prep_time.toFixed(1)} dk hazırlama</div>
              </div>

              <div className={cn('rounded-xl border p-4 transition-all', ran ? `${newConfig.bg} ${newConfig.border}` : 'border-white/[0.06] bg-white/[0.02]')}>
                <div className="text-xs text-white/40 mb-2">Simülasyon Sonucu</div>
                {ran ? (
                  <>
                    <div className={cn('text-4xl font-bold tabular-nums', newConfig.color)}>{newScore}</div>
                    <div className={cn('text-xs mt-1 font-medium', newConfig.color)}>{newConfig.label}</div>
                    <div className="text-xs text-white/40 mt-2">{newPrepTime} dk hazırlama</div>
                  </>
                ) : (
                  <div className="text-white/20 text-sm mt-4">Simülasyonu çalıştır</div>
                )}
              </div>
            </div>

            {ran && (
              <div className="space-y-3">
                <div className={cn('rounded-lg border p-3', improvement > 0 ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-red-500/30 bg-red-500/[0.06]')}>
                  <div className="text-xs text-white/40 mb-1">Nabız Skoru Değişimi</div>
                  <div className={cn('text-2xl font-bold', improvement > 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {improvement > 0 ? '▼' : '▲'} {Math.abs(improvement)} puan
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-3">
                  <div className="text-xs text-white/40 mb-1">Hazırlama Süresi Değişimi</div>
                  <div className={cn('text-2xl font-bold', pulse.avg_prep_time > newPrepTime ? 'text-emerald-400' : 'text-red-400')}>
                    {pulse.avg_prep_time > newPrepTime ? '▼' : '▲'} {Math.abs(+(pulse.avg_prep_time - newPrepTime).toFixed(1))} dk
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
