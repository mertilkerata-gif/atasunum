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
    <header
      className="sticky top-0 z-30 flex items-center h-[50px] gap-4"
      style={{
        paddingLeft: '24px',
        paddingRight: '24px',
        background: 'rgba(8,8,8,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-hair)',
      }}
    >
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-[13px] font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-[10px] truncate mt-px" style={{ color: 'var(--text-ghost)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}

      <div className="hidden md:flex items-center gap-3 shrink-0">
        <span
          className="text-[10px] num tabular-nums"
          style={{ color: 'var(--text-ghost)', fontVariantNumeric: 'tabular-nums' }}
        >
          {time}
        </span>
        <div className="flex items-center gap-1.5 rounded-full px-2 py-1"
          style={{
            background: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.15)',
          }}>
          <div className="w-1 h-1 rounded-full bg-emerald-400 pulse-dot"
            style={{ boxShadow: '0 0 4px rgba(52,211,153,0.9)' }} />
          <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color: 'rgba(34,197,94,0.7)' }}>
            Canlı
          </span>
        </div>
      </div>
    </header>
  )
}
