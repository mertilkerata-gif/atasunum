'use client'
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDate(now.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }))
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex items-center h-14 gap-3"
      style={{
        paddingLeft: '72px', // hamburger için yer
        paddingRight: '16px',
        background: 'linear-gradient(180deg, rgba(5,5,10,0.98) 0%, rgba(5,5,10,0.90) 100%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>

      {/* Left */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-[14px] font-semibold text-white truncate">{title}</h1>
        </div>
        {subtitle && <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.28)' }}>{subtitle}</p>}
      </div>

      {/* Actions */}
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}

      {/* Clock — desktop only */}
      <div className="hidden md:flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{time}</div>
          <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{date}</div>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 8px rgba(52,211,153,0.8)' }} />
      </div>
    </header>
  )
}
