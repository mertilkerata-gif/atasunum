'use client'
import { Bell, RefreshCw } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface TopbarProps {
  title: string
  subtitle?: string
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const [time, setTime] = useState(new Date().toISOString())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toISOString()), 30000)
    return () => clearInterval(t)
  }, [])
  return (
    <header className="h-14 border-b border-white/[0.06] flex items-center justify-between px-6 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-30">
      <div>
        <h1 className="text-sm font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          <RefreshCw className="w-3 h-3" />
          <span>5 dk&apos;da bir güncelleniyor</span>
        </div>
        <div className="text-xs font-mono text-white/50 bg-white/[0.04] px-3 py-1.5 rounded-md border border-white/[0.06]">
          {formatTime(time)}
        </div>
        <button className="relative p-1.5 text-white/40 hover:text-white/70 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  )
}
