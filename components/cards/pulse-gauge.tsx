'use client'
import { RiskLevel } from '@/types'
import { getRiskConfig } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface PulseGaugeProps {
  score: number
  riskLevel: RiskLevel
  size?: 'sm' | 'md' | 'lg'
}

export function PulseGauge({ score, riskLevel, size = 'md' }: PulseGaugeProps) {
  const config = getRiskConfig(riskLevel)
  const sizes = { sm: { w: 80, stroke: 8, r: 32, text: 'text-xl', sub: 'text-[9px]' }, md: { w: 120, stroke: 10, r: 48, text: 'text-3xl', sub: 'text-[10px]' }, lg: { w: 160, stroke: 12, r: 64, text: 'text-5xl', sub: 'text-xs' } }
  const s = sizes[size]
  const cx = s.w / 2
  const circumference = 2 * Math.PI * s.r
  const arc = circumference * 0.75
  const offset = arc - (arc * score) / 100
  const colorMap: Record<RiskLevel, string> = { NORMAL: '#34d399', YOGUN: '#fbbf24', RISKLI: '#fb923c', KRITIK: '#f87171' }
  const color = colorMap[riskLevel]

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: s.w, height: s.w * 0.75 + 10 }}>
        <svg width={s.w} height={s.w * 0.75 + 10} viewBox={`0 0 ${s.w} ${s.w * 0.75 + 10}`}>
          {/* Track */}
          <circle cx={cx} cy={cx} r={s.r} fill="none" stroke="rgba(255,255,255,0.06)"
            strokeWidth={s.stroke} strokeDasharray={`${arc} ${circumference}`}
            strokeDashoffset={0} strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cx})`} />
          {/* Value */}
          <circle cx={cx} cy={cx} r={s.r} fill="none" stroke={color}
            strokeWidth={s.stroke} strokeDasharray={`${arc} ${circumference}`}
            strokeDashoffset={offset} strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cx})`}
            style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 6px ${color}80)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '-8px' }}>
          <span className={cn(s.text, 'font-bold tabular-nums leading-none', config.color)}>{score}</span>
          <span className={cn(s.sub, 'text-white/30 uppercase tracking-wider mt-0.5')}>/ 100</span>
        </div>
      </div>
      <div className={cn('mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide', config.badge)}>
        {config.label}
      </div>
    </div>
  )
}
