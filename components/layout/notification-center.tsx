'use client'
import { useState, useEffect } from 'react'
import { cn, getRiskConfig } from '@/lib/utils'
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react'

export interface Notification {
  id: string
  type: 'kritik' | 'riskli' | 'info' | 'success'
  title: string
  message: string
  timestamp: Date
  restaurantId?: string
}

// Global notification store
let _listeners: ((n: Notification) => void)[] = []
export function addNotification(n: Omit<Notification, 'id' | 'timestamp'>) {
  const notif: Notification = { ...n, id: Date.now().toString(), timestamp: new Date() }
  _listeners.forEach(fn => fn(notif))
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    const fn = (n: Notification) => {
      setNotifications(prev => [n, ...prev].slice(0, 5))
      setTimeout(() => setNotifications(prev => prev.filter(p => p.id !== n.id)), 6000)
    }
    _listeners.push(fn)
    return () => { _listeners = _listeners.filter(l => l !== fn) }
  }, [])

  if (!notifications.length) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm">
      {notifications.map(n => {
        const icon = n.type === 'kritik' ? <AlertTriangle className="w-4 h-4 text-red-400" />
          : n.type === 'riskli' ? <AlertTriangle className="w-4 h-4 text-orange-400" />
          : n.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" />
          : <Info className="w-4 h-4 text-blue-400" />
        const border = n.type === 'kritik' ? 'border-red-500/40 bg-red-500/[0.08]'
          : n.type === 'riskli' ? 'border-orange-500/40 bg-orange-500/[0.08]'
          : n.type === 'success' ? 'border-emerald-500/40 bg-emerald-500/[0.08]'
          : 'border-white/[0.12] bg-white/[0.06]'
        return (
          <div key={n.id} className={cn('flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-sm animate-in slide-in-from-bottom-3', border)}>
            <div className="shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">{n.title}</div>
              <div className="text-xs text-white/60 mt-0.5">{n.message}</div>
            </div>
            <button onClick={() => setNotifications(p => p.filter(x => x.id !== n.id))} className="text-white/30 hover:text-white/60 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
