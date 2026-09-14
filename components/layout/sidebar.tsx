'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Radio, Monitor, AlertCircle, Sun, TrendingUp,
  Users, Map, Zap, Bot, Lightbulb, Truck, UtensilsCrossed,
  Archive, MessageCircle, BarChart3, Activity, Target,
  FlaskConical, FileText, Heart, ScrollText, Webhook,
  Settings, Menu, X, LogOut
} from 'lucide-react'

const NAV = [
  { g: 'Ana Görünüm', items: [
    { href: '/overview',        label: 'Genel Bakış',    Icon: LayoutDashboard },
    { href: '/live-operations', label: 'Canlı Operasyon',Icon: Radio },
    { href: '/tv',              label: 'TV Merkezi',      Icon: Monitor, blank: true },
  ]},
  { g: 'Zeka', items: [
    { href: '/anomalies',            label: 'Anomali',         Icon: AlertCircle  },
    { href: '/briefing',             label: 'Sabah Briefing',  Icon: Sun          },
    { href: '/forecast',             label: 'Tahmin',          Icon: TrendingUp   },
    { href: '/shifts',               label: 'Vardiya AI',      Icon: Users        },
    { href: '/risk-matrix',          label: 'Risk Matrisi',    Icon: Map          },
    { href: '/explainer',            label: 'Explainable AI',  Icon: Zap          },
    { href: '/ai-analyst',           label: 'AI Analist',      Icon: Bot          },
    { href: '/ai-recommendations',   label: 'AI Önerileri',    Icon: Lightbulb    },
  ]},
  { g: 'Operasyon', items: [
    { href: '/tiklagelsin', label: 'Tıkla Gelsin',   Icon: Truck           },
    { href: '/restaurants', label: 'Restoranlar',    Icon: UtensilsCrossed },
    { href: '/products',    label: 'Ürün & Stok',    Icon: Archive         },
    { href: '/complaints',  label: 'Şikayetler',     Icon: MessageCircle   },
    { href: '/revenue',     label: 'Satış & Ciro',   Icon: BarChart3       },
  ]},
  { g: 'Analiz', items: [
    { href: '/journey',           label: 'Müşteri',       Icon: Activity    },
    { href: '/benchmark',         label: 'Benchmark',     Icon: Target      },
    { href: '/forecast-accuracy', label: 'Doğruluk',      Icon: TrendingUp  },
    { href: '/reports',           label: 'Raporlar',      Icon: FileText    },
    { href: '/simulator',         label: 'Simülatör',     Icon: FlaskConical},
  ]},
  { g: 'Sistem', items: [
    { href: '/health',       label: 'Sistem Sağlığı', Icon: Heart      },
    { href: '/audit',        label: 'Audit Log',      Icon: ScrollText },
    { href: '/webhook-test', label: 'Webhook Test',   Icon: Webhook    },
    { href: '/settings',     label: 'Ayarlar',        Icon: Settings   },
  ]},
]

function SidebarInner({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const active = (href: string) =>
    href === '/overview' ? pathname === href : pathname.startsWith(href)

  return (
    <div className="sb" style={{ width: '100%' }}>
      {/* Logo */}
      <div className="sb-logo">
        <div className="sb-mark">
          <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.2" viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-.2px', lineHeight: 1.2 }}>Mutfak Nabzı</p>
          <p style={{ fontSize: 9.5, color: 'var(--tx3)', marginTop: 1 }}>TAB Gıda · Operasyon</p>
        </div>
        {/* Live dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
          {onClose && (
            <button onClick={onClose} style={{ marginLeft: 4, background: 'none', border: 'none', padding: 2, cursor: 'pointer', display: 'flex' }}>
              <X size={14} color="var(--tx3)" />
            </button>
          )}
        </div>
      </div>

      {/* Live status strip */}
      <div style={{ padding: '7px 14px', borderBottom: '1px solid var(--bdr)', display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0, animation: 'pulse 2.5s ease-in-out infinite' }} />
        <span style={{ fontSize: 10.5, color: 'var(--tx3)', fontWeight: 500 }}>Canlı · 5 dk güncelleme</span>
      </div>

      {/* Nav */}
      <nav className="sb-nav">
        {NAV.map(sec => (
          <div key={sec.g}>
            <p className="sb-group">{sec.g}</p>
            {sec.items.map(({ href, label, Icon, blank }: { href: string; label: string; Icon: React.ElementType; blank?: boolean }) => (
              <Link
                key={href}
                href={href}
                target={blank ? '_blank' : undefined}
                onClick={onClose}
                className={`sb-item ${active(href) ? 'active' : ''}`}
              >
                <span className="sb-icon"><Icon size={14} strokeWidth={1.8} /></span>
                <span style={{ flex: 1 }}>{label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="sb-user">
        <div className="sb-av">HQ</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Demo Kullanıcı</p>
          <p style={{ fontSize: 10.5, color: 'var(--tx3)' }}>HQ Yöneticisi</p>
        </div>
        <Settings size={13} color="var(--tx3)" style={{ flexShrink: 0 }} />
      </div>
    </div>
  )
}

export function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', top: 14, left: 14, zIndex: 50,
          width: 34, height: 34, borderRadius: 9,
          background: 'var(--s2)', border: '1px solid var(--bdr)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        className="lg:hidden"
      >
        <Menu size={15} color="var(--tx2)" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)', zIndex: 40 }}
          className="lg:hidden"
        />
      )}

      {/* Mobile drawer */}
      <div
        style={{
          position: 'fixed', left: 0, top: 0, height: '100vh', width: 220,
          zIndex: 50, transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .2s ease',
        }}
        className="lg:hidden"
      >
        <SidebarInner onClose={() => setOpen(false)} />
      </div>

      {/* Desktop */}
      <div className="sb-desktop hidden lg:flex" style={{ height: '100vh', flexShrink: 0 }}>
        <SidebarInner />
      </div>
    </>
  )
}
