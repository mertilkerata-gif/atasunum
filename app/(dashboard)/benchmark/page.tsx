'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot } from '@/data/seed/mock-data'
import { getRevenueSnapshot } from '@/data/seed/revenue'
import { getComplaintSummary } from '@/data/seed/complaints'
import { getRiskConfig, cn } from '@/lib/utils'
import { Trophy, Award, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'

interface BadgeDef { icon: string; label: string; color: string; bg: string; border: string }

const BADGES: Record<string, BadgeDef> = {
  fastest:   { icon: '⚡', label: 'En Hızlı Hazırlama', color: '#eab308', bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.25)'   },
  cleanest:  { icon: '✅', label: 'Sıfır İptal',        color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'   },
  calmest:   { icon: '🟢', label: 'En Sakin Nabız',     color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'   },
  revenue:   { icon: '💰', label: 'En Yüksek Ciro',     color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)'  },
  courier:   { icon: '🛵', label: 'En Hızlı Kurye',     color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.25)' },
  complaint: { icon: '💬', label: 'En Az Şikayet',      color: '#c084fc', bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.25)' },
}

export default function BenchmarkPage() {
  const [metric, setMetric] = useState<'pulse' | 'prep' | 'courier' | 'revenue' | 'complaints'>('pulse')

  const data = RESTAURANTS.map(r => {
    const pulse = getPulseScore(r.id)
    const snap  = getSnapshot(r.id)
    const rev   = getRevenueSnapshot(r.id)
    const comp  = getComplaintSummary(r.id)
    const avg   = { pulse: 58, prep: 8.5, courier: 5.2, revenue: 37000, complaints: 8 }
    const badges: string[] = []
    return {
      restaurant: r, pulse, snap, rev, comp,
      scores: {
        pulse:      pulse.score,
        prep:       pulse.avg_prep_time,
        courier:    pulse.courier_wait,
        revenue:    rev.actualRevenue,
        complaints: comp.total,
      },
      badges,
    }
  })

  // Assign badges
  const sorted = {
    fastest:   [...data].sort((a, b) => a.scores.prep - b.scores.prep),
    cleanest:  [...data].sort((a, b) => a.scores.complaints - b.scores.complaints),
    calmest:   [...data].sort((a, b) => a.scores.pulse - b.scores.pulse),
    revenue:   [...data].sort((a, b) => b.scores.revenue - a.scores.revenue),
    courier:   [...data].sort((a, b) => a.scores.courier - b.scores.courier),
    complaint: [...data].sort((a, b) => a.scores.complaints - b.scores.complaints),
  }
  Object.entries(sorted).forEach(([badge, list]) => { list[0].badges.push(badge) })

  const ranked = [...data].sort((a, b) => {
    if (metric === 'pulse')      return a.scores.pulse - b.scores.pulse
    if (metric === 'prep')       return a.scores.prep - b.scores.prep
    if (metric === 'courier')    return a.scores.courier - b.scores.courier
    if (metric === 'revenue')    return b.scores.revenue - a.scores.revenue
    if (metric === 'complaints') return a.scores.complaints - b.scores.complaints
    return 0
  })

  // Network averages
  const avg = {
    pulse:      Math.round(data.reduce((s, d) => s + d.scores.pulse, 0) / data.length),
    prep:       +(data.reduce((s, d) => s + d.scores.prep, 0) / data.length).toFixed(1),
    courier:    +(data.reduce((s, d) => s + d.scores.courier, 0) / data.length).toFixed(1),
    revenue:    Math.round(data.reduce((s, d) => s + d.scores.revenue, 0) / data.length),
    complaints: Math.round(data.reduce((s, d) => s + d.scores.complaints, 0) / data.length),
  }

  const metricConfig = {
    pulse:      { label: 'Nabız Skoru',      unit: '',    lowerBetter: true  },
    prep:       { label: 'Hazırlama Süresi', unit: ' dk', lowerBetter: true  },
    courier:    { label: 'Kurye Bekleme',    unit: ' dk', lowerBetter: true  },
    revenue:    { label: 'Ciro',             unit: ' ₺',  lowerBetter: false },
    complaints: { label: 'Şikayet Sayısı',   unit: '',    lowerBetter: true  },
  }
  const mc = metricConfig[metric]

  // Radar data for top 3
  const radarData = ['Nabız', 'Hazırlama', 'Kurye', 'Ciro', 'Şikayet'].map((label, i) => {
    const keys = ['pulse', 'prep', 'courier', 'revenue', 'complaints'] as const
    const maxVals = { pulse: 100, prep: 15, courier: 12, revenue: 60000, complaints: 25 }
    return {
      metric: label,
      ...Object.fromEntries(ranked.slice(0, 3).map(d => [
        d.restaurant.name.split(' ').slice(-1)[0],
        Math.round((1 - d.scores[keys[i]] / maxVals[keys[i]]) * 100),
      ])),
    }
  })

  return (
    <div>
      <Topbar title="Benchmark & Rozetler" subtitle="Şube karşılaştırması · Performans sıralaması" />
      <div className="p-6 space-y-5">

        {/* Badge wall */}
        <div className="grid grid-cols-6 gap-3">
          {Object.entries(BADGES).map(([key, badge]) => {
            const winner = data.find(d => d.badges.includes(key))
            return (
              <div key={key} className="rounded-2xl border p-4 text-center"
                style={{ background: badge.bg, borderColor: badge.border }}>
                <div className="text-3xl mb-2">{badge.icon}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: badge.color }}>{badge.label}</div>
                {winner && (
                  <div className="text-[11px] text-white/60 truncate">{winner.restaurant.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.')}</div>
                )}
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* Sıralama */}
          <div className="col-span-7">
            {/* Metric tabs */}
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {Object.entries(metricConfig).map(([key, mc]) => (
                <button key={key} onClick={() => setMetric(key as any)}
                  className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                    metric === key ? 'border-orange-500/30 bg-orange-500/10 text-orange-300' : 'border-white/[0.07] text-white/40 hover:text-white/60')}
                  style={{ background: metric === key ? undefined : 'var(--bg-surface)' }}>
                  {mc.label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
              {/* Header */}
              <div className="px-5 py-3 border-b flex items-center justify-between"
                style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                <span className="text-xs text-white/40 uppercase tracking-widest">{mc.label} Sıralaması</span>
                <span className="text-xs text-white/25">Ağ Ort: <span className="font-mono text-white/50">{(avg[metric]).toLocaleString('tr-TR')}{mc.unit}</span></span>
              </div>

              {ranked.map((d, i) => {
                const value = d.scores[metric]
                const avgVal = avg[metric]
                const isAboveAvg = mc.lowerBetter ? value < avgVal : value > avgVal
                const diffPct = Math.round(Math.abs(value - avgVal) / avgVal * 100)
                const config = getRiskConfig(d.pulse.risk_level)
                const medals = ['🥇', '🥈', '🥉']
                return (
                  <div key={d.restaurant.id} className={cn('flex items-center gap-4 px-5 py-3.5 border-b transition-all hover:bg-white/[0.02]', i === 0 && 'bg-white/[0.02]')}
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <div className="w-8 text-center">
                      {i < 3 ? <span className="text-lg">{medals[i]}</span> : <span className="text-sm font-mono text-white/20">{i + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white/70 truncate">{d.restaurant.name}</span>
                        {d.badges.map(b => <span key={b} className="text-sm">{BADGES[b]?.icon}</span>)}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', config.badge)}>{config.label}</span>
                        <span className="text-[10px] text-white/25">{d.restaurant.district}</span>
                      </div>
                    </div>

                    {/* Bar */}
                    <div className="w-32 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: metric === 'revenue'
                              ? `${Math.round(value / 60000 * 100)}%`
                              : `${Math.min(100, Math.round((1 - value/[100,15,12,60000,25][Object.keys(metricConfig).indexOf(metric)]) * 100))}%`,
                            background: i === 0 ? '#f97316' : i === 1 ? '#818cf8' : i === 2 ? '#22c55e' : 'rgba(255,255,255,0.2)',
                          }} />
                      </div>
                    </div>

                    <div className="text-right w-24 shrink-0">
                      <div className="text-sm font-bold font-mono text-white">{typeof value === 'number' && metric === 'revenue' ? value.toLocaleString('tr-TR') : value}{mc.unit}</div>
                      <div className={cn('flex items-center justify-end gap-1 text-[10px]', isAboveAvg ? 'text-emerald-400' : 'text-red-400')}>
                        {isAboveAvg ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isAboveAvg ? '-' : '+'}{diffPct}% ort.
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Radar chart */}
          <div className="col-span-5 rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="text-xs text-white/40 uppercase tracking-widest font-medium mb-1">Top 3 Karşılaştırma</div>
            <div className="text-[10px] text-white/20 mb-4">Yüksek = daha iyi performans</div>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} />
                {ranked.slice(0, 3).map((d, i) => {
                  const colors = ['#f97316', '#818cf8', '#22c55e']
                  const name = d.restaurant.name.split(' ').slice(-1)[0]
                  return (
                    <Radar key={name} name={name} dataKey={name} stroke={colors[i]} fill={colors[i]} fillOpacity={0.1} strokeWidth={2} />
                  )
                })}
                <Tooltip contentStyle={{ background: '#13131e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px' }} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {ranked.slice(0, 3).map((d, i) => {
                const colors = ['#f97316', '#818cf8', '#22c55e']
                return (
                  <div key={d.restaurant.id} className="flex items-center gap-1.5 text-[10px] text-white/40">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i] }} />
                    {d.restaurant.name.split(' ').slice(-1)[0]}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
