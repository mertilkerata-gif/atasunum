'use client'
import Link from 'next/link'
import { cn, getRiskConfig } from '@/lib/utils'
import { RestaurantDashboard } from '@/types'
import { PulseGauge } from './pulse-gauge'
import { TrendingUp, TrendingDown, Clock, Package, Bike } from 'lucide-react'

interface RestaurantCardProps { data: RestaurantDashboard }

export function RestaurantCard({ data }: RestaurantCardProps) {
  const { restaurant, pulse, snapshot, weather } = data
  const config = getRiskConfig(pulse.risk_level)
  const isKritik = pulse.risk_level === 'KRITIK'
  const isRiskli = pulse.risk_level === 'RISKLI'
  const hot = isKritik || isRiskli

  const borderColor = isKritik
    ? 'rgba(255,44,44,0.28)'
    : isRiskli
    ? 'rgba(255,122,0,0.22)'
    : 'rgba(120,120,255,0.08)'

  const bgGlow = isKritik
    ? 'rgba(255,44,44,0.04)'
    : isRiskli
    ? 'rgba(255,122,0,0.03)'
    : 'transparent'

  const stations = [
    { label: 'Grill', score: pulse.station_scores?.grill ?? 0, color: '#ff7a00' },
    { label: 'Fryer', score: pulse.station_scores?.fryer ?? 0, color: '#f0b429' },
    { label: 'Packing', score: pulse.station_scores?.packing ?? 0, color: '#4f8ef7' },
    { label: 'Kurye', score: pulse.station_scores?.courier ?? 0, color: '#00d084' },
  ]

  return (
    <Link href={`/restaurants/${restaurant.id}`}>
      <div className="relative rounded-[16px] overflow-hidden cursor-pointer transition-all duration-200 group"
        style={{
          background: `linear-gradient(145deg, var(--bg-card) 0%, var(--bg-elevated) 100%)`,
          border: `1px solid ${borderColor}`,
          boxShadow: hot ? `0 0 28px ${bgGlow}, 0 2px 8px rgba(0,0,0,0.4)` : '0 2px 8px rgba(0,0,0,0.3)',
        }}>

        {/* Top gradient line */}
        <div className="absolute top-0 left-0 right-0 h-[1px]"
          style={{ background: `linear-gradient(90deg, transparent 0%, ${config.colorHex}55 50%, transparent 100%)` }} />

        {/* Kritik scan effect */}
        {isKritik && <div className="absolute inset-0 scan-container pointer-events-none opacity-30" />}

        {/* Kritik pulse indicator */}
        {isKritik && (
          <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5">
            <div className="relative w-2 h-2">
              <div className="absolute inset-0 rounded-full bg-red-500 pulse-ring" />
              <div className="w-2 h-2 rounded-full bg-red-500" style={{ boxShadow: '0 0 8px #ff2222cc' }} />
            </div>
          </div>
        )}

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            {/* Brand icon */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
              {restaurant.brand === 'BURGER_KING' ? '🍔' : '🍗'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-0.5"
                style={{ color: 'rgba(180,180,255,0.35)' }}>
                {restaurant.brand.replace('_', ' ')}
              </div>
              <div className="text-[13px] font-semibold truncate text-white/90 group-hover:text-white transition-colors leading-tight">
                {restaurant.name}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px]" style={{ color: 'rgba(180,180,255,0.35)' }}>{restaurant.district}</span>
                <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
                <span className="text-[10px]" style={{ color: 'rgba(180,180,255,0.35)' }}>{weather.icon} {weather.temperature}°</span>
              </div>
            </div>

            {/* Gauge */}
            <PulseGauge score={pulse.score} riskLevel={pulse.risk_level} size="sm" showLabel={false} />
          </div>

          {/* Risk badge */}
          <div className="mb-4">
            <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider', config.badge)}>
              {pulse.risk_level === 'KRITIK' && '⚠ '}
              {config.label}
            </span>
          </div>

          {/* KPI 3-col */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { icon: Package, label: 'Açık Sipariş', value: pulse.open_orders, unit: '', alert: pulse.open_orders > 25 },
              { icon: Clock, label: 'Hazırlama', value: (pulse.avg_prep_time ?? 0).toFixed(1), unit: 'dk', alert: (pulse.avg_prep_time ?? 0) > 10 },
              { icon: Bike, label: 'Kurye Bkl', value: (pulse.courier_wait ?? 0).toFixed(1), unit: 'dk', alert: (pulse.courier_wait ?? 0) > 7 },
            ].map(({ icon: Icon, label, value, unit, alert }) => (
              <div key={label}
                className="rounded-xl p-2.5 text-center"
                style={{
                  background: alert ? 'rgba(255,44,44,0.07)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${alert ? 'rgba(255,44,44,0.18)' : 'rgba(120,120,255,0.07)'}`,
                }}>
                <div className="text-[16px] font-bold font-mono leading-none mb-1"
                  style={{ color: alert ? '#ff4444' : 'rgba(230,230,255,0.9)' }}>
                  {value}
                  {unit && <span className="text-[9px] font-normal ml-0.5" style={{ color: 'rgba(180,180,255,0.35)' }}>{unit}</span>}
                </div>
                <div className="text-[8px] uppercase tracking-wider" style={{ color: 'rgba(160,160,220,0.4)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Station load bars */}
          <div className="space-y-2 mb-3">
            {stations.map(({ label, score, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] w-[52px] shrink-0" style={{ color: 'rgba(160,160,220,0.4)' }}>{label}</span>
                <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full score-bar-fill"
                    style={{
                      width: `${score}%`,
                      background: score >= 80
                        ? `linear-gradient(90deg, ${color}, #ff4444)`
                        : score >= 60
                        ? `linear-gradient(90deg, ${color}99, ${color})`
                        : `${color}66`,
                    }} />
                </div>
                <span className="text-[10px] font-mono w-6 text-right"
                  style={{ color: score >= 80 ? '#ff4444' : score >= 60 ? color : 'rgba(160,160,220,0.35)' }}>
                  {score}
                </span>
              </div>
            ))}
          </div>

          {/* Signals */}
          {pulse.top_signals && pulse.top_signals.length > 0 && (
            <div className="pt-3 border-t" style={{ borderColor: 'rgba(120,120,255,0.07)' }}>
              {pulse.top_signals.slice(0, 2).map((s, i) => (
                <div key={i} className={cn('flex items-start gap-1.5 text-[10px] leading-snug', i > 0 && 'mt-1')}
                  style={{ color: config.colorHex + 'cc' }}>
                  <span className="mt-0.5 shrink-0 opacity-50">›</span>
                  <span className="opacity-75">{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Bottom row: channels + region */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {snapshot.tiklagelsin_delivery_orders > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-md font-medium"
                style={{ background: 'rgba(255,122,0,0.1)', color: '#ff7a00', border: '1px solid rgba(255,122,0,0.18)' }}>
                🛵 {snapshot.tiklagelsin_delivery_orders}
              </span>
            )}
            {snapshot.tiklagelsin_pickup_orders > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-md font-medium"
                style={{ background: 'rgba(79,142,247,0.1)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.18)' }}>
                🏪 {snapshot.tiklagelsin_pickup_orders}
              </span>
            )}
            <span className="ml-auto text-[9px] uppercase tracking-wider" style={{ color: 'rgba(160,160,220,0.3)' }}>
              {restaurant.region}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
