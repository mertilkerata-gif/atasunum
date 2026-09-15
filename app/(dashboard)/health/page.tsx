'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { getSupabase } from '@/lib/supabase-client'
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Activity, Database, Wifi, Clock } from 'lucide-react'

interface ServiceResult {
  status: 'ok' | 'error' | 'checking' | 'unknown'
  latency?: number
  detail?: string
}

const SERVICES = [
  {
    id: 'supabase',
    label: 'Supabase Bağlantısı',
    desc: 'Temel DB erişimi',
    icon: Database,
    test: async () => {
      const { error } = await getSupabase().from('restaurants').select('id').limit(1)
      if (error) throw error
      return 'OK'
    }
  },
  {
    id: 'restaurants',
    label: 'Restoranlar',
    desc: '10 aktif lokasyon',
    icon: Activity,
    test: async () => {
      const { data, error } = await getSupabase().from('restaurants').select('id', { count: 'exact' })
      if (error) throw error
      return `${(data as any[])?.length ?? 0} kayıt`
    }
  },
  {
    id: 'pulse',
    label: 'Nabız Skorları',
    desc: 'Anlık metrikler',
    icon: Activity,
    test: async () => {
      const { data, error } = await getSupabase().from('pulse_scores').select('id,computed_at').order('computed_at', { ascending: false }).limit(1)
      if (error) throw error
      const last = (data as any[])?.[0]?.computed_at
      return last ? `Son: ${new Date(last).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}` : 'Veri var'
    }
  },
  {
    id: 'snapshots',
    label: 'Op. Snapshot',
    desc: 'İstasyon verileri',
    icon: Activity,
    test: async () => {
      const { data, error } = await getSupabase().from('operation_snapshots').select('id').limit(1)
      if (error) throw error
      return `${(data as any[])?.length ? 'Erişilebilir' : 'Boş'}`
    }
  },
  {
    id: 'orders',
    label: 'Siparişler',
    desc: 'Aktif sipariş akışı',
    icon: Activity,
    test: async () => {
      const { count, error } = await getSupabase().from('orders').select('id', { count: 'exact', head: true })
      if (error) throw error
      return `${count ?? 0} toplam`
    }
  },
  {
    id: 'anomalies',
    label: 'Anomali Sistemi',
    desc: 'Tespit motoru',
    icon: AlertTriangle,
    test: async () => {
      const { data, error } = await getSupabase().from('anomalies').select('id,severity').eq('acknowledged', false)
      if (error) throw error
      const critical = (data as any[])?.filter(a => a.severity === 'CRITICAL').length ?? 0
      return `${(data as any[])?.length ?? 0} aktif${critical > 0 ? ` (${critical} kritik)` : ''}`
    }
  },
  {
    id: 'revenue',
    label: 'Ciro Verileri',
    desc: 'Günlük gelir tablosu',
    icon: Activity,
    test: async () => {
      const { count, error } = await getSupabase().from('daily_revenue').select('id', { count: 'exact', head: true })
      if (error) throw error
      return `${count ?? 0} kayıt`
    }
  },
  {
    id: 'shifts',
    label: 'Vardiya Sistemi',
    desc: 'Personel planlaması',
    icon: Activity,
    test: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await getSupabase().from('shifts').select('id,status').gte('shift_start', today + 'T00:00:00').lte('shift_start', today + 'T23:59:59')
      if (error) throw error
      const active = (data as any[])?.filter(s => s.status === 'ACTIVE').length ?? 0
      return `${(data as any[])?.length ?? 0} bugün, ${active} aktif`
    }
  },
  {
    id: 'products',
    label: 'Ürün & Stok',
    desc: 'Menü ve stok seviyeleri',
    icon: Activity,
    test: async () => {
      const { data, error } = await getSupabase().from('stock_levels').select('quantity').lte('quantity', 10)
      if (error) throw error
      const low = (data as any[])?.length ?? 0
      return low > 0 ? `${low} kritik stok` : 'Normal seviye'
    }
  },
  {
    id: 'audit',
    label: 'Audit Log',
    desc: 'Kullanıcı aksiyon kaydı',
    icon: Activity,
    test: async () => {
      const { count, error } = await getSupabase().from('audit_logs').select('id', { count: 'exact', head: true })
      if (error) throw error
      return `${count ?? 0} kayıt`
    }
  },
]

