'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Activity, TrendingUp, Store, FileText,
  Lightbulb, Target, FlaskConical, Bot, Settings, ShoppingBag,
  MessageSquare, DollarSign, Package, AlertOctagon,
  Brain, Sun, Trophy, GitBranch, Map, Zap, Heart, ClipboardList, Terminal, Tv,
  Menu, X, Users, ChevronRight
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Ana Görünüm',
    items: [
      { href: '/overview',        label: 'Genel Bakış',     icon: LayoutDashboard },
      { href: '/live-operations', label: 'Canlı Operasyon', icon: Activity },
      { href: '/tv',              label: 'TV Merkezi',       icon: Tv,          badge: 'YENİ', external: true },
    ]
  },
  {
    label: 'Zeka',
    items: [
      { href: '/anomalies',  label: 'Anomali',          icon: AlertOctagon, badge: 'YENİ' },
      { href: '/briefing',   label: 'Sabah Briefing',   icon: Sun,          badge: 'YENİ' },
      { href: '/forecast',   label: 'Tahmin',           icon: TrendingUp },
      { href: '/shifts',     label: 'Vardiya AI',       icon: Users },
      { href: '/risk-matrix',label: 'Risk Matrisi',     icon: Map,          badge: 'YENİ' },
      { href: '/explainer',  label: 'Explainable AI',   icon: Zap,          badge: 'YENİ' },
      { href: '/ai-analyst', label: 'AI Analist',       icon: Bot },
      { href: '/ai-recommendations', label: 'AI Önerileri', icon: Lightbulb },
    ]
  },
  {
    label: 'Operasyon',
    items: [
      { href: '/tiklagelsin', label: 'Tıkla Gelsin',    icon: ShoppingBag },
      { href: '/restaurants', label: 'Restoranlar',     icon: Store },
      { href: '/products',    label: 'Ürün & Stok',     icon: Package },
      { href: '/complaints',  label: 'Şikayetler',      icon: MessageSquare },
      { href: '/revenue',     label: 'Satış & Ciro',    icon: DollarSign },
    ]
  },
  {
    label: 'Analiz',
    items: [
      { href: '/journey',          label: 'Müşteri Yolculuğu', icon: GitBranch, badge: 'YENİ' },
      { href: '/benchmark',        label: 'Benchmark',          icon: Trophy },
      { href: '/forecast-accuracy',label: 'Tahmin Doğruluğu',  icon: Target },
      { href: '/reports',          label: 'Raporlar',           icon: FileText },
      { href: '/simulator',        label: 'Simülatör',          icon: FlaskConical },
    ]
  },
  {
    label: 'Sistem',
    items: [
      { href: '/health',       label: 'Sistem Sağlığı', icon: Heart },
      { href: '/audit',        label: 'Audit Log',      icon: ClipboardList },
      { href: '/webhook-test', label: 'Webhook Test',   icon: Terminal },
      { href: '/settings',     label: 'Ayarlar',        icon: Settings },
    ]
  },
]

function NavItem({ href, label, icon: Icon, badge, external, active, onClick }: {
  href: string; label: string; icon: React.ElementType
  badge?: string; external?: boolean; active: boolean; onClick?: () => void
}) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2.5 px-3 py-[7px] rounded-[8px] text-[12.5px] transition-all duration-100 relative',
        active
          ? 'text-white font-medium'
          : 'text-white/30 hover:text-white/65 hover:bg-white/[0.04]'
      )}
      style={active ? {
        background: 'rgba(232,130,12,0.10)',
        border: '1px solid rgba(232,130,12,0.20)',
      } : { border: '1px solid transparent' }}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full"
          style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent-glow)' }}
        />
      )}
      <Icon
        className={cn('shrink-0 transition-colors', active ? 'text-amber-400' : 'text-white/20 group-hover:text-white/40')}
        size={13}
        strokeWidth={active ? 2 : 1.8}
      />
      <span className="flex-1 truncate tracking-[-0.01em]">{label}</span>
      {badge && !active && (
        <span className="text-[7px] font-semibold px-1 py-px rounded tracking-wider shrink-0"
          style={{ background: 'rgba(232,130,12,0.10)', color: '#e8820c', border: '1px solid rgba(232,130,12,0.18)' }}>
          {badge}
        </span>
      )}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href))

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-[14px]"
        style={{ borderBottom: '1px solid var(--border-hair)' }}>
        <div className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, #e8820c 0%, #f59e0b 100%)',
            boxShadow: '0 0 16px rgba(232,130,12,0.35)',
          }}>
          <Zap size={12} strokeWidth={2.5} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white tracking-tight leading-tight">Mutfak Nabzı</div>
          <div className="text-[9px] mt-px tracking-[0.15em] uppercase" style={{ color: 'rgba(245,245,245,0.22)' }}>
            TAB Gıda · v1.0
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/[0.06] lg:hidden">
            <X size={14} color="rgba(255,255,255,0.35)" />
          </button>
        )}
      </div>

      {/* Live badge */}
      <div className="flex items-center gap-2 px-4 py-2"
        style={{ borderBottom: '1px solid var(--border-hair)' }}>
        <div className="relative flex items-center justify-center w-1.5 h-1.5">
          <div className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-50" />
          <div className="relative w-1.5 h-1.5 rounded-full bg-emerald-400"
            style={{ boxShadow: '0 0 6px rgba(52,211,153,0.9)' }} />
        </div>
        <span className="text-[9px] uppercase tracking-[0.18em]" style={{ color: 'rgba(245,245,245,0.22)' }}>
          Canlı · 5 dk güncelleme
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-4">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <div className="px-3 mb-1 text-[9px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'rgba(245,245,245,0.18)' }}>
              {group.label}
            </div>
            <div className="space-y-px">
              {group.items.map(item => (
                <NavItem
                  key={item.href}
                  {...item}
                  active={isActive(item.href)}
                  onClick={onClose}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border-hair)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 font-medium"
            style={{
              background: 'rgba(232,130,12,0.12)',
              border: '1px solid rgba(232,130,12,0.20)',
              color: '#e8820c',
            }}>
            D
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-white/50 font-medium truncate">Demo Kullanıcı</div>
            <div className="text-[9px] truncate" style={{ color: 'rgba(245,245,245,0.20)' }}>HQ Yöneticisi</div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--success)', boxShadow: '0 0 5px rgba(34,197,94,0.7)' }} />
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden w-8 h-8 flex items-center justify-center rounded-[8px]"
        style={{
          background: 'rgba(232,130,12,0.10)',
          border: '1px solid rgba(232,130,12,0.22)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Menu size={14} color="#e8820c" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-[220px] z-50 transition-transform duration-200 lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-faint)',
        }}
      >
        <SidebarContent onClose={() => setOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="fixed left-0 top-0 h-screen w-[210px] hidden lg:flex flex-col"
        style={{
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-faint)',
        }}
      >
        <SidebarContent />
      </aside>
    </>
  )
}
