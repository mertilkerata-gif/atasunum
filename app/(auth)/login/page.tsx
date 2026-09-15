'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronRight, Shield, Activity, AlertCircle, TrendingUp } from 'lucide-react'

const ROLES = [
  {
    role: 'HQ Yöneticisi',
    desc: 'Tüm ağ — tam erişim',
    initial: 'HQ',
    color: '#7c6af7',
    email: 'hq@tabgida.com',
  },
  {
    role: 'Bölge Müdürü',
    desc: 'Anadolu/Avrupa yakası',
    initial: 'BM',
    color: '#22d3a0',
    email: 'bolge@tabgida.com',
  },
  {
    role: 'Restoran Müdürü',
    desc: 'Tek şube yönetimi',
    initial: 'RM',
    color: '#4ea8f0',
    email: 'mudur@tabgida.com',
  },
]

const STATS = [
  { label: 'Restoran', value: '10', Icon: Activity },
  { label: 'Güncelleme', value: '5 dk', Icon: TrendingUp },
  { label: 'AI Doğruluk', value: '%87', Icon: AlertCircle },
]

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Zaten giriş yapmışsa direkt geç
    if (localStorage.getItem('mn_user')) router.replace('/overview')
  }, [router])

  const loginAs = async (user: typeof ROLES[0]) => {
    setLoading(user.role)
    await new Promise(r => setTimeout(r, 700))
    localStorage.setItem('mn_user', JSON.stringify(user))
    router.push('/overview')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>

      {/* Sol — branding */}
      <div style={{
        width: '50%', flexShrink: 0, display: 'none',
        flexDirection: 'column', justifyContent: 'space-between',
        padding: '40px 48px', position: 'relative', overflow: 'hidden',
        background: 'var(--s1)', borderRight: '1px solid var(--bdr)',
      }} className="login-left">

        {/* Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(var(--bdr) 1px,transparent 1px),linear-gradient(90deg,var(--bdr) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        {/* Glow */}
        <div style={{ position: 'absolute', top: '20%', left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,106,247,0.07) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(34,211,160,0.05) 0%,transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,var(--ac),#5b4de0)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(124,106,247,0.4)' }}>
            <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.4" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-.2px' }}>Mutfak Nabzı</p>
            <p style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 1, letterSpacing: '.1em', textTransform: 'uppercase' }}>TAB Gıda · Operasyon</p>
          </div>
        </div>

        {/* Headline */}
        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 24, height: 1, background: 'var(--ac)', opacity: .6 }} />
            Operasyon Kontrol Merkezi
          </p>
          <h1 style={{ fontSize: 42, fontWeight: 700, color: 'var(--tx)', lineHeight: 1.18, letterSpacing: '-.5px', marginBottom: 18 }}>
            Sorun olmadan<br />
            <span style={{ background: 'linear-gradient(135deg,var(--ac),#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              önce gör.
            </span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.7, maxWidth: "min(380px,100%)" }}>
            Restoranlarınızın operasyonel yükünü gerçek zamanlı izleyin. Darboğaz oluşmadan önce müdahale edin.
          </p>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 40 }}>
            {STATS.map(({ label, value, Icon }) => (
              <div key={label} style={{ background: 'var(--s2)', border: '1px solid var(--bdr)', borderRadius: 12, padding: '16px 18px' }}>
                <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', color: 'var(--tx)', letterSpacing: '-.04em', marginBottom: 6 }}>{value}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Icon size={11} style={{ color: 'var(--tx3)' }} strokeWidth={1.8} />
                  <p style={{ fontSize: 10.5, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ position: 'relative', fontSize: 11, color: 'var(--tx3)' }}>
          TAB Gıda · Burger King & Popeyes Türkiye · Demo v1.0
        </p>
      </div>

      {/* Sağ — giriş formu */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
        <div style={{
          width: '100%', maxWidth: "min(380px,100%)",
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'none' : 'translateY(8px)',
          transition: 'opacity .3s ease, transform .3s ease',
        }}>

          {/* Mobile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }} className="login-mobile-logo">
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,var(--ac),#5b4de0)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(124,106,247,0.4)' }}>
              <svg width="13" height="13" fill="none" stroke="#fff" strokeWidth="2.4" viewBox="0 0 24 24">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--tx)' }}>Mutfak Nabzı</p>
              <p style={{ fontSize: 10, color: 'var(--tx3)' }}>TAB Gıda · Demo</p>
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-.3px', marginBottom: 6 }}>Giriş Yap</h2>
            <p style={{ fontSize: 13, color: 'var(--tx3)' }}>Demo rolleriyle sisteme girin</p>
          </div>

          {/* Rol kartları */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {ROLES.map(u => (
              <button
                key={u.role}
                onClick={() => loginAs(u)}
                disabled={loading !== null}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 12, width: '100%',
                  background: loading === u.role ? `${u.color}10` : 'var(--s1)',
                  border: `1px solid ${loading === u.role ? u.color + '35' : 'var(--bdr)'}`,
                  cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left',
                  transition: 'border-color .15s, background .15s',
                  opacity: loading && loading !== u.role ? .5 : 1,
                  boxShadow: loading === u.role ? `0 0 20px ${u.color}12` : 'none',
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.borderColor = u.color + '40' }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.borderColor = 'var(--bdr)' }}
              >
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: `${u.color}18`, border: `1px solid ${u.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: u.color, letterSpacing: '.05em',
                }}>
                  {loading === u.role ? <Loader2 size={15} style={{ animation: 'spin .7s linear infinite' }} /> : u.initial}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.1px' }}>{u.role}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--tx3)', marginTop: 2 }}>{u.desc}</p>
                </div>

                <ChevronRight size={15} style={{ color: loading === u.role ? u.color : 'var(--tx3)', flexShrink: 0, transition: 'color .15s' }} />
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--bdr)' }} />
            <span style={{ fontSize: 11, color: 'var(--tx3)' }}>ya da</span>
            <div style={{ flex: 1, height: 1, background: 'var(--bdr)' }} />
          </div>

          {/* Email form */}
          <EmailForm onLogin={() => router.push('/overview')} />

          {/* Footer */}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={11} style={{ color: 'var(--tx3)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--tx3)' }}>Demo ortamı · Gerçek veri işlenmez</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media(min-width:768px) {
          .login-left { display: flex !important }
          .login-mobile-logo { display: none !important }
        }
      `}</style>
    </div>
  )
}

function EmailForm({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('E-posta ve şifre gerekli'); return }
    setLoading(true); setError('')
    await new Promise(r => setTimeout(r, 800))
    // Demo: herhangi bir e-posta/şifre kabul et
    localStorage.setItem('mn_user', JSON.stringify({ role: 'HQ Yöneticisi', email, initial: 'HQ', color: '#7c6af7' }))
    onLogin()
  }

  return (
    <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label className="label">E-posta</label>
        <input
          type="email"
          className="inp"
          placeholder="ornek@tabgida.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={loading}
        />
      </div>
      <div>
        <label className="label">Şifre</label>
        <input
          type="password"
          className="inp"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading}
        />
      </div>
      {error && (
        <p style={{ fontSize: 12, color: 'var(--red)', background: 'var(--red2)', border: '1px solid rgba(242,87,87,.2)', borderRadius: 8, padding: '8px 12px' }}>
          {error}
        </p>
      )}
      <button type="submit" className="btn" disabled={loading} style={{ marginTop: 4, justifyContent: 'center', width: '100%' }}>
        {loading
          ? <><Loader2 size={14} style={{ animation: 'spin .7s linear infinite' }} /> Giriş yapılıyor…</>
          : 'Giriş Yap'
        }
      </button>
    </form>
  )
}

