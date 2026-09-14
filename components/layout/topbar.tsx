'use client'
import { useEffect, useState, ReactNode } from 'react'
import { Bell } from 'lucide-react'

export function Topbar({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: ReactNode
}) {
  const [time, setTime] = useState('')
  useEffect(() => {
    const u = () => setTime(new Date().toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit' }))
    u(); const t = setInterval(u,1000); return () => clearInterval(t)
  }, [])

  return (
    <div className="topbar">
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.15px', flexShrink: 0 }}>{title}</span>
        {subtitle && <span style={{ fontSize: 12, color: 'var(--tx3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {action}
        <span style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono, monospace', color: 'var(--tx3)' }}>{time}</span>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'pulse 2.5s ease-in-out infinite' }} />
      </div>
    </div>
  )
}
