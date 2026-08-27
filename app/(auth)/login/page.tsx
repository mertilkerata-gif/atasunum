'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Zap, Loader2 } from 'lucide-react'

const DEMO_USERS = [
  { email: 'hq@tabgida.com', password: 'tabgida2026', role: 'HQ', name: 'Genel Merkez' },
  { email: 'bolge@tabgida.com', password: 'bolge2026', role: 'Regional Manager', name: 'Bölge Müdürü' },
  { email: 'mudur@tabgida.com', password: 'mudur2026', role: 'Restaurant Manager', name: 'Restoran Müdürü' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 800))
    const user = DEMO_USERS.find(u => u.email === email && u.password === password)
    if (user) {
      localStorage.setItem('mn_user', JSON.stringify(user))
      router.push('/overview')
    } else {
      setError('E-posta veya şifre hatalı')
      setLoading(false)
    }
  }

  const quickLogin = (user: typeof DEMO_USERS[0]) => {
    setEmail(user.email)
    setPassword(user.password)
  }

  return (
    <div className="min-h-screen bg-[#07070f] flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/[0.04] rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-indigo-500/[0.03] rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500 mb-4 shadow-lg shadow-orange-500/20">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Mutfak Nabzı</h1>
          <p className="text-sm text-white/40">TAB Gıda Operasyon Sistemi</p>
        </div>

        {/* Form */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-7">
          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="text-xs text-white/50 font-medium uppercase tracking-wide block mb-2">E-posta</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="kullanici@tabgida.com"
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-orange-500/60 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-white/50 font-medium uppercase tracking-wide block mb-2">Şifre</label>
              <div className="flex gap-2">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-orange-500/60 transition-colors" />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="px-3 border border-white/[0.08] rounded-xl text-white/30 hover:text-white/60 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white rounded-xl py-3 text-sm font-semibold transition-colors mt-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Giriş yapılıyor...</> : 'Giriş Yap'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-5 pt-5 border-t border-white/[0.06]">
            <div className="text-xs text-white/30 text-center mb-3">Demo Hesapları</div>
            <div className="space-y-2">
              {DEMO_USERS.map(u => (
                <button key={u.email} onClick={() => quickLogin(u)}
                  className="w-full flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg px-3 py-2 transition-colors">
                  <div className="text-left">
                    <div className="text-xs font-medium text-white/70">{u.name}</div>
                    <div className="text-[10px] text-white/30">{u.email}</div>
                  </div>
                  <span className="text-[10px] bg-orange-500/15 text-orange-400 px-2 py-0.5 rounded font-medium">{u.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-5">
          TAB Gıda · Mutfak Nabzı v1.0 · Demo Ortamı
        </p>
      </div>
    </div>
  )
}
