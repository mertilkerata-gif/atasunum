'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Activity, TrendingUp, Store, FileText,
  Lightbulb, Target, FlaskConical, Bot, Settings, Zap, ShoppingBag
} from 'lucide-react'

const nav = [
  { href: '/overview', label: 'Genel Bakış', icon: LayoutDashboard },
  { href: '/live-operations', label: 'Canlı Operasyonlar', icon: Activity },
  { href: '/tiklagelsin', label: 'Tıkla Gelsin Demo', icon: ShoppingBag, highlight: true },
  { href: '/forecast', label: 'Tahmin', icon: TrendingUp },
  { href: '/restaurants', label: 'Restoranlar', icon: Store },
  { href: '/reports', label: 'Raporlar', icon: FileText },
  { href: '/ai-recommendations', label: 'AI Önerileri', icon: Lightbulb },
  { href: '/forecast-accuracy', label: 'Tahmin Doğruluğu', icon: Target },
  { href: '/simulator', label: 'Simülatör', icon: FlaskConical },
  { href: '/ai-analyst', label: 'AI Analist', icon: Bot },
  { href: '/settings', label: 'Ayarlar', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[#0a0a0f] border-r border-white/[0.06] flex flex-col z-40">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-md bg-orange-500 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-white tracking-tight">Mutfak Nabzı</div>
          <div className="text-[10px] text-white/40 uppercase tracking-widest">TAB Gıda</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon, highlight }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all',
              active ? 'bg-orange-500/15 text-orange-400 font-medium'
                : highlight ? 'text-orange-300/70 hover:text-orange-300 hover:bg-orange-500/[0.06]'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
            )}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {highlight && !active && <span className="ml-auto text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-medium uppercase">Demo</span>}
            </Link>
          )
        })}
      </nav>
      <div className="px-5 py-4 border-t border-white/[0.06]">
        <div className="text-[10px] text-white/25 uppercase tracking-widest">Demo v1.0</div>
      </div>
    </aside>
  )
}
