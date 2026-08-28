import { cn, getStationConfig } from '@/lib/utils'

interface StationBarProps {
  label: string
  score: number
  icon?: string
  showValue?: boolean
}

export function StationBar({ label, score, icon, showValue = true }: StationBarProps) {
  const s = getStationConfig(score)
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-[72px] flex items-center gap-1.5 shrink-0">
        {icon && <span className="text-xs">{icon}</span>}
        <span className="text-[11px] text-white/40 font-medium">{label}</span>
      </div>
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden relative">
        {/* Base bar */}
        <div
          className={cn('h-full rounded-full score-bar-fill relative', s.bg)}
          style={{
            width: `${score}%`,
            boxShadow: score >= 60 ? `0 0 8px ${s.hex}60` : 'none',
          }}
        >
          {/* Shimmer on high load */}
          {score >= 80 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              style={{ animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }} />
          )}
        </div>
      </div>
      {showValue && (
        <span className={cn('text-xs font-bold tabular-nums font-mono w-7 text-right', s.color)}>
          {score}
        </span>
      )}
    </div>
  )
}
