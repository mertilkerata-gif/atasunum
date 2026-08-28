'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Activity, TrendingUp, Store, FileText,
  Lightbulb, Target, FlaskConical, Bot, Settings, ShoppingBag,
  MessageSquare, DollarSign, Package, Users, AlertOctagon, Smartphone
} from 'lucide-react'

const nav = [
  { href: '/overview',          label: 'Genel Bakış',       icon: LayoutDashboard },
  { href: '/live-operations',   label: 'Canlı Operasyon',   icon: Activity },
  { href: '/anomalies',         label: 'Anomali Dedektörü', icon: AlertOctagon, badge: 'YENİ' },
  { href: '/tiklagelsin',       label: 'Tıkla Gelsin',      icon: ShoppingBag },
  { href: '/forecast',          label: 'Tahmin',            icon: TrendingUp },
  { href: '/shifts',            label: 'Vardiya AI',        icon: Users, badge: 'YENİ' },
  { href: '/restaurants',       label: 'Restoranlar',       icon: Store },
  { href: '/products',          label: 'Ürün & Stok',       icon: Package },
  { href: '/complaints',        label: 'Şikayetler',        icon: MessageSquare },
  { href: '/revenue',           label: 'Satış & Ciro',      icon: DollarSign },
  { href: '/reports',           label: 'Raporlar',          icon: FileText },
  { href: '/ai-recommendations',label: 'AI Önerileri',      icon: Lightbulb },
  { href: '/forecast-accuracy', label: 'Tahmin Doğruluğu',  icon: Target },
  { href: '/simulator',         label: 'Simülatör',         icon: FlaskConical },
  { href: '/ai-analyst',        label: 'AI Analist',        icon: Bot },
  { href: '/settings',          label: 'Ayarlar',           icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] flex flex-col z-40 border-r"
      style={{
        background: 'linear-gradient(180deg, #090910 0%, #07070e 100%)',
        borderColor: 'rgba(255,255,255,0.05)',
      }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="relative w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            boxShadow: '0 0 20px rgba(249,115,22,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}>
          {/* Zap icon SVG */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-white tracking-tight leading-tight">Mutfak Nabzı</div>
          <div className="text-[9px] text-white/30 uppercase tracking-[0.15em] mt-0.5">TAB Gıda · v1.0</div>
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="relative flex items-center">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
          <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" style={{ animationDuration: '2s' }} />
        </div>
        <span className="text-[10px] text-white/30 uppercase tracking-widest">Canlı · 5 dk</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto space-y-0.5">
        {nav.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-150 group relative',
                active
                  ? 'text-orange-300 font-medium'
                  : 'text-white/40 hover:text-white/70'
              )}
              style={active ? {
                background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.06))',
                border: '1px solid rgba(249,115,22,0.18)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              } : { border: '1px solid transparent' }}>

              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                  style={{ background: '#f97316', boxShadow: '0 0 8px rgba(249,115,22,0.6)' }} />
              )}

              <Icon className={cn('w-4 h-4 shrink-0 transition-colors', active ? 'text-orange-400' : 'text-white/30 group-hover:text-white/50')} />
              <span className="flex-1">{label}</span>
              {badge && !active && (
                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}>
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-xs">
            👤
          </div>
          <div>
            <div className="text-[11px] text-white/60 font-medium">Demo Kullanıcı</div>
            <div className="text-[9px] text-white/25">HQ Yöneticisi</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
