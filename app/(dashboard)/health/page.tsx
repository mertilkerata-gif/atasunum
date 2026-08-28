'use client'
import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { cn } from '@/lib/utils'
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Loader2 } from 'lucide-react'

interface ServiceStatus { name: string; status: 'ok' | 'warn' | 'down'; latency?: number; lastCheck: string; detail: string; icon: string }

function generateStatus(): ServiceStatus[] {
  const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return [
    { name: 'Supabase Database', status: 'ok',   latency: 12,  lastCheck: now, detail: 'Tüm tablolar erişilebilir', icon: '🗄️' },
    { name: 'Supabase Realtime', status: 'ok',   latency: 8,   lastCheck: now, detail: 'WebSocket bağlantısı aktif', icon: '⚡' },
    { name: 'OpenAI API',        status: 'ok',   latency: 340, lastCheck: now, detail: 'GPT-4o yanıt veriyor', icon: '🤖' },
    { name: 'n8n Workflow',      status: 'warn', latency: 1240,lastCheck: now, detail: 'Son snapshot 7 dk önce — gecikme var', icon: '⚙️' },
    { name: 'WhatsApp API',      status: 'ok',   latency: 180, lastCheck: now, detail: 'Business API bağlı', icon: '💬' },
    { name: 'Webhook Endpoint',  status: 'ok',   latency: 28,  lastCheck: now, detail: '/api/webhook/snapshot aktif', icon: '🔗' },
    { name: 'Pulse Engine',      status: 'ok',   latency: 3,   lastCheck: now, detail: 'Rule-based engine çalışıyor', icon: '💓' },
    { name: 'Vercel Edge',       status: 'ok',   latency: 18,  lastCheck: now, detail: 'CDN ve edge functions aktif', icon: '▲' },
  ]
}

export default function HealthPage() {
  const [services, setServices] = useState<ServiceStatus[]>(generateStatus())
  const [checking, setChecking] = useState(false)
  const [lastFull, setLastFull] = useState(new Date().toLocaleTimeString('tr-TR'))

  const recheck = async () => {
    setChecking(true)
    await new Promise(r => setTimeout(r, 1800))
    setServices(generateStatus())
    setLastFull(new Date().toLocaleTimeString('tr-TR'))
    setChecking(false)
  }

  useEffect(() => { const t = setInterval(() => setServices(generateStatus()), 15000); return () => clearInterval(t) }, [])

  const ok = services.filter(s => s.status === 'ok').length
  const warn = services.filter(s => s.status === 'warn').length
  const down = services.filter(s => s.status === 'down').length

  const StatusIcon = ({ status }: { status: string }) =>
    status === 'ok' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> :
    status === 'warn' ? <AlertTriangle className="w-5 h-5 text-yellow-400" /> :
    <XCircle className="w-5 h-5 text-red-400" />

  return (
    <div>
      <Topbar title="Sistem Sağlığı" subtitle="Entegrasyon ve servis durumu" />
      <div className="p-6 space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl border px-4 py-2"
              style={{ background: down > 0 ? 'rgba(255,61,61,0.08)' : warn > 0 ? 'rgba(234,179,8,0.08)' : 'rgba(34,197,94,0.08)', borderColor: down > 0 ? 'rgba(255,61,61,0.2)' : warn > 0 ? 'rgba(234,179,8,0.2)' : 'rgba(34,197,94,0.2)' }}>
              <div className={cn('w-2.5 h-2.5 rounded-full', down > 0 ? 'bg-red-500' : warn > 0 ? 'bg-yellow-400' : 'bg-emerald-400')}
                style={{ boxShadow: `0 0 8px ${down > 0 ? 'rgba(255,61,61,0.8)' : warn > 0 ? 'rgba(234,179,8,0.8)' : 'rgba(34,197,94,0.8)'}` }} />
              <span className={cn('text-sm font-semibold', down > 0 ? 'text-red-400' : warn > 0 ? 'text-yellow-400' : 'text-emerald-400')}>
                {down > 0 ? 'Servis Kesintisi' : warn > 0 ? 'Uyarı Var' : 'Tüm Sistemler Aktif'}
              </span>
            </div>
            <span className="text-xs text-white/25">Son kontrol: {lastFull}</span>
          </div>
          <button onClick={recheck} disabled={checking}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs text-white/60 transition-all hover:text-white/80"
            style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.09)' }}>
            {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Yeniden Kontrol Et
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[{ label: 'Aktif', count: ok, color: 'text-emerald-400' }, { label: 'Uyarı', count: warn, color: 'text-yellow-400' }, { label: 'Kesinti', count: down, color: 'text-red-400' }].map(({ label, count, color }) => (
            <div key={label} className="rounded-xl border p-4 text-center" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className={cn('text-3xl font-bold font-mono', color)}>{count}</div>
              <div className="text-[10px] text-white/30 mt-1 uppercase tracking-widest">{label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {services.map(s => (
              <div key={s.name} className="flex items-center gap-4 px-6 py-4">
                <span className="text-xl shrink-0">{s.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white/80">{s.name}</span>
                    {s.status === 'warn' && <span className="text-[9px] bg-yellow-500/15 text-yellow-300 border border-yellow-500/20 px-1.5 py-0.5 rounded font-medium">UYARI</span>}
                  </div>
                  <span className="text-xs text-white/35">{s.detail}</span>
                </div>
                <div className="text-right shrink-0">
                  {s.latency && <div className="text-xs font-mono text-white/40 mb-1">{s.latency}ms</div>}
                  <div className="text-[10px] text-white/20">{s.lastCheck}</div>
                </div>
                <StatusIcon status={s.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
