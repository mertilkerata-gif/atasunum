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
    const upd = () => setTime(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    upd(); const t = setInterval(upd, 1000); return () => clearInterval(t)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 h-[52px] px-6"
      style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-[13.5px] font-semibold truncate" style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}>{title}</h1>
          {subtitle && <span className="text-[11px] hidden md:block truncate" style={{ color: 'var(--t3)' }}>— {subtitle}</span>}
        </div>
      </div>
      {actions}
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] num hidden md:block" style={{ color: 'var(--t4)' }}>{time}</span>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)', boxShadow: '0 0 5px var(--green)' }} />
      </div>
    </header>
  )
}
