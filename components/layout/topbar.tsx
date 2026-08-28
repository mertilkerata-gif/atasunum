'use client'
import { useEffect, useState } from 'react'
import { Bell, RefreshCw, Search } from 'lucide-react'

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
      setDate(now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }))
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex items-center h-14 px-6 border-b"
      style={{
        background: 'linear-gradient(180deg, rgba(7,7,14,0.98) 0%, rgba(7,7,14,0.92) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(255,255,255,0.05)',
      }}>

      {/* Left: Title */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold text-white tracking-tight">{title}</h1>
          </div>
          {subtitle && <p className="text-[11px] text-white/30 mt-0.5 leading-none">{subtitle}</p>}
        </div>
      </div>

      {/* Actions slot */}
      {actions && <div className="flex items-center gap-2 mr-4">{actions}</div>}

      {/* Right: clock + controls */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden lg:flex items-center gap-1 text-[11px] text-white/25 font-mono">
          <span>{date}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-[12px] font-medium"
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderColor: 'rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.05em',
          }}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
          {time}
        </div>

        <button className="p-2 rounded-lg border transition-colors hover:bg-white/[0.06]"
          style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)' }}>
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <button className="relative p-2 rounded-lg border transition-colors hover:bg-white/[0.06]"
          style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)' }}>
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"
            style={{ boxShadow: '0 0 6px rgba(255,61,61,0.8)' }} />
        </button>
      </div>
    </header>
  )
}
