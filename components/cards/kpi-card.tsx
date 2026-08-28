import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  alert?: boolean
  icon?: React.ReactNode
  size?: 'sm' | 'md'
  subValue?: string
}

export function KPICard({ label, value, unit, trend, trendValue, alert, icon, size = 'md', subValue }: KPICardProps) {
  return (
    <div className={cn(
      'relative rounded-xl border p-4 overflow-hidden transition-all duration-200',
      alert
        ? 'border-red-500/25 bg-red-500/[0.06]'
        : 'border-white/[0.08] bg-white/[0.04]',
      'hover:border-white/[0.12]'
    )}>
      {/* Accent line top */}
      {alert && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />}

      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] text-white/35 uppercase tracking-widest font-medium">{label}</span>
        {icon && <span className={cn('opacity-40', alert && 'text-red-400 opacity-70')}>{icon}</span>}
      </div>

      <div className="flex items-end gap-1.5 mb-2">
        <span className={cn(
          'font-bold tabular-nums font-mono leading-none',
          size === 'md' ? 'text-2xl' : 'text-xl',
          alert ? 'text-red-400' : 'text-white',
        )}
          style={alert ? { textShadow: '0 0 16px rgba(255,61,61,0.4)' } : undefined}>
          {value}
        </span>
        {unit && <span className="text-xs text-white/30 mb-0.5">{unit}</span>}
      </div>

      {subValue && <div className="text-xs text-white/30 mb-1.5">{subValue}</div>}

      {trend && trendValue && (
        <div className={cn(
          'flex items-center gap-1 text-[11px] font-medium',
          trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-emerald-400' : 'text-white/30'
        )}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {trendValue}
        </div>
      )}
    </div>
  )
}
