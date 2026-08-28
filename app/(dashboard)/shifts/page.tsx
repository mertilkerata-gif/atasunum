'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { generateShiftPlan, getWeeklyShiftPlans, HISTORICAL_PERFORMANCE, UPCOMING_EVENTS } from '@/data/seed/shifts'
import { getPulseScore } from '@/data/seed/mock-data'
import { getRiskConfig, cn } from '@/lib/utils'
import { Users, TrendingUp, AlertTriangle, CheckCircle, Calendar, Zap, ChevronRight, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const DEMAND_CONFIG = {
  LOW:       { label: 'Düşük',     color: 'text-emerald-400', bg: 'rgba(34,197,94,0.08)',    border: 'rgba(34,197,94,0.2)'    },
  MEDIUM:    { label: 'Orta',      color: 'text-yellow-400',  bg: 'rgba(234,179,8,0.08)',    border: 'rgba(234,179,8,0.2)'    },
  HIGH:      { label: 'Yüksek',    color: 'text-orange-400',  bg: 'rgba(249,115,22,0.08)',   border: 'rgba(249,115,22,0.2)'   },
  VERY_HIGH: { label: 'Çok Yüksek',color: 'text-red-400',     bg: 'rgba(255,61,61,0.08)',    border: 'rgba(255,61,61,0.2)'    },
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border px-3 py-2 text-xs" style={{ background: '#13131e', borderColor: 'rgba(255,255,255,0.1)' }}>
      <div className="text-white/40 mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex gap-2 mt-0.5">
          <span style={{ color: p.color }}>●</span>
          <span className="text-white font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function ShiftsPage() {
  const [restaurantId, setRestaurantId] = useState('r1')
  const [selectedDate, setSelectedDate] = useState(Object.keys(UPCOMING_EVENTS)[0])
  const [approvedDates, setApprovedDates] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)

  const weeklyPlans = getWeeklyShiftPlans(restaurantId)
  const currentPlan = generateShiftPlan(restaurantId, selectedDate)
  const restaurant = RESTAURANTS.find(r => r.id === restaurantId)!
  const demandConfig = DEMAND_CONFIG[currentPlan.predictedDemand]
  const staffGap = currentPlan.recommendedStaff.total - currentPlan.currentStaff.total
  const isApproved = approvedDates.has(selectedDate + restaurantId)

  const handleGenerate = async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 1800))
    setGenerating(false)
  }

  const handleApprove = () => {
    setApprovedDates(prev => new Set([...prev, selectedDate + restaurantId]))
  }

  const staffRoles = [
    { key: 'grill',   label: 'Grill',   icon: '🔥', rec: currentPlan.recommendedStaff.grill,   cur: currentPlan.currentStaff.grill },
    { key: 'fryer',   label: 'Fryer',   icon: '🍟', rec: currentPlan.recommendedStaff.fryer,   cur: currentPlan.currentStaff.fryer },
    { key: 'packing', label: 'Packing', icon: '📦', rec: currentPlan.recommendedStaff.packing, cur: currentPlan.currentStaff.packing },
    { key: 'cashier', label: 'Kasiyer', icon: '💳', rec: currentPlan.recommendedStaff.cashier, cur: currentPlan.currentStaff.cashier },
    { key: 'manager', label: 'Müdür',   icon: '👔', rec: 1, cur: 1 },
  ]

  return (
    <div>
      <Topbar title="Vardiya Planlama AI" subtitle="Dış olaylar + tarihsel veri ile optimize vardiya önerisi" />
      <div className="p-6 space-y-5">

        {/* Restoran + tarih seçici */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4">
            <label className="block text-[10px] text-white/30 uppercase tracking-widest mb-2">Restoran</label>
            <select value={restaurantId} onChange={e => setRestaurantId(e.target.value)}
              className="w-full rounded-xl border px-4 py-2.5 text-sm text-white outline-none"
              style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.1)' }}>
              {RESTAURANTS.map(r => <option key={r.id} value={r.id} style={{ background: '#13131e' }}>{r.name}</option>)}
            </select>
          </div>
          <div className="col-span-8">
            <label className="block text-[10px] text-white/30 uppercase tracking-widest mb-2">Tarih Seç</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {weeklyPlans.map(plan => {
                const dc = DEMAND_CONFIG[plan.predictedDemand]
                const isSelected = plan.date === selectedDate
                const isAppr = approvedDates.has(plan.date + restaurantId)
                return (
                  <button key={plan.date} onClick={() => setSelectedDate(plan.date)}
                    className="shrink-0 rounded-xl border px-4 py-2.5 text-left transition-all"
                    style={{
                      background: isSelected ? dc.bg : 'var(--bg-surface)',
                      borderColor: isSelected ? dc.border : 'rgba(255,255,255,0.07)',
                      minWidth: '90px',
                    }}>
                    <div className="text-[10px] text-white/30 mb-0.5">{plan.dayOfWeek.slice(0, 3)}</div>
                    <div className={cn('text-xs font-semibold', isSelected ? dc.color : 'text-white/50')}>
                      {new Date(plan.date).getDate()} Ağu
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {plan.externalEvents.map((e, i) => <span key={i} className="text-[10px]">{e.icon}</span>)}
                      {isAppr && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Dış olaylar banner */}
        {currentPlan.externalEvents.length > 0 && (
          <div className="rounded-2xl border p-4 flex items-start gap-3"
            style={{ background: 'rgba(129,140,248,0.05)', borderColor: 'rgba(129,140,248,0.18)' }}>
            <Calendar className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-indigo-300 mb-2">{currentPlan.dayOfWeek} — Dış Faktörler</div>
              <div className="flex flex-wrap gap-3">
                {currentPlan.externalEvents.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <span className="text-sm">{e.icon}</span>
                    <span className="text-xs text-white/70">{e.name}</span>
                    <span className={cn('text-xs font-bold', e.impact > 0.3 ? 'text-orange-400' : 'text-yellow-400')}>
                      +{Math.round(e.impact * 100)}% TG
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-5">
          {/* AI Plan */}
          <div className="col-span-7 space-y-4">
            {/* Talep tahmini */}
            <div className="rounded-2xl border p-5"
              style={{ background: demandConfig.bg, borderColor: demandConfig.border }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">AI Talep Tahmini</div>
                  <div className={cn('text-2xl font-bold', demandConfig.color)}>{demandConfig.label} Talep</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold font-mono text-white">{currentPlan.estimatedOrders}</div>
                  <div className="text-xs text-white/30">tahmini sipariş</div>
                  <div className="text-sm font-mono text-white/50 mt-0.5">{currentPlan.estimatedRevenue.toLocaleString('tr-TR')} ₺</div>
                </div>
              </div>
              <div className="text-xs text-white/50 leading-relaxed p-3 rounded-xl"
                style={{ background: 'rgba(0,0,0,0.2)' }}>
                <Zap className="w-3 h-3 inline mr-1.5 text-indigo-400" />
                {currentPlan.aiJustification}
              </div>
              <div className="text-[10px] text-white/25 mt-2 text-right">Güven: %{Math.round(currentPlan.confidence * 100)}</div>
            </div>

            {/* Personel karşılaştırma */}
            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-white/40 uppercase tracking-widest font-medium">Personel Planı</div>
                <div className="flex items-center gap-4 text-[10px] text-white/30">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />Mevcut</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Önerilen</span>
                </div>
              </div>

              {staffGap > 0 && (
                <div className="flex items-center gap-2 mb-4 rounded-xl border px-4 py-2.5"
                  style={{ background: 'rgba(255,61,61,0.06)', borderColor: 'rgba(255,61,61,0.2)' }}>
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-xs text-red-300">{staffGap} kişi eksik — tahmin edilen yoğunluğu karşılayamaz</span>
                </div>
              )}

              <div className="space-y-3">
                {staffRoles.map(({ key, label, icon, rec, cur }) => {
                  const gap = rec - cur
                  return (
                    <div key={key} className="flex items-center gap-4">
                      <div className="w-24 flex items-center gap-1.5 shrink-0">
                        <span className="text-xs">{icon}</span>
                        <span className="text-xs text-white/50">{label}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        {/* Mevcut */}
                        {Array.from({ length: Math.max(cur, rec) }).map((_, i) => (
                          <div key={i} className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border transition-all',
                            i < cur
                              ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                              : 'bg-white/[0.03] border-white/[0.05] text-white/10'
                          )}>
                            {i < cur ? '👤' : ''}
                          </div>
                        ))}
                        {gap > 0 && (
                          <div className="flex items-center gap-1 ml-1">
                            {Array.from({ length: gap }).map((_, i) => (
                              <div key={i} className="w-8 h-8 rounded-lg border-2 border-dashed border-orange-500/40 flex items-center justify-center text-xs text-orange-400/60">+</div>
                            ))}
                          </div>
                        )}
                      </div>
                      {gap > 0 && (
                        <span className="text-xs font-bold text-orange-400 shrink-0">+{gap} gerek</span>
                      )}
                      {gap === 0 && <span className="text-xs text-emerald-400/60 shrink-0">✓</span>}
                    </div>
                  )
                })}
              </div>

              {/* Toplam */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-white/30" />
                    <span className="text-xs text-white/40">Mevcut</span>
                    <span className="text-lg font-bold font-mono text-indigo-400">{currentPlan.currentStaff.total}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">Önerilen</span>
                    <span className={cn('text-lg font-bold font-mono', staffGap > 0 ? 'text-orange-400' : 'text-emerald-400')}>
                      {currentPlan.recommendedStaff.total}
                    </span>
                  </div>
                </div>

                {isApproved ? (
                  <div className="flex items-center gap-2 rounded-xl border px-4 py-2 text-emerald-400"
                    style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.2)' }}>
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-semibold">Onaylandı</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleGenerate} disabled={generating}
                      className="flex items-center gap-2 rounded-xl border px-4 py-2 text-xs text-indigo-300 transition-all"
                      style={{ background: 'rgba(129,140,248,0.08)', borderColor: 'rgba(129,140,248,0.2)' }}>
                      {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      AI Yenile
                    </button>
                    <button onClick={handleApprove}
                      className="flex items-center gap-2 rounded-xl border px-4 py-2 text-xs text-white font-semibold transition-all"
                      style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', borderColor: 'rgba(249,115,22,0.4)', boxShadow: '0 0 16px rgba(249,115,22,0.2)' }}>
                      <CheckCircle className="w-3.5 h-3.5" />
                      Planı Onayla
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Risk faktörleri */}
            {currentPlan.riskFactors.length > 0 && (
              <div className="rounded-2xl border p-5" style={{ background: 'rgba(249,115,22,0.04)', borderColor: 'rgba(249,115,22,0.15)' }}>
                <div className="text-xs text-white/40 uppercase tracking-widest font-medium mb-3">Risk Faktörleri</div>
                <div className="space-y-2">
                  {currentPlan.riskFactors.map((rf, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-white/60">{rf}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sağ panel: tarihsel performans + peak saatler */}
          <div className="col-span-5 space-y-4">
            {/* Peak saatler */}
            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="text-xs text-white/40 uppercase tracking-widest font-medium mb-4">Peak Saatler</div>
              <div className="space-y-3">
                {currentPlan.peakHours.map((ph, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="text-xs font-mono text-white/50 w-20 shrink-0">{ph.start}–{ph.end}</div>
                    <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${ph.intensity * 100}%`,
                          background: ph.intensity > 0.9 ? '#ff3d3d' : ph.intensity > 0.75 ? '#f97316' : '#eab308',
                          boxShadow: ph.intensity > 0.9 ? '0 0 8px rgba(255,61,61,0.5)' : 'none',
                        }} />
                    </div>
                    <span className="text-xs text-white/30 w-8 text-right">%{Math.round(ph.intensity * 100)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Geçmiş performans */}
            <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="text-xs text-white/40 uppercase tracking-widest font-medium mb-4">Geçen Hafta Performansı</div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={HISTORICAL_PERFORMANCE}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="dayOfWeek" tickFormatter={v => v.slice(0,3)} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgPulseScore" name="Ort. Nabız" radius={[3, 3, 0, 0]}>
                    {HISTORICAL_PERFORMANCE.map((entry, i) => (
                      <Cell key={i} fill={entry.avgPulseScore >= 60 ? '#f97316' : entry.avgPulseScore >= 40 ? '#eab308' : '#22c55e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-3 space-y-2">
                {HISTORICAL_PERFORMANCE.slice(-3).map((h, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className="text-white/30 w-12">{h.dayOfWeek.slice(0,3)}</span>
                    <span className="text-white/50">{h.staffCount} kişi</span>
                    <span className={cn('font-mono font-bold', h.avgPulseScore >= 60 ? 'text-orange-400' : 'text-emerald-400')}>{h.avgPulseScore} nabız</span>
                    <span className="text-white/30 ml-auto">%{Math.round(h.delayRate * 100)} gecikme</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
