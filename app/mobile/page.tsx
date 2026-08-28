'use client'
import { useState, useEffect, useRef } from 'react'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot, getRecommendation, getWeather } from '@/data/seed/mock-data'
import { getRiskConfig, cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, CheckCircle, Zap, AlertTriangle, Clock, Package, Thermometer } from 'lucide-react'
import { PulseGauge } from '@/components/cards/pulse-gauge'
import { StationBar } from '@/components/cards/station-bar'
import { RecommendationAction } from '@/types'

export default function MobilePage() {
  const [idx, setIdx] = useState(0)
  const [appliedActions, setAppliedActions] = useState<Record<string, boolean>>({})
  const [time, setTime] = useState('')
  const touchStart = useRef<number>(0)
  const touchEnd = useRef<number>(0)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })), 1000)
    return () => clearInterval(t)
  }, [])

  const restaurant = RESTAURANTS[idx]
  const pulse = getPulseScore(restaurant.id)
  const snapshot = getSnapshot(restaurant.id)
  const recommendation = getRecommendation(restaurant.id)
  const weather = getWeather(restaurant.id)
  const config = getRiskConfig(pulse.risk_level)

  const prev = () => setIdx(i => (i - 1 + RESTAURANTS.length) % RESTAURANTS.length)
  const next = () => setIdx(i => (i + 1) % RESTAURANTS.length)

  const toggleAction = (id: string) => setAppliedActions(p => ({ ...p, [id]: !p[id] }))

  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.changedTouches[0].screenX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEnd.current = e.changedTouches[0].screenX
    const diff = touchStart.current - touchEnd.current
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      {/* Phone frame */}
      <div className="relative w-[390px]" style={{ maxWidth: '100vw' }}>
        {/* Frame border */}
        <div className="absolute inset-0 rounded-[48px] pointer-events-none z-10"
          style={{ boxShadow: '0 0 0 10px #1a1a2a, 0 0 0 12px #252535, 0 0 60px rgba(0,0,0,0.6)' }} />

        {/* Screen */}
        <div className="rounded-[40px] overflow-hidden" style={{ background: 'var(--bg-base)' }}
          onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

          {/* Status bar */}
          <div className="flex items-center justify-between px-6 py-3"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}>
            <span className="text-xs font-semibold text-white font-mono">{time}</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 4px rgba(34,197,94,0.8)' }} />
              <span className="text-[10px] text-white/50">CANLI</span>
            </div>
          </div>

          {/* Hero — risk banner */}
          <div className={cn('px-5 pt-4 pb-5 relative overflow-hidden')}
            style={{ background: `linear-gradient(180deg, ${config.glowColor} 0%, transparent 100%)` }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${config.colorHex}80, transparent)` }} />

            {/* Restaurant nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prev} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                <ChevronLeft className="w-4 h-4 text-white/60" />
              </button>
              <div className="text-center">
                <div className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">
                  {restaurant.brand === 'BURGER_KING' ? '🍔' : '🍗'} {idx + 1}/{RESTAURANTS.length}
                </div>
                <div className="text-sm font-bold text-white leading-tight">{restaurant.name}</div>
                <div className="text-[11px] text-white/40 mt-0.5">{restaurant.district} · {weather.icon} {weather.temperature}°C</div>
              </div>
              <button onClick={next} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                <ChevronRight className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Pulse gauge centered */}
            <div className="flex flex-col items-center mb-4">
              <PulseGauge score={pulse.score} riskLevel={pulse.risk_level} size="lg" />
            </div>

            {/* Dot navigation */}
            <div className="flex justify-center gap-1.5">
              {RESTAURANTS.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === idx ? '20px' : '6px',
                    height: '6px',
                    background: i === idx ? config.colorHex : 'rgba(255,255,255,0.15)',
                  }} />
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div className="px-5 py-4">
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { icon: <Package className="w-3.5 h-3.5" />, label: 'Açık Sipariş', value: pulse.open_orders, alert: pulse.open_orders > 25 },
                { icon: <Clock className="w-3.5 h-3.5" />, label: 'Hazırlama', value: `${pulse.avg_prep_time.toFixed(1)}dk`, alert: pulse.avg_prep_time > 10 },
                { icon: <Thermometer className="w-3.5 h-3.5" />, label: 'Kurye Bekl.', value: `${pulse.courier_wait.toFixed(1)}dk`, alert: pulse.courier_wait > 7 },
              ].map(({ icon, label, value, alert }) => (
                <div key={label} className="rounded-2xl border p-3 text-center"
                  style={{ background: alert ? 'rgba(255,61,61,0.08)' : 'rgba(255,255,255,0.04)', borderColor: alert ? 'rgba(255,61,61,0.2)' : 'rgba(255,255,255,0.08)' }}>
                  <div className={cn('flex justify-center mb-1', alert ? 'text-red-400' : 'text-white/30')}>{icon}</div>
                  <div className={cn('text-xl font-bold font-mono leading-none', alert ? 'text-red-400' : 'text-white')}
                    style={alert ? { textShadow: '0 0 12px rgba(255,61,61,0.4)' } : undefined}>{value}</div>
                  <div className="text-[9px] text-white/25 mt-1 uppercase tracking-wide">{label}</div>
                </div>
              ))}
            </div>

            {/* Station bars */}
            <div className="rounded-2xl border p-4 mb-4"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3">İstasyon Durumu</div>
              <div className="space-y-2.5">
                <StationBar label="Grill"   score={pulse.station_scores.grill}   icon="🔥" />
                <StationBar label="Fryer"   score={pulse.station_scores.fryer}   icon="🍟" />
                <StationBar label="Packing" score={pulse.station_scores.packing} icon="📦" />
                <StationBar label="Kurye"   score={pulse.station_scores.courier} icon="🛵" />
              </div>
            </div>

            {/* AI Reçete */}
            {recommendation ? (
              <div className="rounded-2xl border p-4 mb-4"
                style={{ background: 'rgba(129,140,248,0.05)', borderColor: 'rgba(129,140,248,0.18)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-300">Operasyon Reçetesi</span>
                </div>
                <div className="space-y-2">
                  {recommendation.actions.slice(0, 3).map((action: RecommendationAction) => {
                    const applied = appliedActions[action.id] ?? action.applied
                    return (
                      <button key={action.id} onClick={() => toggleAction(action.id)}
                        className={cn('w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all',
                          applied ? 'opacity-50' : 'active:scale-[0.98]')}
                        style={{
                          background: applied ? 'rgba(34,197,94,0.06)' : action.priority === 'HIGH' ? 'rgba(255,61,61,0.05)' : 'rgba(255,255,255,0.03)',
                          borderColor: applied ? 'rgba(34,197,94,0.2)' : action.priority === 'HIGH' ? 'rgba(255,61,61,0.15)' : 'rgba(255,255,255,0.07)',
                        }}>
                        <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
                          applied ? 'bg-emerald-500 border-emerald-500' : 'border-white/20')}>
                          {applied && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <span className={cn('text-xs leading-snug', applied ? 'text-white/30 line-through' : 'text-white/70')}>
                          {action.action_text}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border p-4 mb-4 text-center"
                style={{ background: 'rgba(34,197,94,0.04)', borderColor: 'rgba(34,197,94,0.15)' }}>
                <div className="text-emerald-400 text-sm font-semibold">✓ Operasyon Normal</div>
                <div className="text-xs text-white/30 mt-0.5">Aktif reçete yok</div>
              </div>
            )}

            {/* Sinyaller */}
            {pulse.top_signals.length > 0 && (
              <div className="space-y-2">
                {pulse.top_signals.slice(0, 2).map((s, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-xl border px-3 py-2"
                    style={{ background: 'rgba(249,115,22,0.05)', borderColor: 'rgba(249,115,22,0.15)' }}>
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-orange-300/80 leading-snug">{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom nav */}
          <div className="flex items-center justify-around px-6 py-4 border-t"
            style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }}>
            {[
              { label: 'Genel', icon: '⚡', href: '/overview' },
              { label: 'Canlı', icon: '📊', href: '/live-operations' },
              { label: 'AI', icon: '🤖', href: '/ai-analyst' },
              { label: 'Tam', icon: '🖥', href: '/overview' },
            ].map(({ label, icon, href }) => (
              <a key={label} href={href}
                className="flex flex-col items-center gap-1 text-white/30 hover:text-white/60 transition-colors">
                <span className="text-lg">{icon}</span>
                <span className="text-[9px] uppercase tracking-wider">{label}</span>
              </a>
            ))}
          </div>

          {/* Home indicator */}
          <div className="flex justify-center pb-3 pt-1">
            <div className="w-32 h-1 rounded-full bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  )
}
