'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronRight, Shield } from 'lucide-react'

const DEMO_USERS = [
  { role: 'HQ Merkez', desc: 'Tüm ağ görünümü', initial: 'HQ', color: '#f97316' },
  { role: 'Bölge Müdürü', desc: 'Bölgesel operasyon', initial: 'BM', color: '#818cf8' },
  { role: 'Restoran Müdürü', desc: 'Tek şube yönetimi', initial: 'RM', color: '#22c55e' },
]

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const loginAs = async (user: typeof DEMO_USERS[0]) => {
    setLoading(user.role)
    await new Promise(r => setTimeout(r, 600))
    if (typeof window !== 'undefined') localStorage.setItem('mn_user', JSON.stringify(user))
    router.push('/overview')
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#050508' }}>
      {/* Left — branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #0f0f1e 100%)' }}>

        {/* Ambient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(129,140,248,0.06) 0%, transparent 70%)' }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        <div className="relative">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 0 30px rgba(249,115,22,0.35)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div>
              <div className="text-base font-bold text-white">Mutfak Nabzı</div>
              <div className="text-[10px] text-white/30 uppercase tracking-[0.2em]">TAB Gıda</div>
            </div>
          </div>

          {/* Big headline */}
          <div className="mb-8">
            <div className="text-[11px] text-white/30 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <div className="w-6 h-px bg-orange-500/50" />
              Operasyon Kontrol Merkezi
            </div>
            <h1 className="text-5xl font-bold text-white leading-tight mb-4">
              Sorun olmadan<br />
              <span style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                önce gör.
              </span>
            </h1>
            <p className="text-white/40 text-base leading-relaxed max-w-sm">
              Restoranlarınızın operasyonel yükünü gerçek zamanlı izleyin. Darboğaz oluşmadan önce müdahale edin.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Restoran', value: '10' },
              { label: 'Anlık Nabız', value: '5 dk' },
              { label: 'AI Öneri', value: '87%' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-4 border"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="text-2xl font-bold font-mono text-white mb-1">{value}</div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom text */}
        <div className="relative text-[11px] text-white/20">
          TAB Gıda · Burger King & Popeyes Türkiye · Demo v1.0
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className={cn('w-full max-w-sm', mounted ? 'fade-up' : 'opacity-0')}>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 0 20px rgba(249,115,22,0.35)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="text-sm font-bold text-white">Mutfak Nabzı</div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Demo Erişimi</h2>
            <p className="text-sm text-white/40">Rol seçerek sisteme girin</p>
          </div>

          <div className="space-y-3">
            {DEMO_USERS.map(u => (
              <button key={u.role} onClick={() => loginAs(u)} disabled={loading !== null}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 group"
                style={{
                  background: loading === u.role ? u.color + '12' : 'rgba(255,255,255,0.03)',
                  borderColor: loading === u.role ? u.color + '35' : 'rgba(255,255,255,0.07)',
                  textAlign: 'left',
                  boxShadow: loading === u.role ? `0 0 20px ${u.color}15` : 'none',
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.borderColor = u.color + '25' }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-all"
                  style={{ background: u.color + '18', border: `1px solid ${u.color}25`, color: u.color }}>
                  {loading === u.role ? <Loader2 size={16} className="animate-spin" /> : u.initial}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">{u.role}</div>
                  <div className="text-[11px] text-white/30 mt-0.5">{u.desc}</div>
                </div>
                <ChevronRight className="w-4 h-4 transition-all group-hover:translate-x-0.5"
                  style={{ color: loading === u.role ? u.color : 'rgba(255,255,255,0.2)' }} />
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-2 text-[11px] text-white/20">
            <Shield size={12} />
            <span>Demo ortamı — gerçek veriler kullanılmaz</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}
