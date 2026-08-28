'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, ChevronRight, Shield } from 'lucide-react'

const DEMO_USERS = [
  { email: 'hq@tabgida.com', password: 'tabgida2026', role: 'HQ Merkez', initial: 'HQ', color: '#f97316' },
  { email: 'bolge@tabgida.com', password: 'bolge2026', role: 'Bölge Müdürü', initial: 'BM', color: '#818cf8' },
  { email: 'mudur@tabgida.com', password: 'mudur2026', role: 'Restoran Müdürü', initial: 'RM', color: '#22c55e' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 700))
    const user = DEMO_USERS.find(u => u.email === email && u.password === password)
    if (user) {
      if (typeof window !== 'undefined') localStorage.setItem('mn_user', JSON.stringify(user))
      router.push('/overview')
    } else {
      setError('E-posta veya şifre hatalı')
      setLoading(false)
    }
  }

  const quickLogin = (u: typeof DEMO_USERS[0]) => { setEmail(u.email); setPassword(u.password) }

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
            <h2 className="text-2xl font-bold text-white mb-2">Giriş Yap</h2>
            <p className="text-sm text-white/40">Demo hesabıyla sisteme erişin</p>
          </div>

          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="block text-[11px] text-white/40 uppercase tracking-widest mb-2">E-posta</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="kullanici@tabgida.com"
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px', padding: '12px 16px',
                  color: 'rgba(255,255,255,0.9)', fontSize: '14px',
                  outline: 'none', transition: 'all 0.2s',
                }} />
            </div>

            <div>
              <label className="block text-[11px] text-white/40 uppercase tracking-widest mb-2">Şifre</label>
              <div className="flex gap-2">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px', padding: '12px 16px',
                    color: 'rgba(255,255,255,0.9)', fontSize: '14px',
                    outline: 'none',
                  }} />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  style={{
                    padding: '0 14px', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
                    color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
                  }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-400 px-4 py-3 rounded-xl border"
                style={{ background: 'rgba(255,61,61,0.06)', borderColor: 'rgba(255,61,61,0.2)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full rounded-xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 mt-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Giriş yapılıyor...</> : <>Giriş Yap <ChevronRight className="w-4 h-4" /></>}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-3.5 h-3.5 text-white/20" />
              <span className="text-[11px] text-white/25 uppercase tracking-widest">Demo Hesapları</span>
            </div>
            <div className="space-y-2">
              {DEMO_USERS.map(u => (
                <button key={u.email} onClick={() => quickLogin(u)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-white/[0.12]"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', textAlign: 'left' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: u.color + '20', border: `1px solid ${u.color}30`, color: u.color }}>
                    {u.initial}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-white/70">{u.role}</div>
                    <div className="text-[10px] text-white/30 font-mono">{u.email}</div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}
