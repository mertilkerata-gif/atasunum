'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { MEMORY_ENTRIES, LEARNED_PATTERNS } from '@/data/seed/memory'
import { getRiskConfig, cn } from '@/lib/utils'
import { Brain, TrendingDown, CheckCircle, Zap, ChevronRight } from 'lucide-react'

const ACTION_COLORS: Record<string, string> = {
  STAFF_ADD:       '#818cf8',
  PREP_ADJUST:     '#f97316',
  COURIER_PRIORITY:'#22c55e',
  STOCK_REFILL:    '#eab308',
  PROCESS_CHANGE:  '#c084fc',
}
const ACTION_LABELS: Record<string, string> = {
  STAFF_ADD:'Personel Takviye', PREP_ADJUST:'Hazırlık Ayarı',
  COURIER_PRIORITY:'Kurye Öncelik', STOCK_REFILL:'Stok İkmal', PROCESS_CHANGE:'Süreç Değişimi',
}

export default function MemoryPage() {
  const [tab, setTab] = useState<'history' | 'patterns'>('history')

  const avgImprovement = Math.round(MEMORY_ENTRIES.reduce((s, m) => s + m.improvement, 0) / MEMORY_ENTRIES.length)
  const aiRecommendedCount = MEMORY_ENTRIES.filter(m => m.aiRecommended).length
  const totalPulseReduced = MEMORY_ENTRIES.reduce((s, m) => s + (m.pulseBefore - m.pulseAfter), 0)

  return (
    <div>
      <Topbar title="Operasyonel Hafıza" subtitle="Uygulanan aksiyonlar · Öğrenilen örüntüler · KPI sonuçları" />
      <div className="p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Toplam Aksiyon', value: MEMORY_ENTRIES.length, unit: 'kayıtlı', color: 'text-white', icon: <CheckCircle className="w-4 h-4" /> },
            { label: 'Ort. İyileşme', value: `%${avgImprovement}`, unit: 'metrik düşüşü', color: 'text-emerald-400', icon: <TrendingDown className="w-4 h-4" /> },
            { label: 'AI Önerisi', value: `%${Math.round(aiRecommendedCount/MEMORY_ENTRIES.length*100)}`, unit: `${aiRecommendedCount} aksiyondan`, color: 'text-indigo-400', icon: <Zap className="w-4 h-4" /> },
            { label: 'Öğrenilen Örüntü', value: LEARNED_PATTERNS.length, unit: 'aktif pattern', color: 'text-orange-400', icon: <Brain className="w-4 h-4" /> },
          ].map(({ label, value, unit, color, icon }) => (
            <div key={label} className="rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-white/30 uppercase tracking-widest">{label}</span>
                <span className={cn('opacity-40', color)}>{icon}</span>
              </div>
              <div className={cn('text-2xl font-bold font-mono', color)}>{value}</div>
              <div className="text-[11px] text-white/25 mt-1">{unit}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border border-white/[0.07] rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.02)', width: 'fit-content' }}>
          {[{ id: 'history', label: '📋 Aksiyon Geçmişi' }, { id: 'patterns', label: '🧠 Öğrenilen Örüntüler' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={cn('px-5 py-2.5 rounded-lg text-xs font-medium transition-all',
                tab === t.id ? 'bg-orange-500/15 border border-orange-500/25 text-orange-300' : 'text-white/40 hover:text-white/60')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* History */}
        {tab === 'history' && (
          <div className="space-y-3">
            {MEMORY_ENTRIES.map(entry => {
              const color = ACTION_COLORS[entry.actionType] ?? '#fff'
              const scoreImprovement = entry.pulseBefore - entry.pulseAfter
              return (
                <div key={entry.id} className="rounded-2xl border p-5"
                  style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="flex items-start gap-4">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                      <div className="w-3 h-3 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}60` }} />
                      <div className="w-px flex-1 min-h-[40px]" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: color + '20', color, border: `1px solid ${color}30` }}>
                            {ACTION_LABELS[entry.actionType]}
                          </span>
                          <span className="text-xs text-white/50">{entry.restaurantName}</span>
                          {entry.aiRecommended && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                              style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.2)' }}>
                              AI Önerisi
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-white/25 font-mono shrink-0">{entry.date} {entry.time}</span>
                      </div>

                      <div className="text-sm font-medium text-white/80 mb-3">{entry.action}</div>

                      {/* Before → After */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="rounded-xl border px-4 py-2.5 min-w-[120px]"
                          style={{ background: 'rgba(255,61,61,0.06)', borderColor: 'rgba(255,61,61,0.15)' }}>
                          <div className="text-[9px] text-white/25 mb-0.5">Öncesi · {entry.before.metric}</div>
                          <div className="text-sm font-bold font-mono text-red-400">{entry.before.value}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                        <div className="rounded-xl border px-4 py-2.5 min-w-[120px]"
                          style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.15)' }}>
                          <div className="text-[9px] text-white/25 mb-0.5">Sonrası · {entry.after.metric}</div>
                          <div className="text-sm font-bold font-mono text-emerald-400">{entry.after.value}</div>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="text-lg font-bold text-emerald-400">↓%{entry.improvement}</div>
                          {scoreImprovement > 0 && (
                            <div className="text-[10px] text-white/30">Nabız ↓{scoreImprovement}</div>
                          )}
                        </div>
                      </div>

                      {/* Pulse change */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-[10px] text-white/30">Nabız:</div>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm font-bold font-mono', getRiskConfig(entry.pulseBefore >= 80 ? 'KRITIK' : entry.pulseBefore >= 60 ? 'RISKLI' : entry.pulseBefore >= 40 ? 'YOGUN' : 'NORMAL').color)}>{entry.pulseBefore}</span>
                          <span className="text-white/20">→</span>
                          <span className={cn('text-sm font-bold font-mono', getRiskConfig(entry.pulseAfter >= 80 ? 'KRITIK' : entry.pulseAfter >= 60 ? 'RISKLI' : entry.pulseAfter >= 40 ? 'YOGUN' : 'NORMAL').color)}>{entry.pulseAfter}</span>
                        </div>
                        <div className="text-[10px] text-white/25">— {entry.appliedBy}</div>
                      </div>

                      {entry.learnedPattern && (
                        <div className="flex items-center gap-2 mt-2 text-[11px] rounded-lg border px-3 py-2"
                          style={{ background: 'rgba(249,115,22,0.04)', borderColor: 'rgba(249,115,22,0.12)' }}>
                          <Brain className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span className="text-orange-300/70">Öğrenilen: {entry.learnedPattern}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Patterns */}
        {tab === 'patterns' && (
          <div className="space-y-4">
            {LEARNED_PATTERNS.map(p => (
              <div key={p.id} className="rounded-2xl border p-6" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-bold text-white">{p.pattern}</span>
                    </div>
                    <div className="text-xs text-white/40">Tetikleyici: {p.trigger}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold font-mono text-emerald-400">%{p.successRate}</div>
                    <div className="text-[10px] text-white/30">başarı oranı</div>
                  </div>
                </div>
                <div className="rounded-xl border px-4 py-3 mb-4"
                  style={{ background: 'rgba(129,140,248,0.05)', borderColor: 'rgba(129,140,248,0.15)' }}>
                  <div className="text-[10px] text-indigo-300/60 mb-1">Önerilen Aksiyon</div>
                  <div className="text-sm text-indigo-200">{p.recommendedAction}</div>
                </div>
                <div className="flex items-center gap-6 text-xs text-white/30">
                  <span>{p.appliedCount} kez uygulandı</span>
                  <span>Ort. %{p.avgImprovement} iyileşme</span>
                  <span>{p.restaurants.length} restoran</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
