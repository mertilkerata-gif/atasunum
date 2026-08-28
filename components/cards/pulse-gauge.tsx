'use client'
import { RiskLevel } from '@/types'
import { getRiskConfig } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface PulseGaugeProps {
  score: number
  riskLevel: RiskLevel
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function PulseGauge({ score, riskLevel, size = 'md', showLabel = true }: PulseGaugeProps) {
  const config = getRiskConfig(riskLevel)
  const sizes = {
    xs: { w: 56,  stroke: 5,  r: 22, text: 'text-sm',  sub: 'text-[7px]' },
    sm: { w: 76,  stroke: 7,  r: 30, text: 'text-lg',  sub: 'text-[8px]' },
    md: { w: 120, stroke: 9,  r: 48, text: 'text-3xl', sub: 'text-[10px]' },
    lg: { w: 160, stroke: 11, r: 64, text: 'text-5xl', sub: 'text-xs' },
  }
  const s = sizes[size]
  const cx = s.w / 2
  const circumference = 2 * Math.PI * s.r
  const arc = circumference * 0.75
  const offset = arc - (arc * Math.min(score, 100)) / 100

  // Tick marks
  const ticks = [0, 40, 60, 80, 100]
  const tickElements = ticks.map(pct => {
    const angle = (135 + (pct / 100) * 270) * (Math.PI / 180)
    const inner = s.r - s.stroke / 2 - 3
    const outer = s.r + s.stroke / 2 + 1
    return {
      x1: cx + inner * Math.cos(angle),
      y1: cx + inner * Math.sin(angle),
      x2: cx + outer * Math.cos(angle),
      y2: cx + outer * Math.sin(angle),
      color: pct === 0 ? '#333' : pct <= score ? config.colorHex : '#333',
    }
  })

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: s.w, height: s.w * 0.78 + 10 }}>
        <svg width={s.w} height={s.w * 0.78 + 10} viewBox={`0 0 ${s.w} ${s.w * 0.78 + 10}`}>
          <defs>
            <filter id={`glow-${score}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id={`arc-gradient-${score}`} gradientUnits="userSpaceOnUse"
              x1={cx - s.r} y1={cx} x2={cx + s.r} y2={cx}>
              <stop offset="0%" stopColor={config.colorHex} stopOpacity="0.6" />
              <stop offset="100%" stopColor={config.colorHex} stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <circle cx={cx} cy={cx} r={s.r} fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth={s.stroke}
            strokeDasharray={`${arc} ${circumference}`}
            strokeDashoffset={0} strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cx})`} />

          {/* Colored arc */}
          <circle cx={cx} cy={cx} r={s.r} fill="none"
            stroke={`url(#arc-gradient-${score})`}
            strokeWidth={s.stroke}
            strokeDasharray={`${arc} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cx})`}
            filter={`url(#glow-${score})`}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />

          {/* Tick marks */}
          {tickElements.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={t.color} strokeWidth={1} strokeLinecap="round" />
          ))}

          {/* End dot */}
          {score > 0 && score < 100 && (() => {
            const endAngle = (135 + (score / 100) * 270) * (Math.PI / 180)
            return (
              <circle
                cx={cx + s.r * Math.cos(endAngle)}
                cy={cx + s.r * Math.sin(endAngle)}
                r={s.stroke / 2 + 1}
                fill={config.colorHex}
                filter={`url(#glow-${score})`} />
            )
          })()}
        </svg>

        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: '8px' }}>
          <span className={cn(s.text, 'font-bold tabular-nums leading-none font-mono', config.color)}
            style={{ textShadow: `0 0 20px ${config.colorHex}40` }}>
            {score}
          </span>
          <span className={cn(s.sub, 'text-white/20 tracking-widest mt-0.5 uppercase')}>/ 100</span>
        </div>
      </div>

      {showLabel && (
        <div className={cn('mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', config.badge)}>
          {config.label}
        </div>
      )}
    </div>
  )
}
