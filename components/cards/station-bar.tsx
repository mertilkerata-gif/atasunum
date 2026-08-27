import { cn, getStationBg, getStationColor } from '@/lib/utils'

interface StationBarProps {
  label: string
  score: number
  icon?: string
}

export function StationBar({ label, score, icon }: StationBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-xs text-white/50 shrink-0">{icon} {label}</div>
      <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', getStationBg(score))}
          style={{ width: `${score}%`, boxShadow: score >= 80 ? '0 0 8px rgba(248,113,113,0.6)' : undefined }}
        />
      </div>
      <span className={cn('text-xs font-bold tabular-nums w-8 text-right', getStationColor(score))}>{score}</span>
    </div>
  )
}
