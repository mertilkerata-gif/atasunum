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

  return (
    <Link href={`/restaurants/${restaurant.id}`}>
      <div className={cn(
        'rounded-xl border p-5 hover:border-white/20 transition-all cursor-pointer group',
        config.border, config.bg
      )}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-white/40 mb-0.5">{restaurant.brand === 'BURGER_KING' ? '🍔' : '🍗'} {restaurant.brand.replace('_', ' ')}</div>
            <div className="text-sm font-semibold text-white group-hover:text-white/90">{restaurant.name}</div>
            <div className="text-xs text-white/35 mt-0.5">{restaurant.district} · {weather.icon} {weather.temperature}°C</div>
          </div>
          <PulseGauge score={pulse.score} riskLevel={pulse.risk_level} size="sm" />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Açık Sipariş', value: pulse.open_orders },
            { label: 'Hazırlama', value: `${pulse.avg_prep_time.toFixed(1)}dk` },
            { label: 'Kurye Bekl.', value: `${pulse.courier_wait.toFixed(1)}dk` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/[0.04] rounded-md p-2 text-center">
              <div className="text-lg font-bold text-white tabular-nums">{value}</div>
              <div className="text-[10px] text-white/35 uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>

        {/* Stations */}
        <div className="space-y-1.5">
          <StationBar label="Grill" score={pulse.station_scores.grill} icon="🔥" />
          <StationBar label="Fryer" score={pulse.station_scores.fryer} icon="🍟" />
          <StationBar label="Packing" score={pulse.station_scores.packing} icon="📦" />
          <StationBar label="Kurye" score={pulse.station_scores.courier} icon="🛵" />
        </div>

        {/* Signals */}
        {pulse.top_signals.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <div className="text-[10px] text-white/30 uppercase tracking-wide mb-1">Aktif Sinyaller</div>
            {pulse.top_signals.slice(0, 2).map((s, i) => (
              <div key={i} className={cn('text-[11px] mt-0.5', config.color)}>· {s}</div>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
