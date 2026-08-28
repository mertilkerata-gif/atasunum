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
  Menu, X, ChevronRight
} from 'lucide-react'

const nav = [
  { href: '/overview',       label: 'Genel Bakış',        icon: LayoutDashboard },
  { href: '/live-operations',label: 'Canlı Operasyon',    icon: Activity },
  { href: '/tv',             label: 'TV Merkezi',          icon: Tv,           badge: 'YENİ', external: true },
  { href: '/anomalies',      label: 'Anomali Dedektör',   icon: AlertOctagon, badge: 'YENİ' },
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
  { href: '/ai-recommendations', label: 'AI Önerileri',   icon: Lightbulb },
  { href: '/forecast-accuracy',  label: 'Tahmin Doğruluğu',icon: Target },
  { href: '/simulator',      label: 'Simülatör',          icon: FlaskConical },
  { href: '/ai-analyst',     label: 'AI Analist',         icon: Bot },
  { href: '/health',         label: 'Sistem Sağlığı',     icon: Heart },
  { href: '/audit',          label: 'Audit Log',          icon: ClipboardList },
  { href: '/webhook-test',   label: 'Webhook Test',       icon: Terminal },
  { href: '/settings',       label: 'Ayarlar',            icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
        <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
            boxShadow: '0 0 24px rgba(249,115,22,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}>
          <Zap size={16} strokeWidth={2.5} color="white" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-white tracking-tight leading-tight">Mutfak Nabzı</div>
          <div className="text-[9px] uppercase tracking-[0.18em] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>TAB Gıda · v1.0</div>
        </div>
        {/* Mobile close */}
        <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden p-1 rounded-lg hover:bg-white/10 transition-colors">
          <X size={16} color="rgba(255,255,255,0.5)" />
        </button>
      </div>

      {/* Live badge */}
      <div className="flex items-center gap-2.5 px-5 py-2.5 border-b border-white/[0.04]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" style={{ animationDuration: '2s' }} />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" style={{ boxShadow: '0 0 8px rgba(52,211,153,0.8)' }} />
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.25)' }}>Canlı · 5 dk</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto space-y-0.5 scrollbar-thin">
        {nav.map(({ href, label, icon: Icon, badge, external }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              target={external ? '_blank' : undefined}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12.5px] transition-all duration-150 group relative',
                active ? 'text-orange-300 font-semibold' : 'text-white/40 hover:text-white/75 hover:bg-white/[0.04]'
              )}
              style={active ? {
                background: 'linear-gradient(135deg, rgba(249,115,22,0.14), rgba(249,115,22,0.06))',
                border: '1px solid rgba(249,115,22,0.2)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(249,115,22,0.08)',
              } : { border: '1px solid transparent' }}>

              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                  style={{ background: '#f97316', boxShadow: '0 0 10px rgba(249,115,22,0.7)' }} />
              )}
              <Icon className={cn('w-4 h-4 shrink-0 transition-colors', active ? 'text-orange-400' : 'text-white/25 group-hover:text-white/50')} />
              <span className="flex-1 truncate">{label}</span>
              {badge && !active && (
                <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0"
                  style={{ background: 'rgba(249,115,22,0.12)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.18)' }}>
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0"
            style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.2)' }}>
            👤
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-white/60 font-medium truncate">Demo Kullanıcı</div>
            <div className="text-[9px] text-white/25 truncate">HQ Yöneticisi</div>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden flex items-center justify-center w-10 h-10 rounded-xl"
        style={{
          background: 'rgba(249,115,22,0.15)',
          border: '1px solid rgba(249,115,22,0.3)',
          backdropFilter: 'blur(8px)',
        }}>
        <Menu size={18} color="#f97316" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-[240px] flex flex-col z-50 transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          background: 'linear-gradient(180deg, #0a0a12 0%, #080810 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="fixed left-0 top-0 h-screen w-[220px] flex-col z-40 hidden lg:flex"
        style={{
          background: 'linear-gradient(180deg, #0a0a12 0%, #080810 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}>
        <SidebarContent />
      </aside>
    </>
  )
}
