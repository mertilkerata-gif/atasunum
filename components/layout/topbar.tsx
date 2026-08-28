'use client'
import { useEffect, useState } from 'react'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex items-center h-[52px] gap-3"
      style={{
        paddingLeft: '68px', paddingRight: '20px',
        background: 'rgba(2,2,10,0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(100,100,255,0.07)',
      }}>

      <div className="flex-1 min-w-0">
        <h1 className="text-[14px] font-semibold text-white/90 truncate leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(160,160,220,0.38)' }}>{subtitle}</p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}

      <div className="hidden md:flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-mono tabular-nums" style={{ color: 'rgba(140,140,200,0.45)' }}>{time}</span>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 7px rgba(52,211,153,0.85)' }} />
      </div>
    </header>
  )
}
