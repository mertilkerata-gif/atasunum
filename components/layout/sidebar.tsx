'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutGrid, Radio, Monitor, AlertCircle, Sun, Truck,
  TrendingUp, Users, UtensilsCrossed, Archive, MessageCircle,
  BarChart3, Map, Zap, FileText, Lightbulb, Target,
  FlaskConical, Bot, Activity, Heart, ScrollText, Webhook,
  Settings, Menu, X, ChevronRight
} from 'lucide-react'

const NAV = [
  { section: 'Görünüm', items: [
    { href: '/overview',        label: 'Genel Bakış',    icon: LayoutGrid },
    { href: '/live-operations', label: 'Canlı',          icon: Radio },
    { href: '/tv',              label: 'TV Merkezi',      icon: Monitor, new: true, blank: true },
  ]},
  { section: 'Zeka', items: [
    { href: '/anomalies',  label: 'Anomali',         icon: AlertCircle, new: true },
    { href: '/briefing',   label: 'Sabah Briefing',  icon: Sun, new: true },
    { href: '/forecast',   label: 'Tahmin',          icon: TrendingUp },
    { href: '/shifts',     label: 'Vardiya AI',      icon: Users },
    { href: '/risk-matrix',label: 'Risk Matrisi',    icon: Map, new: true },
    { href: '/explainer',  label: 'Explainable AI',  icon: Zap, new: true },
    { href: '/ai-analyst', label: 'AI Analist',      icon: Bot },
    { href: '/ai-recommendations', label: 'Öneriler', icon: Lightbulb },
  ]},
  { section: 'Operasyon', items: [
    { href: '/tiklagelsin', label: 'Tıkla Gelsin',   icon: Truck },
    { href: '/restaurants', label: 'Restoranlar',    icon: UtensilsCrossed },
    { href: '/products',    label: 'Ürün & Stok',    icon: Archive },
    { href: '/complaints',  label: 'Şikayetler',     icon: MessageCircle },
    { href: '/revenue',     label: 'Satış & Ciro',   icon: BarChart3 },
  ]},
  { section: 'Analiz', items: [
    { href: '/journey',           label: 'Müşteri',    icon: Activity, new: true },
    { href: '/benchmark',         label: 'Benchmark',  icon: Target },
    { href: '/forecast-accuracy', label: 'Doğruluk',   icon: TrendingUp },
    { href: '/reports',           label: 'Raporlar',   icon: FileText },
    { href: '/simulator',         label: 'Simülatör',  icon: FlaskConical },
  ]},
  { section: 'Sistem', items: [
    { href: '/health',       label: 'Sağlık',      icon: Heart },
    { href: '/audit',        label: 'Audit Log',   icon: ScrollText },
    { href: '/webhook-test', label: 'Webhook',     icon: Webhook },
    { href: '/settings',     label: 'Ayarlar',     icon: Settings },
  ]},
]

export function Sidebar() {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  const active = (href: string) =>
    path === href || (href !== '/' && path.startsWith(href))

  const Inner = ({ close }: { close?: () => void }) => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-[52px] shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="w-6 h-6 rounded-[7px] flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg,#f79009,#f04438)', boxShadow: '0 0 12px rgba(247,144,9,0.4)' }}>
          <Zap size={12} color="white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold tracking-tight" style={{ color: 'var(--t1)' }}>Mutfak Nabzı</div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)', boxShadow: '0 0 5px var(--green)' }} />
          <span className="text-[10px]" style={{ color: 'var(--t3)' }}>Canlı</span>
        </div>
        {close && (
          <button onClick={close} className="p-1 rounded-md hover:bg-white/5 lg:hidden">
            <X size={13} style={{ color: 'var(--t3)' }} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {NAV.map(g => (
          <div key={g.section}>
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] px-2 mb-1" style={{ color: 'var(--t4)' }}>
              {g.section}
            </div>
            <div className="space-y-px">
              {g.items.map(item => {
                const Icon = item.icon
                const on = active(item.href)
                return (
                  <Link key={item.href} href={item.href} target={("blank" in item && item.blank) ? "_blank" : undefined}
                    onClick={close}
                    className={cn(
                      'group flex items-center gap-2.5 px-2.5 py-[6px] rounded-[8px] text-[12.5px] transition-colors duration-100',
                      on ? 'bg-white/[0.07] font-medium' : 'hover:bg-white/[0.04]'
                    )}
                    style={{ color: on ? 'var(--t1)' : 'var(--t3)' }}>
                    <Icon size={13} strokeWidth={on ? 2 : 1.75} style={{ color: on ? 'var(--t1)' : 'var(--t3)', flexShrink: 0 }} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.new && !on && (
                      <span className="text-[8px] font-semibold rounded px-1 py-px"
                        style={{ background: 'rgba(46,144,250,0.12)', color: 'var(--blue)', border: '1px solid rgba(46,144,250,0.2)' }}>
                        NEW
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
            style={{ background: 'rgba(247,144,9,0.15)', color: 'var(--orange)', border: '1px solid rgba(247,144,9,0.2)' }}>
            D
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11.5px] font-medium truncate" style={{ color: 'var(--t2)' }}>Demo · HQ</div>
          </div>
          <Settings size={12} style={{ color: 'var(--t4)', flexShrink: 0 }} />
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden w-8 h-8 flex items-center justify-center rounded-[8px]"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line-2)' }}>
        <Menu size={14} style={{ color: 'var(--t2)' }} />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setOpen(false)} />
      )}

      <aside className={cn('fixed left-0 top-0 h-screen w-[200px] z-50 transition-transform duration-200 lg:hidden',
        open ? 'translate-x-0' : '-translate-x-full')}
        style={{ background: 'var(--bg-1)', borderRight: '1px solid var(--line)' }}>
        <Inner close={() => setOpen(false)} />
      </aside>

      <aside className="fixed left-0 top-0 h-screen w-[200px] hidden lg:block"
        style={{ background: 'var(--bg-1)', borderRight: '1px solid var(--line)' }}>
        <Inner />
      </aside>
    </>
  )
}
