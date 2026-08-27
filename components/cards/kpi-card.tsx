import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  label: string
  value: string
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  alert?: boolean
  icon?: React.ReactNode
}

export function KPICard({ label, value, unit, trend, trendValue, alert, icon }: KPICardProps) {
  return (
    <div className={cn(
      'rounded-lg border p-4 flex flex-col gap-3',
      alert
        ? 'border-red-500/30 bg-red-500/[0.06]'
        : 'border-white/[0.08] bg-white/[0.04]'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40 uppercase tracking-wide font-medium">{label}</span>
        {icon && <span className="text-white/30">{icon}</span>}
      </div>
      <div className="flex items-end gap-1.5">
        <span className={cn('text-2xl font-bold tabular-nums leading-none', alert ? 'text-red-400' : 'text-white')}>
          {value}
        </span>
        {unit && <span className="text-xs text-white/40 mb-0.5">{unit}</span>}
      </div>
      {trend && trendValue && (
        <div className={cn('flex items-center gap-1 text-xs', trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-emerald-400' : 'text-white/40')}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {trendValue}
        </div>
      )}
    </div>
  )
}
