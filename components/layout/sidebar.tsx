'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Activity, TrendingUp, Store, FileText,
  Lightbulb, Target, FlaskConical, Bot, Settings, ShoppingBag,
  MessageSquare, DollarSign, Package, Users, AlertOctagon,
  Brain, Sun, Trophy, GitBranch, Map, Zap, Heart, ClipboardList, Terminal, Tv,
  Menu, X
} from 'lucide-react'

const nav = [
  { href: '/overview',       label: 'Genel Bakış',       icon: LayoutDashboard },
  { href: '/live-operations',label: 'Canlı Operasyon',   icon: Activity },
  { href: '/tv',             label: 'TV Merkezi',         icon: Tv,           badge: 'YENİ', external: true },
  { href: '/anomalies',      label: 'Anomali',            icon: AlertOctagon, badge: 'YENİ' },
  { href: '/briefing',       label: 'Sabah Briefing',     icon: Sun,          badge: 'YENİ' },
  { href: '/tiklagelsin',    label: 'Tıkla Gelsin',       icon: ShoppingBag },
  { href: '/forecast',       label: 'Tahmin',             icon: TrendingUp },
  { href: '/shifts',         label: 'Vardiya AI',         icon: Users },
  { href: '/restaurants',    label: 'Restoranlar',        icon: Store },
  { href: '/products',       label: 'Ürün & Stok',        icon: Package },
  { href: '/complaints',     label: 'Şikayetler',         icon: MessageSquare },
  { href: '/revenue',        label: 'Satış & Ciro',       icon: DollarSign },
  { href: '/journey',        label: 'Müşteri Yolculuğu',  icon: GitBranch,    badge: 'YENİ' },
  { href: '/benchmark',      label: 'Benchmark',          icon: Trophy },
  { href: '/risk-matrix',    label: 'Risk Matrisi',       icon: Map,          badge: 'YENİ' },
  { href: '/explainer',      label: 'Explainable AI',     icon: Zap,          badge: 'YENİ' },
  { href: '/reports',        label: 'Raporlar',           icon: FileText },
  { href: '/ai-recommendations', label: 'AI Önerileri',  icon: Lightbulb },
  { href: '/forecast-accuracy',  label: 'Tahmin Doğruluğu', icon: Target },
  { href: '/simulator',      label: 'Simülatör',          icon: FlaskConical },
  { href: '/ai-analyst',     label: 'AI Analist',         icon: Bot },
  { href: '/health',         label: 'Sistem Sağlığı',     icon: Heart },
  { href: '/audit',          label: 'Audit Log',          icon: ClipboardList },
  { href: '/webhook-test',   label: 'Webhook Test',       icon: Terminal },
  { href: '/settings',       label: 'Ayarlar',            icon: Settings },
]

const SB_BG = 'linear-gradient(180deg, #06060f 0%, #04040c 100%)'
const SB_BORDER = '1px solid rgba(100,100,255,0.08)'

function NavItem({ href, label, icon: Icon, badge, external, active, onClick }: {
  href: string; label: string; icon: React.ElementType; badge?: string; external?: boolean; active: boolean; onClick?: () => void
}) {
  return (
    <Link href={href} target={external ? '_blank' : undefined} onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] transition-all duration-150 group relative',
        active ? 'text-white font-medium' : 'text-white/35 hover:text-white/65 hover:bg-white/[0.03]'
      )}
      style={active ? {
        background: 'linear-gradient(135deg, rgba(79,142,247,0.12), rgba(79,142,247,0.05))',
        border: '1px solid rgba(79,142,247,0.2)',
        boxShadow: '0 2px 12px rgba(79,142,247,0.08)',
      } : { border: '1px solid transparent' }}>

      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
          style={{ background: '#4f8ef7', boxShadow: '0 0 10px rgba(79,142,247,0.8)' }} />
      )}
      <Icon className={cn('w-[15px] h-[15px] shrink-0', active ? 'text-blue-400' : 'text-white/25 group-hover:text-white/45')} />
      <span className="flex-1 truncate">{label}</span>
      {badge && !active && (
        <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0"
          style={{ background: 'rgba(79,142,247,0.12)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.2)' }}>
          {badge}
        </span>
      )}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const items = nav.map(item => ({
    ...item,
    active: pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)),
  }))

  const Logo = () => (
    <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: 'rgba(100,100,255,0.07)' }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: 'linear-gradient(135deg, #4f8ef7 0%, #7c3aed 100%)',
          boxShadow: '0 0 20px rgba(79,142,247,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}>
        <Zap size={14} strokeWidth={2.5} color="white" />
      </div>
      <div>
        <div className="text-[13px] font-bold text-white tracking-tight leading-tight">Mutfak Nabzı</div>
        <div className="text-[9px] uppercase tracking-[0.18em] mt-0.5" style={{ color: 'rgba(160,160,255,0.35)' }}>TAB Gıda · v1.0</div>
      </div>
      <button onClick={() => setOpen(false)} className="ml-auto lg:hidden p-1 rounded-lg hover:bg-white/[0.05]">
        <X size={15} color="rgba(255,255,255,0.4)" />
      </button>
    </div>
  )

  const LiveBadge = () => (
    <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: 'rgba(100,100,255,0.05)' }}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-55" style={{ animationDuration: '2.2s' }} />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" style={{ boxShadow: '0 0 7px rgba(52,211,153,0.9)' }} />
      </span>
      <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: 'rgba(140,140,220,0.3)' }}>Canlı · 5 dk</span>
    </div>
  )

  const Footer = () => (
    <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(100,100,255,0.06)' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0"
          style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.18)' }}>
          👤
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-white/55 font-medium truncate">Demo Kullanıcı</div>
          <div className="text-[9px] truncate" style={{ color: 'rgba(140,140,220,0.3)' }}>HQ Yöneticisi</div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button onClick={() => setOpen(true)}
        className="fixed top-3.5 left-3.5 z-50 lg:hidden w-9 h-9 flex items-center justify-center rounded-xl"
        style={{ background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.25)', backdropFilter: 'blur(8px)' }}>
        <Menu size={16} color="#4f8ef7" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={cn(
        'fixed left-0 top-0 h-screen w-[230px] flex flex-col z-50 transition-transform duration-280 lg:hidden',
        open ? 'translate-x-0' : '-translate-x-full'
      )} style={{ background: SB_BG, borderRight: SB_BORDER }}>
        <Logo />
        <LiveBadge />
        <nav className="flex-1 px-2.5 py-2.5 overflow-y-auto space-y-0.5">
          {items.map(item => <NavItem key={item.href} {...item} onClick={() => setOpen(false)} />)}
        </nav>
        <Footer />
      </aside>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-[210px] flex-col z-40 hidden lg:flex"
        style={{ background: SB_BG, borderRight: SB_BORDER }}>
        <Logo />
        <LiveBadge />
        <nav className="flex-1 px-2.5 py-2.5 overflow-y-auto space-y-0.5">
          {items.map(item => <NavItem key={item.href} {...item} />)}
        </nav>
        <Footer />
      </aside>
    </>
  )
}
