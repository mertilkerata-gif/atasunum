'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchRecommendations } from '@/lib/supabase-client'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { cn } from '@/lib/utils'
import { Lightbulb, CheckCircle2, Clock, ArrowRight, Loader2, Wifi } from 'lucide-react'

interface Action {
  id: string
  action_text: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  station?: string
  expected_improvement?: string
  time_to_impact?: string
  applied: boolean
  applied_at?: string
}

interface Recommendation {
  id: string
  restaurant_id: string
  summary: string
  risk_explanation: string
  actions: Action[]
  forecast_note?: string
  created_at: string
}

const PRIORITY_CONFIG = {
  HIGH:   { label: 'Yüksek',  color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.18)' },
  MEDIUM: { label: 'Orta',    color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.18)' },
  LOW:    { label: 'Düşük',   color: '#eab308', bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.18)' },
}

export default function AIRecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const rows = await fetchRecommendations()
      if (rows.length > 0) {
        setRecs(rows.map(r => ({
          ...r,
          actions: Array.isArray(r.actions)
            ? r.actions
            : (r.recommendation_actions ?? []),
        })))
        setIsLive(true)
      } else {
        // Mock fallback
        setRecs([
          {
            id: 'mock-r6', restaurant_id: 'r6',
            summary: 'Popeyes Taksim kritik eşiği aştı — acil müdahale gerekiyor',
            risk_explanation: 'Tüm istasyonlar %88+ yükte. Hazırlama süresi 13.4dk ile normalin 2 katına çıktı.',
            actions: [
              { id: 'a1', action_text: 'Yedek personel çağır: en az 2 ek çalışan', priority: 'HIGH', station: 'packing', expected_improvement: 'Packing yükü %20 düşer', time_to_impact: '10 dk', applied: false },
              { id: 'a2', action_text: 'Grill grubunu 2 ekstra ürün önceden hazırla', priority: 'HIGH', station: 'grill', expected_improvement: 'Hazırlama 3-4 dk kısalır', time_to_impact: '5 dk', applied: false },
              { id: 'a3', action_text: 'Kurye toplama noktasını düzenle', priority: 'MEDIUM', station: 'courier', expected_improvement: 'Kurye bekleme %30 azalır', time_to_impact: '15 dk', applied: false },
            ],
            forecast_note: 'Sonraki 30dk içinde 12 yeni sipariş bekleniyor',
            created_at: new Date().toISOString(),
          },
          {
            id: 'mock-r1', restaurant_id: 'r1',
            summary: 'BK Kadıköy — packing darboğazı kritik',
            risk_explanation: 'Packing yükü %94. Açık sipariş sayısı normalin %35 üzerinde.',
            actions: [
              { id: 'b1', action_text: 'Packing istasyonuna ek eleman al', priority: 'HIGH', station: 'packing', expected_improvement: 'Yük %25 düşer', time_to_impact: '8 dk', applied: false },
              { id: 'b2', action_text: 'Kurye toplama noktasını düzenle', priority: 'MEDIUM', station: 'courier', expected_improvement: 'Bekleme 2dk kısalır', time_to_impact: '10 dk', applied: false },
            ],
            forecast_note: 'Yağmur etkisi 1 saat daha sürecek',
            created_at: new Date(Date.now() - 300000).toISOString(),
          },
        ])
        setIsLive(false)
      }
    } catch {
      setIsLive(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const applyAction = async (recId: string, actionId: string) => {
    setApplying(actionId)
    // Supabase'de işaretle
    try {
      const { getSupabase } = await import('@/lib/supabase-client')
      await getSupabase().from('recommendation_actions').update({ applied: true, applied_at: new Date().toISOString() }).eq('id', actionId)
    } catch { /* demo modda ignore */ }
    setRecs(prev => prev.map(r =>
      r.id === recId ? { ...r, actions: r.actions.map(a => a.id === actionId ? { ...a, applied: true, applied_at: new Date().toISOString() } : a) } : r
    ))
    setApplying(null)
  }

  const totalApplied = recs.flatMap(r => r.actions).filter(a => a.applied).length
  const totalActions = recs.flatMap(r => r.actions).length

  return (
    <div className="dm">
      <Topbar title="AI Önerileri" subtitle="Otomatik üretilen operasyon reçeteleri"
        action={
          <div className="flex items-center gap-2">
            <div className="text-[10px] num rounded-full px-2.5 py-1"
              style={{ background: 'var(--s2)', border: '1px solid var(--bdr)', color: 'var(--tx3)' }}>
              {totalApplied}/{totalActions} uygulandı
            </div>
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{
                background: isLive ? 'rgba(34,197,94,0.07)' : 'var(--s2)',
                border: isLive ? '1px solid rgba(34,197,94,0.18)' : '1px solid rgba(255,255,255,0.08)',
              }}>
              <Wifi size={10} className={isLive ? 'text-emerald-400' : 'text-white/20'} />
              <span className="text-[9px]" style={{ color: isLive ? 'rgba(34,197,94,0.8)' : 'rgba(245,245,245,0.25)' }}>
                {isLive ? 'Supabase' : 'Demo'}
              </span>
            </div>
          </div>
        }
      />

      <div className="scroll" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="text-white/20 animate-spin" />
          </div>
        ) : (
          recs.map((rec, i) => {
            const restaurant = RESTAURANTS.find(r => r.id === rec.restaurant_id)
            const appliedCount = rec.actions.filter(a => a.applied).length
            return (
              <div key={rec.id} className="rounded-[14px] border animate-fade-in"
                style={{ animationDelay: `${i * 40}ms`, background: 'var(--s1)', borderColor: 'var(--bdr)' }}>

                {/* Header */}
                <div className="flex items-start gap-4 px-5 pt-4 pb-3"
                  style={{ borderBottom: '1px solid var(--bdr)' }}>
                  <div className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(232,130,12,0.10)', border: '1px solid rgba(232,130,12,0.20)' }}>
                    <Lightbulb size={14} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-semibold px-1.5 py-px rounded"
                        style={{ background: restaurant?.brand === 'POPEYES' ? 'rgba(249,115,22,0.10)' : 'rgba(96,165,250,0.10)',
                                 color: restaurant?.brand === 'POPEYES' ? '#fb923c' : '#93c5fd' }}>
                        {restaurant?.brand === 'POPEYES' ? 'POP' : 'BK'}
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--tx2)' }}>
                        {restaurant?.name ?? rec.restaurant_id}
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-[9px] num" style={{ color: 'var(--tx3)' }}>
                        <Clock size={9} />
                        {new Date(rec.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 className="text-[13px] font-semibold" style={{ color: 'var(--tx)', letterSpacing: '-0.02em' }}>
                      {rec.summary}
                    </h3>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--tx3)' }}>{rec.risk_explanation}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-5 py-3 space-y-2">
                  <div className="text-[9px] uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--tx3)' }}>
                    Önerilen Aksiyonlar — {appliedCount}/{rec.actions.length} uygulandı
                  </div>
                  {rec.actions.map(action => {
                    const pc = PRIORITY_CONFIG[action.priority]
                    return (
                      <div key={action.id}
                        className={cn('flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-all', action.applied && 'opacity-50')}
                        style={{
                          background: action.applied ? 'rgba(255,255,255,0.02)' : pc.bg,
                          border: `1px solid ${action.applied ? 'var(--bdr)' : pc.border}`,
                        }}>
                        <div className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: action.applied ? 'rgba(255,255,255,0.15)' : pc.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11.5px] font-medium leading-snug"
                            style={{ color: action.applied ? 'var(--tx3)' : 'var(--tx)', textDecoration: action.applied ? 'line-through' : 'none' }}>
                            {action.action_text}
                          </div>
                          {action.expected_improvement && !action.applied && (
                            <div className="text-[10px] mt-0.5" style={{ color: 'var(--tx3)' }}>
                              {action.expected_improvement} · {action.time_to_impact}
                            </div>
                          )}
                        </div>
                        {action.station && (
                          <span className="text-[9px] px-1.5 py-px rounded shrink-0"
                            style={{ background: 'var(--s2)', color: 'var(--tx3)', border: '1px solid var(--bdr)' }}>
                            {action.station}
                          </span>
                        )}
                        {action.applied
                          ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                          : (
                            <button onClick={() => applyAction(rec.id, action.id)}
                              disabled={applying === action.id}
                              className="shrink-0 flex items-center gap-1 rounded-[7px] px-2.5 py-1 text-[10px] font-medium transition-all hover:opacity-80"
                              style={{ background: pc.bg, border: `1px solid ${pc.border}`, color: pc.color }}>
                              {applying === action.id ? '…' : 'Uygula'}
                            </button>
                          )
                        }
                      </div>
                    )
                  })}
                </div>

                {/* Forecast note */}
                {rec.forecast_note && (
                  <div className="px-5 pb-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-[9px]"
                      style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.10)' }}>
                      <ArrowRight size={10} className="text-blue-400 shrink-0" />
                      <span className="text-[10px]" style={{ color: 'rgba(147,197,253,0.6)' }}>{rec.forecast_note}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
