'use client'
import Link from 'next/link'
import { RestaurantDashboard } from '@/types'

interface RestaurantCardProps { data: RestaurantDashboard }

function riskMeta(level: string) {
  switch (level) {
    case 'KRITIK': return { color: '#f04438', bg: 'rgba(240,68,56,0.07)', border: 'rgba(240,68,56,0.16)', label: 'Kritik' }
    case 'RISKLI': return { color: '#f79009', bg: 'rgba(247,144,9,0.07)', border: 'rgba(247,144,9,0.16)', label: 'Riskli' }
    case 'YOGUN':  return { color: '#eaaa08', bg: 'rgba(234,170,8,0.07)', border: 'rgba(234,170,8,0.16)', label: 'Yoğun'  }
    default:        return { color: '#17b26a', bg: 'rgba(23,178,106,0.06)', border: 'rgba(23,178,106,0.14)', label: 'Normal' }
  }
}

function ScoreArc({ score, color }: { score: number; color: string }) {
  const r = 28, cx = 36, cy = 36, sw = 4
  const circ = 2 * Math.PI * r
  const arc  = circ * 0.75
  const off  = arc - (arc * Math.min(score, 100)) / 100
  return (
    <svg width={72} height={58} viewBox="0 0 72 72" style={{ overflow: 'visible' }}>
      <defs>
        <filter id={`g${score}`}>
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="rgba(255,255,255,0.05)" strokeWidth={sw}
        strokeDasharray={`${arc} ${circ}`} strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`} />
      {/* Arc */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={sw}
        strokeDasharray={`${arc} ${circ}`} strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
        filter={`url(#g${score})`}
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }} />
      {/* Score */}
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        style={{ fill: color, fontSize: 15, fontWeight: 700, fontFamily: 'Inter', letterSpacing: '-0.03em' }}>
        {score}
      </text>
    </svg>
  )
}

function StationBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  const high = pct >= 80
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-[10px] shrink-0" style={{ color: 'var(--t4)' }}>{label}</span>
      <div className="flex-1 h-[2px] rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: high ? '#f04438' : color, opacity: high ? 1 : 0.7 }} />
      </div>
      <span className="w-6 text-[10px] text-right num shrink-0"
        style={{ color: high ? '#f04438' : 'var(--t4)' }}>{pct}</span>
    </div>
  )
}

export function RestaurantCard({ data }: RestaurantCardProps) {
  const { restaurant, pulse, snapshot } = data
  const m = riskMeta(pulse.risk_level)
  const isKritik = pulse.risk_level === 'KRITIK'
  const stations = (pulse.station_scores as unknown) as Record<string, number> ?? {}

  return (
    <Link href={`/restaurants/${restaurant.id}`}>
      <div className="rounded-[12px] overflow-hidden cursor-pointer group transition-all duration-150"
        style={{
          background: 'var(--bg-1)',
          border: `1px solid ${isKritik ? m.border : 'var(--line)'}`,
          boxShadow: isKritik ? `0 0 20px rgba(240,68,56,0.06)` : 'none',
        }}>

        {/* Top strip — colored by risk */}
        <div className="h-[2px]" style={{ background: m.color, opacity: isKritik ? 1 : 0.35 }} />

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              {/* Brand */}
              <div className="text-[9.5px] font-semibold uppercase tracking-[0.12em] mb-1"
                style={{ color: restaurant.brand === 'BURGER_KING' ? 'rgba(46,144,250,0.6)' : 'rgba(247,144,9,0.6)' }}>
                {restaurant.brand === 'BURGER_KING' ? 'Burger King' : 'Popeyes'}
              </div>
              {/* Name */}
              <div className="text-[14px] font-semibold leading-tight truncate group-hover:text-white transition-colors"
                style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}>
                {restaurant.name.replace('Burger King ', '').replace('Popeyes ', '')}
              </div>
              {/* District */}
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>
                {restaurant.district}
              </div>
            </div>
            {/* Score arc */}
            <div className="shrink-0 -mt-1">
              <ScoreArc score={pulse.score} color={m.color} />
            </div>
          </div>

          {/* Risk badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ background: m.bg, border: `1px solid ${m.border}` }}>
              {isKritik && (
                <div className="relative w-1.5 h-1.5 shrink-0">
                  <div className="absolute inset-0 rounded-full" style={{ background: m.color, animation: 'pulse-ring 1.6s ease-out infinite', opacity: 0.5 }} />
                  <div className="relative w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
                </div>
              )}
              <span className="text-[10px] font-semibold" style={{ color: m.color }}>{m.label}</span>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-3 divide-x mb-4" style={{ borderColor: 'var(--line)' }}>
            {[
              { v: pulse.open_orders, label: 'Sipariş', alert: pulse.open_orders > 25 },
              { v: (pulse.avg_prep_time ?? 0).toFixed(1), label: 'Hazır dk', alert: (pulse.avg_prep_time ?? 0) > 10 },
              { v: (pulse.courier_wait ?? 0).toFixed(1), label: 'Kurye dk', alert: (pulse.courier_wait ?? 0) > 7 },
            ].map(({ v, label, alert }) => (
              <div key={label} className="px-3 first:pl-0 last:pr-0 text-center">
                <div className="text-[18px] font-bold num leading-none mb-0.5"
                  style={{ color: alert ? '#f04438' : 'var(--t1)', letterSpacing: '-0.04em' }}>
                  {v}
                </div>
                <div className="text-[9px] uppercase tracking-[0.1em]" style={{ color: 'var(--t4)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Station bars */}
          <div className="space-y-1.5 mb-3">
            <StationBar label="Grill"   pct={stations.grill   ?? 0} color="#f79009" />
            <StationBar label="Fryer"   pct={stations.fryer   ?? 0} color="#eaaa08" />
            <StationBar label="Packing" pct={stations.packing ?? 0} color="#2e90fa" />
            <StationBar label="Kurye"   pct={stations.courier ?? 0} color="#17b26a" />
          </div>

          {/* Signals */}
          {pulse.top_signals?.length > 0 && (
            <div className="pt-3" style={{ borderTop: '1px solid var(--line)' }}>
              {pulse.top_signals.slice(0, 2).map((s, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10.5px] leading-snug mt-1 first:mt-0">
                  <span className="shrink-0 mt-px" style={{ color: m.color }}>·</span>
                  <span style={{ color: 'var(--t3)' }}>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
            {(snapshot?.tiklagelsin_delivery_orders ?? 0) > 0 && (
              <span className="text-[10px] num" style={{ color: 'var(--t3)' }}>
                🛵 {snapshot.tiklagelsin_delivery_orders}
              </span>
            )}
            {(snapshot?.restaurant_orders ?? 0) > 0 && (
              <span className="text-[10px] num" style={{ color: 'var(--t3)' }}>
                🏪 {snapshot.restaurant_orders}
              </span>
            )}
            <span className="ml-auto text-[10px]" style={{ color: 'var(--t4)' }}>{restaurant.region}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
