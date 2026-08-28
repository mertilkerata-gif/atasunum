'use client'
import Link from 'next/link'
import { cn, getRiskConfig } from '@/lib/utils'
import { RestaurantDashboard } from '@/types'
import { PulseGauge } from './pulse-gauge'
import { StationBar } from './station-bar'

interface RestaurantCardProps {
  data: RestaurantDashboard
}

export function RestaurantCard({ data }: RestaurantCardProps) {
  const { restaurant, pulse, snapshot, weather } = data
  const config = getRiskConfig(pulse.risk_level)
  const isHot = pulse.risk_level === 'KRITIK' || pulse.risk_level === 'RISKLI'

  return (
    <Link href={`/restaurants/${restaurant.id}`}>
      <div className={cn(
        'relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 card-hover group',
        config.border, config.bg, isHot && config.glow,
      )}>
        {/* Top accent gradient */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${config.colorHex}60, transparent)` }} />

        {/* Scan line on kritik */}
        {pulse.risk_level === 'KRITIK' && (
          <div className="absolute inset-0 scan-container pointer-events-none opacity-40" />
        )}

        {/* Kritik pulse dot */}
        {pulse.risk_level === 'KRITIK' && (
          <div className="absolute top-4 right-4 z-10">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-red-500" style={{ boxShadow: '0 0 8px rgba(255,61,61,0.8)' }} />
              <div className="absolute inset-0 rounded-full bg-red-500 pulse-ring" />
            </div>
          </div>
        )}

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs">{restaurant.brand === 'BURGER_KING' ? '🍔' : '🍗'}</span>
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
                  {restaurant.brand.replace('_', ' ')}
                </span>
              </div>
              <div className="text-sm font-semibold text-white truncate group-hover:text-white/90 transition-colors">
                {restaurant.name}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-white/30">{restaurant.district}</span>
                <span className="text-white/15">·</span>
                <span className="text-[11px] text-white/30">{weather.icon} {weather.temperature}°C</span>
                {weather.rain_intensity > 5 && (
                  <span className="text-[10px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded-full border border-blue-500/20">Yağmurlu</span>
                )}
              </div>
            </div>
            <PulseGauge score={pulse.score} riskLevel={pulse.risk_level} size="sm" />
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { label: 'Açık', value: pulse.open_orders, alert: pulse.open_orders > 25 },
              { label: 'Hazırlama', value: `${pulse.avg_prep_time.toFixed(1)}`, unit: 'dk', alert: pulse.avg_prep_time > 10 },
              { label: 'Kurye', value: `${pulse.courier_wait.toFixed(1)}`, unit: 'dk', alert: pulse.courier_wait > 7 },
            ].map(({ label, value, unit, alert }) => (
              <div key={label} className={cn(
                'rounded-xl p-2.5 text-center border',
                alert ? 'bg-red-500/[0.08] border-red-500/20' : 'bg-white/[0.04] border-white/[0.06]'
              )}>
                <div className={cn('text-lg font-bold tabular-nums font-mono leading-none', alert ? 'text-red-400' : 'text-white')}
                  style={alert ? { textShadow: '0 0 12px rgba(255,61,61,0.35)' } : undefined}>
                  {value}
                  {unit && <span className="text-xs font-normal text-white/30 ml-0.5">{unit}</span>}
                </div>
                <div className="text-[9px] text-white/30 uppercase tracking-wider mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Station bars */}
          <div className="space-y-2">
            <StationBar label="Grill"   score={pulse.station_scores.grill}   icon="🔥" />
            <StationBar label="Fryer"   score={pulse.station_scores.fryer}   icon="🍟" />
            <StationBar label="Packing" score={pulse.station_scores.packing} icon="📦" />
            <StationBar label="Kurye"   score={pulse.station_scores.courier} icon="🛵" />
          </div>

          {/* Signals */}
          {pulse.top_signals.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/[0.05]">
              {pulse.top_signals.slice(0, 2).map((s, i) => (
                <div key={i} className={cn('flex items-start gap-1.5 text-[11px] leading-snug', i > 0 && 'mt-1.5', config.color)}>
                  <span className="mt-0.5 shrink-0 opacity-60">◆</span>
                  <span className="opacity-80">{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Channel pills */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {snapshot.tiklagelsin_delivery_orders > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/15 font-medium">
                🛵 {snapshot.tiklagelsin_delivery_orders}
              </span>
            )}
            {snapshot.tiklagelsin_pickup_orders > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/15 font-medium">
                🏪 {snapshot.tiklagelsin_pickup_orders}
              </span>
            )}
            {snapshot.restaurant_orders > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/15 font-medium">
                🍽 {snapshot.restaurant_orders}
              </span>
            )}
            <span className="ml-auto text-[9px] text-white/20 uppercase tracking-wider">{restaurant.region}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
