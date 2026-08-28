'use client'
import { useState, useEffect } from 'react'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot } from '@/data/seed/mock-data'
import { getRiskConfig, cn } from '@/lib/utils'
import { PulseGauge } from '@/components/cards/pulse-gauge'
import { StationBar } from '@/components/cards/station-bar'
import { Activity, Zap } from 'lucide-react'

export default function TVPage() {
  const [tick, setTick] = useState(0)
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const [focusIdx, setFocusIdx] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setTick(p => p + 1)
      setTime(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDate(new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!autoRotate) return
    const t = setInterval(() => setFocusIdx(i => (i + 1) % RESTAURANTS.length), 8000)
    return () => clearInterval(t)
  }, [autoRotate])

  const allData = RESTAURANTS.map(r => ({
    restaurant: r,
    pulse: getPulseScore(r.id),
    snapshot: getSnapshot(r.id),
  })).sort((a, b) => b.pulse.score - a.pulse.score)

  const byRisk = {
    KRITIK: allData.filter(d => d.pulse.risk_level === 'KRITIK').length,
    RISKLI: allData.filter(d => d.pulse.risk_level === 'RISKLI').length,
    YOGUN:  allData.filter(d => d.pulse.risk_level === 'YOGUN').length,
    NORMAL: allData.filter(d => d.pulse.risk_level === 'NORMAL').length,
  }

  const avgScore = Math.round(allData.reduce((s, d) => s + d.pulse.score, 0) / allData.length)
  const focused = allData[focusIdx % allData.length]
  const focusConfig = getRiskConfig(focused.pulse.risk_level)

  return (
    <div className="min-h-screen flex flex-col overflow-hidden select-none"
      style={{ background: '#030306', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: focused.pulse.risk_level === 'KRITIK' ? '#ff3d3d' : focused.pulse.risk_level === 'RISKLI' ? '#f97316' : '#22c55e', transition: 'background 2s ease' }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-10"
          style={{ background: '#818cf8' }} />
        {/* Grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-10 py-5 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(3,3,6,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 0 24px rgba(249,115,22,0.4)' }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-white tracking-tight">Mutfak Nabzı</div>
            <div className="text-[11px] text-white/30 uppercase tracking-widest">TAB Gıda · Operasyon Merkezi</div>
          </div>
        </div>

        {/* Network summary */}
        <div className="flex items-center gap-8">
          {[
            { label: 'Kritik', count: byRisk.KRITIK, color: '#ff3d3d' },
            { label: 'Riskli', count: byRisk.RISKLI, color: '#f97316' },
            { label: 'Yoğun',  count: byRisk.YOGUN,  color: '#eab308' },
            { label: 'Normal', count: byRisk.NORMAL,  color: '#22c55e' },
          ].map(({ label, count, color }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-bold font-mono" style={{ color, textShadow: `0 0 20px ${color}60` }}>{count}</div>
              <div className="text-[10px] text-white/30 uppercase tracking-widest">{label}</div>
            </div>
          ))}
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <div className="text-3xl font-bold font-mono text-white">{avgScore}</div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest">Ort. Nabız</div>
          </div>
        </div>

        {/* Clock */}
        <div className="text-right">
          <div className="text-2xl font-bold font-mono text-white">{time}</div>
          <div className="text-[11px] text-white/30 mt-0.5">{date}</div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex gap-6 p-8 overflow-hidden">

        {/* Left: focused restaurant */}
        <div className="w-80 shrink-0 flex flex-col gap-4">
          <div className="text-[10px] text-white/25 uppercase tracking-widest px-1 mb-1">
            Odak Noktası {autoRotate && '· Otomatik'}
          </div>

          <div className={cn('rounded-3xl border p-6 flex-1 flex flex-col relative overflow-hidden', focusConfig.glow)}
            style={{ background: focusConfig.bg, borderColor: focusConfig.colorHex + '30' }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${focusConfig.colorHex}80, transparent)` }} />

            {focused.pulse.risk_level === 'KRITIK' && (
              <div className="absolute top-4 right-4">
                <div className="relative w-3 h-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" style={{ boxShadow: '0 0 10px rgba(255,61,61,0.9)' }} />
                  <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-70" />
                </div>
              </div>
            )}

            <div className="mb-4">
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                {focused.restaurant.brand === 'BURGER_KING' ? '🍔' : '🍗'} {focused.restaurant.brand.replace('_', ' ')}
              </div>
              <div className="text-xl font-bold text-white leading-tight">{focused.restaurant.name}</div>
              <div className="text-sm text-white/40 mt-0.5">{focused.restaurant.district}</div>
            </div>

            <div className="flex justify-center my-4">
              <PulseGauge score={focused.pulse.score} riskLevel={focused.pulse.risk_level} size="lg" />
            </div>

            <div className="space-y-2 mt-auto">
              <StationBar label="Grill"   score={focused.pulse.station_scores.grill}   icon="🔥" />
              <StationBar label="Fryer"   score={focused.pulse.station_scores.fryer}   icon="🍟" />
              <StationBar label="Packing" score={focused.pulse.station_scores.packing} icon="📦" />
              <StationBar label="Kurye"   score={focused.pulse.station_scores.courier} icon="🛵" />
            </div>

            {focused.pulse.top_signals.length > 0 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {focused.pulse.top_signals.slice(0, 2).map((s, i) => (
                  <div key={i} className={cn('text-xs mt-1.5', focusConfig.color)}>◆ {s}</div>
                ))}
              </div>
            )}
          </div>

          {/* Auto rotate controls */}
          <div className="flex gap-2">
            <button onClick={() => setAutoRotate(p => !p)}
              className={cn('flex-1 py-2.5 rounded-xl border text-xs font-medium transition-all',
                autoRotate ? 'border-orange-500/30 bg-orange-500/10 text-orange-300' : 'border-white/[0.07] text-white/30')}
              style={{ background: autoRotate ? undefined : 'rgba(255,255,255,0.02)' }}>
              {autoRotate ? '⏸ Durdur' : '▶ Otomatik'}
            </button>
            <button onClick={() => setFocusIdx(i => (i - 1 + allData.length) % allData.length)}
              className="px-4 py-2.5 rounded-xl border text-xs text-white/30 hover:text-white/60 transition-all"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>←</button>
            <button onClick={() => setFocusIdx(i => (i + 1) % allData.length)}
              className="px-4 py-2.5 rounded-xl border text-xs text-white/30 hover:text-white/60 transition-all"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>→</button>
          </div>
        </div>

        {/* Right: all restaurants grid */}
        <div className="flex-1 grid grid-cols-5 grid-rows-2 gap-4 overflow-hidden">
          {allData.map(({ restaurant, pulse, snapshot }, i) => {
            const config = getRiskConfig(pulse.risk_level)
            const isFocused = i === focusIdx % allData.length
            return (
              <button key={restaurant.id} onClick={() => { setFocusIdx(i); setAutoRotate(false) }}
                className={cn('rounded-2xl border p-4 text-left transition-all duration-500 relative overflow-hidden',
                  isFocused ? config.glow : '')}
                style={{
                  background: isFocused ? config.bg : 'rgba(13,13,20,0.8)',
                  borderColor: isFocused ? config.colorHex + '40' : 'rgba(255,255,255,0.06)',
                  transform: isFocused ? 'scale(1.02)' : 'scale(1)',
                }}>
                {isFocused && (
                  <div className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${config.colorHex}80, transparent)` }} />
                )}
                {pulse.risk_level === 'KRITIK' && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" style={{ boxShadow: '0 0 8px rgba(255,61,61,0.8)' }} />
                  </div>
                )}
                <div className="text-[9px] text-white/25 uppercase tracking-widest mb-1">{restaurant.district}</div>
                <div className="text-xs font-semibold text-white mb-3 leading-tight pr-4">
                  {restaurant.name.replace('Burger King ', 'BK ').replace('Popeyes ', 'Pop.')}
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className={cn('text-3xl font-bold font-mono leading-none', config.color)}
                      style={{ textShadow: `0 0 16px ${config.colorHex}50` }}>{pulse.score}</div>
                    <div className={cn('text-[9px] font-semibold uppercase tracking-wider mt-1', config.color)}>{config.label}</div>
                  </div>
                  <div className="text-right text-[10px] text-white/30 space-y-0.5">
                    <div>{pulse.open_orders} açık</div>
                    <div>{pulse.avg_prep_time.toFixed(1)}dk</div>
                  </div>
                </div>
                {/* Mini station bars */}
                <div className="mt-3 space-y-1">
                  {(['grill', 'fryer', 'packing', 'courier'] as const).map(st => {
                    const score = pulse.station_scores[st]
                    const color = score >= 80 ? '#ff3d3d' : score >= 60 ? '#f97316' : score >= 40 ? '#eab308' : '#22c55e'
                    return (
                      <div key={st} className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
                      </div>
                    )
                  })}
                </div>
              </button>
            )
          })}
        </div>
      </main>

      {/* Footer ticker */}
      <footer className="relative z-10 border-t px-10 py-3 flex items-center justify-between"
        style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(3,3,6,0.9)' }}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
            <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
          </div>
          <span className="text-[11px] text-white/30">Canlı İzleme · Her 5 saniyede güncelleniyor</span>
        </div>
        <div className="flex items-center gap-6 text-[11px] text-white/20">
          <span>Toplam Sipariş: {allData.reduce((s, d) => s + d.snapshot.open_orders, 0)} aktif</span>
          <span>Kritik: {byRisk.KRITIK} restoran</span>
          <span>Tick #{tick}</span>
        </div>
        <a href="/overview" className="text-[11px] text-white/25 hover:text-white/50 transition-colors">
          ← Dashboard'a Dön
        </a>
      </footer>
    </div>
  )
}
