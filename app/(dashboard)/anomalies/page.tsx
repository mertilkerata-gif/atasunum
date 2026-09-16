'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchAnomalies, acknowledgeAnomaly, insertAuditLog } from '@/lib/supabase-client'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { RefreshCw, AlertTriangle, TrendingUp, Server, Users, Truck, Zap, CheckCircle2, Activity } from 'lucide-react'

type Sev = 'CRITICAL'|'WARNING'|'INFO'

const TYPE_META: Record<string,{ label:string; icon:any }> = {
  DEMAND_SPIKE:    { label:'Sipariş Dalgası', icon:TrendingUp  },
  POS_CRASH:       { label:'POS Çöküşü',     icon:Server      },
  STAFF_SHORTAGE:  { label:'Personel Eksik',  icon:Users       },
  COURIER_BLACKOUT:{ label:'Kurye Kesintisi', icon:Truck       },
  SPEED_ANOMALY:   { label:'Hız Anomalisi',   icon:Zap         },
}

const SEV_META: Record<Sev,{ color:string; bg:string; border:string; badge:string }> = {
  CRITICAL:{ color:'var(--red)',   bg:'var(--red2)',   border:'rgba(242,87,87,.2)',  badge:'badge-red'   },
  WARNING: { color:'var(--amber)', bg:'var(--amber2)', border:'rgba(240,168,67,.2)', badge:'badge-amber' },
  INFO:    { color:'var(--blue)',  bg:'var(--blue2)',  border:'var(--blue-ln)',       badge:'badge-ac'    },
}

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<'ALL'|Sev>('ALL')
  const [lastScan, setLastScan]   = useState('')

  const load = useCallback(async () => {
    try {
      const data = await fetchAnomalies()
      setAnomalies(data as any[])
      setLastScan(new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const ack = async (id: string) => {
    await acknowledgeAnomaly(id)
    await insertAuditLog({ action:'ACKNOWLEDGE', resource:'anomaly', details:{ id } })
    setAnomalies(prev => prev.map(a => a.id===id ? { ...a, acknowledged:true } : a))
  }

  const shown = filter==='ALL' ? anomalies : anomalies.filter(a=>a.severity===filter)
  const openCritical = anomalies.filter(a=>a.severity==='CRITICAL'&&!a.acknowledged).length
  const openTotal    = anomalies.filter(a=>!a.acknowledged).length

  const tabs = [
    { key:'ALL',      label:'Tümü',  count:anomalies.length },
    { key:'CRITICAL', label:'Kritik', count:anomalies.filter(a=>a.severity==='CRITICAL').length },
    { key:'WARNING',  label:'Uyarı',  count:anomalies.filter(a=>a.severity==='WARNING').length  },
    { key:'INFO',     label:'Bilgi',  count:anomalies.filter(a=>a.severity==='INFO').length     },
  ]

  return (
    <div className="dm">
      <Topbar title="Anomali Dedektörü" subtitle="Gerçek zamanlı sistem izleme · Supabase"
        action={
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {openCritical>0 && <span className="badge badge-red">{openCritical} Kritik</span>}
            <button onClick={load} className="btn-ghost" style={{ padding:'5px 10px', fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
              <RefreshCw size={11}/> Tara
            </button>
          </div>
        }
      />

      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:14 }}>

        {/* Status bar */}
        <div style={{ display:'flex', alignItems:'center', gap:16, background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:12, padding:'10px 18px', flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 6px var(--green)', animation:'pulse 2.5s ease-in-out infinite' }}/>
            <span style={{ fontSize:12.5, fontWeight:500, color:'var(--tx2)' }}>Aktif İzleme</span>
          </div>
          {lastScan && <span style={{ fontSize:11, color:'var(--tx3)' }}>Son tarama: {lastScan}</span>}
          <span style={{ fontSize:11, color:'var(--tx3)' }}>10 restoran · 47 metrik</span>
          <span style={{ marginLeft:'auto', fontSize:11, color:'var(--tx3)' }}>{openTotal} onaysız anomali</span>
        </div>

        {/* KPI */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,160px),1fr))', gap:12 }}>
          {[
            { label:'Kritik',    value:anomalies.filter(a=>a.severity==='CRITICAL').length, color:'var(--red)',   bg:'var(--red2)'   },
            { label:'Uyarı',     value:anomalies.filter(a=>a.severity==='WARNING').length,  color:'var(--amber)', bg:'var(--amber2)' },
            { label:'Onaysız',   value:openTotal,                                            color:'var(--ac)',    bg:'var(--ac2)'    },
            { label:'Onaylanan', value:anomalies.filter(a=>a.acknowledged).length,           color:'var(--green)', bg:'var(--green2)' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="kpi" style={{ borderLeft:`2.5px solid ${color}` }}>
              <div style={{ width:30, height:30, borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                <Activity size={13} style={{ color }} strokeWidth={1.9}/>
              </div>
              <p className="kpi-label">{label}</p>
              <p className="kpi-value" style={{ fontSize:22, color }}>{loading?'—':value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ borderRadius:10 }}>
          {tabs.map(f => (
            <button key={f.key} className={`tab ${filter===f.key?'active':''}`} onClick={()=>setFilter(f.key as any)}>
              {f.label}
              <span style={{ marginLeft:5, fontSize:10, fontFamily:'JetBrains Mono,monospace', background:filter===f.key?'var(--ac2)':'var(--s3)', color:filter===f.key?'var(--ac)':'var(--tx3)', padding:'1px 6px', borderRadius:5 }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
            <div style={{ width:20, height:20, border:'2px solid var(--s4)', borderTopColor:'var(--ac)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
          </div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 20px', background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:14 }}>
            <CheckCircle2 size={32} style={{ color:'var(--green)', margin:'0 auto 12px', display:'block', opacity:.6 }}/>
            <p style={{ fontSize:14, color:'var(--tx2)', marginBottom:4 }}>Anomali bulunamadı</p>
            <p style={{ fontSize:12, color:'var(--tx3)' }}>Tüm sistemler normal çalışıyor</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {shown.map(a => {
              const sev = SEV_META[a.severity as Sev] ?? SEV_META.INFO
              const tm  = TYPE_META[a.type] ?? { label:a.type?.replace(/_/g,' ')||'Anomali', icon:AlertTriangle }
              const Icon = tm.icon
              const rest = RESTAURANTS.find(r=>r.id===a.restaurant_id)

              return (
                <div key={a.id} style={{
                  background:'var(--s1)',
                  border:`1px solid ${a.acknowledged?'var(--bdr)':sev.border}`,
                  borderLeft:`3px solid ${a.acknowledged?'var(--bdr2)':sev.color}`,
                  borderRadius:12,
                  opacity: a.acknowledged ? .55 : 1,
                  transition:'opacity .2s',
                }}>
                  <div style={{ padding:'16px 20px' }}>
                    {/* Header satırı */}
                    <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                      {/* Icon */}
                      <div style={{ width:38, height:38, borderRadius:10, background:sev.bg, border:`1px solid ${sev.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Icon size={16} style={{ color:sev.color }}/>
                      </div>

                      {/* İçerik */}
                      <div style={{ flex:1, minWidth:0 }}>
                        {/* Meta row */}
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                          <span className={`badge ${sev.badge}`} style={{ fontSize:9.5 }}>{a.severity}</span>
                          <span style={{ fontSize:11, color:'var(--tx3)' }}>{tm.label}</span>
                          <span style={{ fontSize:11, color:'var(--tx3)' }}>·</span>
                          <span style={{ fontSize:11.5, fontWeight:500, color:'var(--tx2)' }}>
                            {rest?.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.') ?? a.restaurant_id}
                          </span>
                          <span style={{ marginLeft:'auto', fontSize:10.5, fontFamily:'JetBrains Mono,monospace', color:'var(--tx3)', flexShrink:0 }}>
                            {new Date(a.detected_at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}
                          </span>
                        </div>

                        {/* Başlık */}
                        <p style={{ fontSize:13.5, fontWeight:600, color:'var(--tx)', letterSpacing:'-.15px', marginBottom:5 }}>{a.title}</p>

                        {/* Açıklama */}
                        {a.description && (
                          <p style={{ fontSize:12, color:'var(--tx3)', lineHeight:1.55, marginBottom:10 }}>{a.description}</p>
                        )}

                        {/* Metrik bilgileri */}
                        {(a.metric||a.actual_value||a.deviation) && (
                          <div style={{ display:'flex', gap:20, flexWrap:'wrap', marginBottom:10 }}>
                            {a.metric && (
                              <div>
                                <p style={{ fontSize:9.5, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--tx3)', marginBottom:2 }}>Metrik</p>
                                <p style={{ fontSize:12.5, fontWeight:600, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)' }}>{a.metric}</p>
                              </div>
                            )}
                            {a.expected_value && (
                              <div>
                                <p style={{ fontSize:9.5, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--tx3)', marginBottom:2 }}>Beklenen</p>
                                <p style={{ fontSize:12.5, fontWeight:600, fontFamily:'JetBrains Mono,monospace', color:'var(--green)' }}>{a.expected_value}</p>
                              </div>
                            )}
                            {a.actual_value && (
                              <div>
                                <p style={{ fontSize:9.5, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--tx3)', marginBottom:2 }}>Gerçekleşen</p>
                                <p style={{ fontSize:12.5, fontWeight:600, fontFamily:'JetBrains Mono,monospace', color:sev.color }}>{a.actual_value}</p>
                              </div>
                            )}
                            {a.deviation && (
                              <div>
                                <p style={{ fontSize:9.5, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--tx3)', marginBottom:2 }}>Sapma</p>
                                <p style={{ fontSize:12.5, fontWeight:600, fontFamily:'JetBrains Mono,monospace', color:String(a.deviation).startsWith('+')?'var(--red)':'var(--green)' }}>{a.deviation}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Otomatik aksiyon */}
                        {a.auto_action && (
                          <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--green2)', border:'1px solid var(--green-ln)', borderRadius:8, padding:'7px 12px' }}>
                            <CheckCircle2 size={11} style={{ color:'var(--green)', flexShrink:0 }}/>
                            <span style={{ fontSize:11.5, color:'var(--tx2)' }}>{a.auto_action}</span>
                          </div>
                        )}
                      </div>

                      {/* Onayla butonu */}
                      {!a.acknowledged ? (
                        <button onClick={()=>ack(a.id)}
                          style={{ padding:'6px 14px', borderRadius:9, background:'var(--s2)', border:'1px solid var(--bdr)', color:'var(--tx2)', fontSize:11.5, fontWeight:500, cursor:'pointer', flexShrink:0, whiteSpace:'nowrap', transition:'border-color .12s' }}
                          onMouseEnter={e=>(e.currentTarget as any).style.borderColor='var(--bdr2)'}
                          onMouseLeave={e=>(e.currentTarget as any).style.borderColor='var(--bdr)'}>
                          Onayla
                        </button>
                      ) : (
                        <span style={{ fontSize:11, color:'var(--green)', display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                          <CheckCircle2 size={12}/> Onaylandı
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}
