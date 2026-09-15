'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { getSupabase } from '@/lib/supabase-client'
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Activity } from 'lucide-react'

const SERVICES = [
  { id: 'supabase', label: 'Supabase DB', test: async () => { const { error } = await getSupabase().from('restaurants').select('id').limit(1); return !error } },
  { id: 'pulse',    label: 'Pulse API',   test: async () => { const { data } = await getSupabase().from('pulse_scores').select('id').limit(1); return (data?.length ?? 0) > 0 } },
  { id: 'orders',   label: 'Siparişler',  test: async () => { const { error } = await getSupabase().from('orders').select('id').limit(1); return !error } },
  { id: 'anomaly',  label: 'Anomali',     test: async () => { const { error } = await getSupabase().from('anomalies').select('id').limit(1); return !error } },
  { id: 'revenue',  label: 'Ciro',        test: async () => { const { error } = await getSupabase().from('daily_revenue').select('id').limit(1); return !error } },
  { id: 'shifts',   label: 'Vardiyalar',  test: async () => { const { error } = await getSupabase().from('shifts').select('id').limit(1); return !error } },
  { id: 'products', label: 'Ürünler',     test: async () => { const { error } = await getSupabase().from('products').select('id').limit(1); return !error } },
  { id: 'audit',    label: 'Audit Log',   test: async () => { const { error } = await getSupabase().from('audit_logs').select('id').limit(1); return !error } },
]

type Status = 'unknown' | 'ok' | 'error' | 'checking'

export default function HealthPage() {
  const [statuses, setStatuses] = useState<Record<string, { status: Status; latency?: number }>>({})
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const check = useCallback(async () => {
    setStatuses(prev => Object.fromEntries(SERVICES.map(s => [s.id, { status: 'checking' as Status }])))
    await Promise.all(SERVICES.map(async svc => {
      const start = Date.now()
      try {
        const ok = await svc.test()
        const latency = Date.now() - start
        setStatuses(prev => ({ ...prev, [svc.id]: { status: ok ? 'ok' : 'error', latency } }))
      } catch {
        setStatuses(prev => ({ ...prev, [svc.id]: { status: 'error', latency: Date.now() - start } }))
      }
    }))
    setLastCheck(new Date())
  }, [])

  useEffect(() => { check() }, [check])

  const allOk = Object.values(statuses).every(s => s.status === 'ok')
  const errCount = Object.values(statuses).filter(s => s.status === 'error').length
  const avgLatency = Object.values(statuses).filter(s => s.latency).reduce((s, v) => s + (v.latency ?? 0), 0) / (Object.values(statuses).filter(s => s.latency).length || 1)

  const StatusIcon = ({ status }: { status: Status }) => {
    if (status === 'checking') return <div style={{ width: 14, height: 14, border: '2px solid var(--bdr)', borderTopColor: 'var(--ac)', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
    if (status === 'ok') return <CheckCircle2 size={14} style={{ color: 'var(--green)' }}/>
    if (status === 'error') return <XCircle size={14} style={{ color: 'var(--red)' }}/>
    return <AlertTriangle size={14} style={{ color: 'var(--tx3)' }}/>
  }

  return (
    <div className="dm">
      <Topbar title="Sistem Sağlığı" subtitle="Supabase servis durumu"
        action={<button onClick={check} className="btn-ghost" style={{ padding: '5px 12px', fontSize: 12 }}><RefreshCw size={12}/> Kontrol Et</button>}
      />
      <div className="scroll" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Genel durum */}
        <div style={{ background: allOk ? 'var(--green2)' : 'var(--red2)', border: `1px solid ${allOk ? 'var(--green-ln)' : 'var(--red-ln)'}`, borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: allOk ? 'rgba(23,178,106,.15)' : 'rgba(242,87,87,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {allOk ? <CheckCircle2 size={22} style={{ color: 'var(--green)' }}/> : <XCircle size={22} style={{ color: 'var(--red)' }}/>}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: allOk ? 'var(--green)' : 'var(--red)', marginBottom: 4 }}>
              {allOk ? 'Tüm Sistemler Çalışıyor' : `${errCount} Servis Hatalı`}
            </p>
            <p style={{ fontSize: 12, color: 'var(--tx2)' }}>
              {lastCheck ? `Son kontrol: ${lastCheck.toLocaleTimeString('tr-TR')}` : 'Kontrol ediliyor…'}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', color: 'var(--tx)' }}>{Math.round(avgLatency)}<span style={{ fontSize: 12, color: 'var(--tx3)', marginLeft: 2 }}>ms</span></p>
            <p style={{ fontSize: 11, color: 'var(--tx3)' }}>Ort. Gecikme</p>
          </div>
        </div>

        {/* Servis listesi */}
        <div className="card">
          <div className="card-h"><span className="card-title">Servis Durumları</span><span className="card-meta">{SERVICES.length} servis</span></div>
          <div>
            {SERVICES.map(svc => {
              const s = statuses[svc.id] ?? { status: 'unknown' as Status }
              return (
                <div key={svc.id} className="row" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <StatusIcon status={s.status}/>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx)' }}>{svc.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 1 }}>Supabase · {svc.id}</p>
                  </div>
                  {s.latency && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <div className="prog" style={{ width: 60 }}>
                        <div className="prog-fill" style={{ width: `${Math.min(100, s.latency / 5)}%`, background: s.latency > 300 ? 'var(--red)' : s.latency > 100 ? 'var(--amber)' : 'var(--green)' }}/>
                      </div>
                      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono,monospace', color: 'var(--tx3)', width: 40, textAlign: 'right' }}>{s.latency}ms</span>
                    </div>
                  )}
                  <span className={`badge badge-${s.status === 'ok' ? 'green' : s.status === 'error' ? 'red' : s.status === 'checking' ? 'ac' : 'muted'}`} style={{ fontSize: 10, flexShrink: 0 }}>
                    {s.status === 'checking' ? 'Test…' : s.status === 'ok' ? 'OK' : s.status === 'error' ? 'HATA' : '?'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
