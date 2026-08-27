'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getRecommendation, getPulseScore } from '@/data/seed/mock-data'
import { getRiskConfig, cn } from '@/lib/utils'
import { CheckCircle, Zap, AlertTriangle } from 'lucide-react'

export default function AIRecommendationsPage() {
  const allRecs = RESTAURANTS
    .map(r => ({ restaurant: r, recommendation: getRecommendation(r.id), pulse: getPulseScore(r.id) }))
    .filter(x => x.recommendation)
    .sort((a, b) => b.pulse.score - a.pulse.score)

  const [applied, setApplied] = useState<Record<string, boolean>>({})

  const toggle = (actionId: string) => setApplied(p => ({ ...p, [actionId]: !p[actionId] }))

  return (
    <div>
      <Topbar title="AI Önerileri" subtitle="Tüm restoranlar için aktif operasyon reçeteleri" />
      <div className="p-6 space-y-4">
        {allRecs.map(({ restaurant, recommendation, pulse }) => {
          if (!recommendation) return null
          const config = getRiskConfig(pulse.risk_level)
          return (
            <div key={restaurant.id} className={cn('rounded-xl border p-5', config.bg, config.border)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Zap className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-semibold text-white">{restaurant.name}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', config.badge)}>{config.label}</span>
                  </div>
                  <p className="text-xs text-white/50">{recommendation.summary}</p>
                </div>
                <div className={cn('text-2xl font-bold tabular-nums', config.color)}>{pulse.score}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {recommendation.actions.map(action => {
                  const isApplied = applied[action.id] ?? action.applied
                  return (
                    <button key={action.id} onClick={() => toggle(action.id)}
                      className={cn('flex items-start gap-2 rounded-lg border p-3 text-left transition-all',
                        isApplied ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]')}>
                      <div className={cn('mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0',
                        isApplied ? 'bg-emerald-500 border-emerald-500' : 'border-white/20')}>
                        {isApplied && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <div className={cn('text-xs', isApplied ? 'text-white/40 line-through' : 'text-white/80')}>{action.action_text}</div>
                        <div className={cn('text-[10px] mt-0.5', action.priority === 'HIGH' ? 'text-red-400' : 'text-white/30')}>
                          {action.priority === 'HIGH' ? '⚡ Acil' : '○ Orta öncelik'}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
