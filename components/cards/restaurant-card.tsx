'use client'
import Link from 'next/link'
import { RestaurantDashboard } from '@/types'
import { ArrowUpRight } from 'lucide-react'

function riskMeta(level: string) {
  switch (level) {
    case 'KRITIK': return { color: 'var(--red)',   bg: 'var(--red2)',   border: 'rgba(242,87,87,.2)',   label: 'Kritik', badgeClass: 'badge-red' }
    case 'RISKLI': return { color: 'var(--amber)', bg: 'var(--amber2)', border: 'rgba(240,168,67,.2)',  label: 'Riskli', badgeClass: 'badge-amber' }
    case 'YOGUN':  return { color: 'var(--amber)', bg: 'var(--amber2)', border: 'rgba(240,168,67,.2)',  label: 'Yoğun',  badgeClass: 'badge-amber' }
    default:       return { color: 'var(--green)', bg: 'var(--green2)', border: 'rgba(34,211,160,.18)', label: 'Normal', badgeClass: 'badge-green' }
  }
}

function Arc({ score, color }: { score: number; color: string }) {
  const r = 26, cx = 34, cy = 34, sw = 4.5
  const circ = 2 * Math.PI * r, arc = circ * 0.75
  const off = arc - (arc * Math.min(score, 100)) / 100
  const id = `arc-${score}-${color.replace(/[^a-z0-9]/gi,'')}`
  return (
    <svg width={68} height={56} viewBox="0 0 68 68" style={{ overflow: 'visible' }}>
      <defs>
        <filter id={id + 'g'}>
          <feGaussianBlur stdDeviation="2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--s4)" strokeWidth={sw}
        strokeDasharray={`${arc} ${circ}`} strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${arc} ${circ}`} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`} filter={`url(#${id}g)`}
        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)' }} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        style={{ fill: color, fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', letterSpacing: '-0.03em' }}>
        {score}
      </text>
    </svg>
  )
}

export function RestaurantCard({ data }: { data: RestaurantDashboard }) {
  const { restaurant, pulse, snapshot } = data
  const m = riskMeta(pulse.risk_level)
  const isKritik = pulse.risk_level === 'KRITIK'
  const stations = (pulse.station_scores as unknown) as Record<string, number> ?? {}

  return (
    <Link href={`/restaurants/${restaurant.id}`}>
      <div className="card anim-pop" style={{
        borderLeft: `3px solid ${m.color}`,
        cursor: 'pointer',
        transition: 'border-color .15s, transform .15s, box-shadow .15s',
        position: 'relative',
        overflow: 'hidden',
      }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.transform = 'translateY(-2px)'
          el.style.boxShadow = `0 8px 28px rgba(0,0,0,.3), 0 0 0 1px var(--bdr2)`
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.transform = ''
          el.style.boxShadow = ''
        }}
      >
        {/* Kritik radial glow */}
        {isKritik && (
          <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, background: 'radial-gradient(circle at top right,rgba(242,87,87,.08),transparent 70%)', pointerEvents: 'none' }} />
        )}

        {/* Kritik pulse indicator */}
        {isKritik && (
          <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 2 }}>
            <div style={{ position: 'relative', width: 8, height: 8 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--red)', animation: 'pulse 1.6s ease-in-out infinite', opacity: .5 }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 8px var(--red)' }} />
            </div>
          </div>
        )}

        <div style={{ padding: '18px 20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: restaurant.brand === 'BURGER_KING' ? 'var(--blue)' : 'var(--amber)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 } as React.CSSProperties}>
                {restaurant.brand === 'BURGER_KING' ? 'Burger King' : 'Popeyes'}
              </p>
              <p style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-.25px', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {restaurant.name.replace('Burger King ', '').replace('Popeyes ', '')}
              </p>
              <p style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 3 }}>{restaurant.district} · {restaurant.region}</p>
            </div>
            <Arc score={pulse.score} color={m.color} />
          </div>

          {/* Risk badge */}
          <div style={{ marginBottom: 16 }}>
            <span className={`badge ${m.badgeClass}`}>
              {isKritik && '⚠ '}{m.label}
            </span>
          </div>

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, marginBottom: 16, background: 'var(--bdr)', borderRadius: 10, overflow: 'hidden' }}>
            {[
              { v: pulse.open_orders,                      u: '',   label: 'Açık Sipariş', alert: pulse.open_orders > 25 },
              { v: (pulse.avg_prep_time ?? 0).toFixed(1),  u: 'dk', label: 'Hazırlama',   alert: (pulse.avg_prep_time ?? 0) > 10 },
              { v: (pulse.courier_wait ?? 0).toFixed(1),   u: 'dk', label: 'Kurye Bkl',   alert: (pulse.courier_wait ?? 0) > 7 },
            ].map(({ v, u, label, alert }) => (
              <div key={label} style={{ background: 'var(--s2)', padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', letterSpacing: '-.04em', lineHeight: 1.1, color: alert ? 'var(--red)' : 'var(--tx)' }}>
                  {v}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--tx3)', marginLeft: 1 }}>{u}</span>
                </div>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Station bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
            {[
              { label: 'Grill',   val: stations.grill   ?? 0, color: 'var(--amber)' },
              { label: 'Fryer',   val: stations.fryer   ?? 0, color: '#f0c040' },
              { label: 'Packing', val: stations.packing ?? 0, color: 'var(--ac)' },
              { label: 'Kurye',   val: stations.courier ?? 0, color: 'var(--green)' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 44, fontSize: 11, color: 'var(--tx3)', flexShrink: 0 }}>{label}</span>
                <div className="prog" style={{ flex: 1 }}>
                  <div className="prog-fill" style={{ width: `${val}%`, background: val >= 80 ? 'var(--red)' : color }} />
                </div>
                <span style={{ width: 24, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', color: val >= 80 ? 'var(--red)' : 'var(--tx3)', textAlign: 'right', flexShrink: 0 }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Signals */}
          {pulse.top_signals?.length > 0 && (
            <div style={{ borderTop: '1px solid var(--bdr)', paddingTop: 12, marginBottom: 12 }}>
              {pulse.top_signals.slice(0, 2).map((s, i) => (
                <p key={i} style={{ fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: i < 1 ? 4 : 0 }}>
                  <span style={{ color: m.color, flexShrink: 0, marginTop: 1 }}>›</span>{s}
                </p>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: '1px solid var(--bdr)', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(snapshot?.tiklagelsin_delivery_orders ?? 0) > 0 && (
                <span style={{ fontSize: 11, color: 'var(--tx3)' }}>🛵 {snapshot.tiklagelsin_delivery_orders}</span>
              )}
              {(snapshot?.restaurant_orders ?? 0) > 0 && (
                <span style={{ fontSize: 11, color: 'var(--tx3)' }}>🏪 {snapshot.restaurant_orders}</span>
              )}
            </div>
            <span style={{ fontSize: 11, color: 'var(--tx3)', display: 'flex', alignItems: 'center', gap: 3 }}>
              Detay <ArrowUpRight size={11} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
