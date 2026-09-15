'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchAnomalies, acknowledgeAnomaly, subscribeToAnomalies, insertAuditLog } from '@/lib/supabase-client'
import { RefreshCw, AlertCircle, TrendingUp, Server, Users, Truck, Zap } from 'lucide-react'

type Severity = 'CRITICAL' | 'WARNING' | 'INFO'

const TYPE_ICON: Record<string, React.ElementType> = {
  SPEED_ANOMALY: Zap, POS_CRASH: Server, DEMAND_SPIKE: TrendingUp,
  QUALITY_DROP: AlertCircle, STAFF_SHORTAGE: Users, COURIER_BLACKOUT: Truck,
}
const SEV: Record<Severity, { color: string; bg: string; border: string; badge: string }> = {
  CRITICAL: { color: 'var(--red)',   bg: 'var(--red2)',   border: 'rgba(242,87,87,.2)',   badge: 'badge-red' },
  WARNING:  { color: 'var(--amber)', bg: 'var(--amber2)', border: 'rgba(240,168,67,.2)',  badge: 'badge-amber' },
  INFO:     { color: 'var(--blue)',  bg: 'var(--blue2)',  border: 'rgba(78,168,240,.18)', badge: 'badge-blue' },
}

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL'|Severity>('ALL')
  const [lastScan, setLastScan] = useState(new Date())

  const load = useCallback(async () => {
    try {
      const data = await fetchAnomalies()
      setAnomalies(data as any[]); setLastScan(new Date())
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const sub = subscribeToAnomalies(load)
    const t = setInterval(load, 30000)
    return () => { sub.unsubscribe(); clearInterval(t) }
  }, [load])

  const acknowledge = async (id: string) => {
    await acknowledgeAnomaly(id)
    await insertAuditLog({ user_role: '', action: 'ACKNOWLEDGE', resource: 'anomaly', details: { id } })
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
  }

  const shown = anomalies.filter(a => filter === 'ALL' || a.severity === filter)
  const cnt = { CRITICAL: anomalies.filter(a=>a.severity==='CRITICAL'&&!a.acknowledged).length, total: anomalies.filter(a=>!a.acknowledged).length }

  return (
    <div className="dm">
      <Topbar title="Anomali Dedektörü" subtitle="Gerçek zamanlı sistem izleme"
        action={
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {cnt.CRITICAL > 0 && <span className="badge badge-red">{cnt.CRITICAL} Kritik</span>}
            <button onClick={load} className="btn-ghost" style={{ padding:'5px 10px', fontSize:12 }}>
              <RefreshCw size={12}/> Tara
            </button>
          </div>
        }
      />
      <div className="scroll" style={{ padding:'22px 24px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Status bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:12, padding:'10px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 6px var(--green)', animation:'pulse 2.5s ease-in-out infinite' }}/>
              <span style={{ fontSize:12.5, color:'var(--tx2)' }}>Aktif İzleme</span>
            </div>
            <span style={{ fontSize:11, color:'var(--tx3)' }}>Son tarama: {lastScan.toLocaleTimeString('tr-TR')}</span>
            <span style={{ fontSize:11, color:'var(--tx3)' }}>10 restoran · 47 metrik</span>
          </div>
          <span style={{ fontSize:11, color:'var(--tx3)' }}>{cnt.total} onaysız</span>
        </div>

        {/* Filter tabs */}
        <div className="tabs" style={{ borderRadius:'10px 10px 0 0' }}>
          {[
            { key:'ALL', label:'Tümü', count:anomalies.length },
            { key:'CRITICAL', label:'Kritik', count:anomalies.filter(a=>a.severity==='CRITICAL').length },
            { key:'WARNING', label:'Uyarı', count:anomalies.filter(a=>a.severity==='WARNING').length },
            { key:'INFO', label:'Bilgi', count:anomalies.filter(a=>a.severity==='INFO').length },
          ].map(f => (
            <button key={f.key} className={`tab ${filter===f.key?'active':''}`} onClick={()=>setFilter(f.key as any)}>
              {f.label}
              <span style={{ marginLeft:5, fontSize:10.5, background:filter===f.key?'var(--ac2)':'var(--s3)', color:filter===f.key?'var(--ac)':'var(--tx3)', padding:'1px 6px', borderRadius:5 }}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* Anomaly list */}
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
            <div style={{ width:20, height:20, border:'2px solid var(--s4)', borderTopColor:'var(--ac)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
          </div>
        ) : shown.map(a => {
          const s = SEV[a.severity as Severity] ?? SEV.INFO
          const Icon = TYPE_ICON[a.type] ?? AlertCircle
          return (
            <div key={a.id} className="card" style={{ opacity: a.acknowledged ? .5 : 1, borderLeft:`3px solid ${a.acknowledged ? 'var(--bdr)' : s.color}` }}>
              <div style={{ padding:'16px 20px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:s.bg, border:`1px solid ${s.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon size={16} style={{ color:s.color }}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                      <span className={`badge ${s.badge}`}>{a.severity}</span>
                      <span style={{ fontSize:11, color:'var(--tx3)' }}>{a.type?.replace(/_/g,' ')}</span>
                      <span style={{ fontSize:11, color:'var(--tx3)' }}>·</span>
                      <span style={{ fontSize:11, color:'var(--tx3)' }}>{a.restaurant_id}</span>
                      <span style={{ marginLeft:'auto', fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--tx3)' }}>
                        {new Date(a.detected_at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}
                      </span>
                    </div>
                    <p style={{ fontSize:14, fontWeight:600, color:'var(--tx)', letterSpacing:'-.2px', marginBottom:6 }}>{a.title}</p>
                    <p style={{ fontSize:12.5, color:'var(--tx2)', lineHeight:1.6, marginBottom:10 }}>{a.description}</p>
                    {/* Metrics */}
                    <div style={{ display:'flex', gap:24, flexWrap:'wrap', marginBottom: a.auto_action ? 10 : 0 }}>
                      {[['Metrik',a.metric],['Beklenen',a.expected_value],['Gerçekleşen',a.actual_value],['Sapma',a.deviation]].map(([label,val])=> val && (
                        <div key={label}>
                          <div style={{ fontSize:9.5, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--tx3)', marginBottom:2 }}>{label}</div>
                          <div style={{ fontSize:13, fontWeight:600, fontFamily:'JetBrains Mono,monospace', color: label==='Sapma'&&val?.startsWith('+') ? 'var(--red)' : label==='Sapma' ? 'var(--green)' : 'var(--tx)' }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    {a.auto_action && (
                      <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:8, padding:'7px 12px' }}>
                        <span style={{ fontSize:10, color:'var(--green)' }}>✓</span>
                        <span style={{ fontSize:11, color:'var(--tx2)' }}>{a.auto_action}</span>
                      </div>
                    )}
                  </div>
                  {!a.acknowledged && (
                    <button onClick={()=>acknowledge(a.id)} className="btn-ghost" style={{ padding:'5px 12px', fontSize:11, flexShrink:0 }}>
                      Onayla
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