export default function HealthPage() {
  const [results, setResults] = useState<Record<string, ServiceResult>>({})
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [checking, setChecking] = useState(false)

  const check = useCallback(async () => {
    setChecking(true)
    setResults(Object.fromEntries(SERVICES.map(s => [s.id, { status: 'checking' as const }])))

    await Promise.all(SERVICES.map(async svc => {
      const start = Date.now()
      try {
        const detail = await svc.test()
        const latency = Date.now() - start
        setResults(prev => ({ ...prev, [svc.id]: { status: 'ok', latency, detail } }))
      } catch (e: any) {
        const latency = Date.now() - start
        setResults(prev => ({ ...prev, [svc.id]: { status: 'error', latency, detail: e?.message ?? 'Hata' } }))
      }
    }))

    setLastCheck(new Date())
    setChecking(false)
  }, [])

  useEffect(() => { check() }, [check])

  const allOk = Object.values(results).every(r => r.status === 'ok')
  const errCount = Object.values(results).filter(r => r.status === 'error').length
  const avgLatency = Object.values(results).filter(r => r.latency != null).reduce((s, r) => s + (r.latency ?? 0), 0) / (Object.values(results).filter(r => r.latency != null).length || 1)

  const StatusIcon = ({ status }: { status: ServiceResult['status'] }) => {
    if (status === 'checking') return <div style={{ width:16, height:16, border:'2px solid var(--bdr)', borderTopColor:'var(--ac)', borderRadius:'50%', animation:'spin .7s linear infinite', flexShrink:0 }}/>
    if (status === 'ok')       return <CheckCircle2 size={16} style={{ color:'var(--green)', flexShrink:0 }}/>
    if (status === 'error')    return <XCircle size={16} style={{ color:'var(--red)', flexShrink:0 }}/>
    return <AlertTriangle size={16} style={{ color:'var(--tx3)', flexShrink:0 }}/>
  }

  return (
    <div className="dm">
      <Topbar title="Sistem Sağlığı" subtitle="Supabase servis durumu · gerçek zamanlı ping"
        action={
          <button onClick={check} disabled={checking} className="btn-ghost" style={{ padding:'6px 14px', fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
            <RefreshCw size={12} style={{ animation:checking?'spin .7s linear infinite':undefined }}/>
            {checking ? 'Test ediliyor…' : 'Yeniden Kontrol'}
          </button>
        }
      />

      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Genel durum banner */}
        <div style={{
          display:'flex', alignItems:'center', padding:'20px 24px', borderRadius:16,
          background: checking ? 'var(--s2)' : allOk ? 'var(--green2)' : errCount > 0 ? 'var(--red2)' : 'var(--amber2)',
          border: `1px solid ${checking ? 'var(--bdr)' : allOk ? 'var(--green-ln)' : errCount > 0 ? 'var(--red-ln)' : 'var(--amber-ln)'}`,
          flexWrap:'wrap',
        }}>
          <div style={{ width:48, height:48, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            background: checking ? 'var(--s3)' : allOk ? 'rgba(23,178,106,.15)' : 'rgba(242,87,87,.15)',
          }}>
            {checking
              ? <div style={{ width:22, height:22, border:'3px solid var(--bdr)', borderTopColor:'var(--ac)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
              : allOk
                ? <CheckCircle2 size={24} style={{ color:'var(--green)' }}/>
                : <XCircle size={24} style={{ color:'var(--red)' }}/>
            }
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:17, fontWeight:700, letterSpacing:'-.2px', marginBottom:4,
              color: checking ? 'var(--tx)' : allOk ? 'var(--green)' : 'var(--red)'
            }}>
              {checking ? 'Sistemler test ediliyor…'
                : allOk ? 'Tüm Sistemler Çalışıyor ✓'
                : `${errCount} Servis Hatalı`}
            </p>
            <p style={{ fontSize:12, color:'var(--tx2)' }}>
              {lastCheck
                ? `Son kontrol: ${lastCheck.toLocaleTimeString('tr-TR')} · ${SERVICES.length} servis`
                : 'Test başlatılıyor…'}
            </p>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <p style={{ fontSize:26, fontWeight:700, fontFamily:'JetBrains Mono,monospace', letterSpacing:'-.04em',
              color: avgLatency > 500 ? 'var(--red)' : avgLatency > 200 ? 'var(--amber)' : 'var(--green)'
            }}>
              {checking ? '—' : `${Math.round(avgLatency)}`}
              <span style={{ fontSize:12, color:'var(--tx3)', marginLeft:3, fontFamily:'inherit', fontWeight:400 }}>ms</span>
            </p>
            <p style={{ fontSize:11, color:'var(--tx3)' }}>Ort. gecikme</p>
          </div>
        </div>

        {/* KPI özet */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,160px),1fr))', gap:12 }}>
          {[
            { label:'Toplam Servis',  value:SERVICES.length,                                    color:'var(--ac)',    Icon:Database },
            { label:'Çalışıyor',      value:Object.values(results).filter(r=>r.status==='ok').length,   color:'var(--green)', Icon:CheckCircle2 },
            { label:'Hatalı',         value:errCount,                                           color:errCount>0?'var(--red)':'var(--tx3)', Icon:XCircle },
            { label:'Test Ediliyor',  value:Object.values(results).filter(r=>r.status==='checking').length, color:'var(--amber)', Icon:RefreshCw },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} className="kpi" style={{ borderLeft:`2.5px solid ${color}` }}>
              <div style={{ width:30, height:30, borderRadius:8, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                <Icon size={13} style={{ color }} strokeWidth={1.9}/>
              </div>
              <p className="kpi-label">{label}</p>
              <p className="kpi-value" style={{ fontSize:24, color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Servis tablosu */}
        <div className="card">
          <div className="card-h">
            <span className="card-title">Servis Durumları</span>
            <span className="card-meta">{SERVICES.length} servis · Supabase</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'auto auto 1fr auto auto', gap:0, padding:'8px 20px', borderBottom:'1px solid var(--bdr)' }}>
            {['Durum','Servis','Detay','Gecikme',''].map(h => (
              <span key={h} style={{ fontSize:10.5, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em', padding:'0 8px 0 0' }}>{h}</span>
            ))}
          </div>
          <div>
            {SERVICES.map(svc => {
              const r = results[svc.id] ?? { status: 'unknown' as const }
              const Icon = svc.icon
              const latencyColor = (r.latency ?? 0) > 500 ? 'var(--red)' : (r.latency ?? 0) > 200 ? 'var(--amber)' : 'var(--green)'
              return (
                <div key={svc.id} className="row" style={{ display:'grid', gridTemplateColumns:'auto auto 1fr auto auto', gap:0, alignItems:'center' }}>
                  <div style={{ paddingRight:14 }}>
                    <StatusIcon status={r.status}/>
                  </div>
                  <div style={{ paddingRight:16 }}>
                    <p style={{ fontSize:13, fontWeight:500, color:'var(--tx)', whiteSpace:'nowrap' }}>{svc.label}</p>
                    <p style={{ fontSize:11, color:'var(--tx3)', marginTop:1 }}>{svc.desc}</p>
                  </div>
                  <p style={{ fontSize:12, color:'var(--tx2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {r.detail ?? '—'}
                  </p>
                  <div style={{ paddingLeft:16, textAlign:'right' }}>
                    {r.latency != null ? (
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
                        <p style={{ fontSize:12, fontFamily:'JetBrains Mono,monospace', fontWeight:600, color:latencyColor }}>{r.latency}ms</p>
                        <div style={{ width:60, height:3, borderRadius:2, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${Math.min(100,(r.latency/1000)*100)}%`, background:latencyColor, borderRadius:2 }}/>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize:11, color:'var(--tx3)' }}>—</span>
                    )}
                  </div>
                  <div style={{ paddingLeft:14 }}>
                    <span className={`badge badge-${r.status==='ok'?'green':r.status==='error'?'red':r.status==='checking'?'ac':'muted'}`} style={{ fontSize:10 }}>
                      {r.status==='ok'?'OK':r.status==='error'?'HATA':r.status==='checking'?'TEST…':'?'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* DB istatistikleri */}
        <div className="card">
          <div className="card-h">
            <span className="card-title">Veritabanı İstatistikleri</span>
            <span className="card-meta">exkhzmpowcoxdzzvzisv · Supabase PostgreSQL</span>
          </div>
          <div style={{ padding:'16px 20px', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,140px),1fr))', gap:12 }}>
            {[
              { label:'Restoranlar',   value:10 },
              { label:'Nabız Skoru',   value:22 },
              { label:'Snapshot',      value:22 },
              { label:'Siparişler',    value:16 },
              { label:'Anomaliler',    value:6  },
              { label:'Ciro Verisi',   value:70 },
              { label:'Vardiyalar',    value:81 },
              { label:'Ürünler',       value:18 },
              { label:'Şikayetler',    value:133 },
              { label:'Audit Log',     value:19 },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign:'center', padding:'12px 10px', background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:10 }}>
                <p style={{ fontSize:22, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)', letterSpacing:'-.04em', lineHeight:1, marginBottom:5 }}>{value}</p>
                <p style={{ fontSize:10, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
