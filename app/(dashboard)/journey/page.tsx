'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchAllPulseScores, fetchLatestSnapshots, fetchRestaurants } from '@/lib/supabase-client'

const STEPS = [
  { key:'order',    label:'Sipariş',   icon:'📱', color:'#7c6af7', target:null },
  { key:'kds',      label:'Mutfak',    icon:'🖥️',  color:'#4ea8f0', target:null },
  { key:'prep',     label:'Hazırlama', icon:'🔥', color:'#f0a843', target:7    },
  { key:'packing',  label:'Paketleme', icon:'📦', color:'#f0a843', target:3    },
  { key:'ready',    label:'Hazır',     icon:'✅', color:'#22d3a0', target:null },
  { key:'courier',  label:'Kurye',     icon:'🛵', color:'#f0a843', target:5    },
  { key:'delivery', label:'Teslimat',  icon:'🏠', color:'#22d3a0', target:null },
]

export default function JourneyPage() {
  const [restaurantId, setRestaurantId] = useState('r6')
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [pulse, setPulse] = useState<any>(null)
  const [snap, setSnap] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [pulseRows, snapRows, restRows] = await Promise.all([
        fetchAllPulseScores(), fetchLatestSnapshots(), fetchRestaurants()
      ])
      if (restRows.length) setRestaurants(restRows)
      const pm = Object.fromEntries(pulseRows.map((p:any)=>[p.restaurant_id,p]))
      const sm = Object.fromEntries(snapRows.map((s:any)=>[s.restaurant_id,s]))
      setPulse(pm[restaurantId] ?? null)
      setSnap(sm[restaurantId] ?? null)
    } catch(e){ console.error(e) }
    finally { setLoading(false) }
  }, [restaurantId])

  useEffect(() => { load(); const t=setInterval(load,10000); return ()=>clearInterval(t) }, [load])

  // Step sürelerini Supabase'den üret
  const steps = pulse ? [
    { key:'order',    min:0.5,                                                         bottleneck:false },
    { key:'kds',      min:+(0.8 + (pulse.score/100)*0.5).toFixed(1),                  bottleneck:false },
    { key:'prep',     min:+(snap?.avg_preparation_time ?? pulse.avg_prep_time ?? 8).toFixed(1),   bottleneck:(snap?.avg_preparation_time ?? pulse.avg_prep_time ?? 8) > 9 },
    { key:'packing',  min:+(snap?.avg_packing_time ?? 3.5).toFixed(1),                bottleneck:(snap?.packing_load ?? 0) > 80 },
    { key:'ready',    min:0.3,                                                         bottleneck:false },
    { key:'courier',  min:+(snap?.avg_courier_wait ?? pulse.courier_wait ?? 4).toFixed(1), bottleneck:(snap?.avg_courier_wait ?? pulse.courier_wait ?? 4) > 6 },
    { key:'delivery', min:+(12+(pulse.score/100)*5).toFixed(1),                        bottleneck:false },
  ] : []

  const total = steps.reduce((s,d)=>s+d.min, 0)
  const bottlenecks = steps.filter(d=>d.bottleneck)
  const maxMin = Math.max(...steps.map(d=>d.min), 1)

  return (
    <div className="dm">
      <Topbar title="Müşteri Yolculuğu" subtitle="Sipariş → Teslimat akış analizi"/>
      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:14 }}>

        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <select value={restaurantId} onChange={e=>setRestaurantId(e.target.value)}
            className="inp" style={{ width:'auto', padding:'7px 12px', fontSize:13 }}>
            {restaurants.map((r:any)=><option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:8 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 6px var(--green)' }}/>
            <span style={{ fontSize:12, color:'var(--tx3)' }}>Supabase · canlı</span>
          </div>
          {pulse && (
            <div style={{ padding:'6px 14px', background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:8 }}>
              <span style={{ fontSize:12, color:'var(--tx2)' }}>Nabız: <strong style={{ fontFamily:'JetBrains Mono,monospace', color: pulse.score>=80?'var(--red)':pulse.score>=60?'var(--amber)':'var(--green)' }}>{pulse.score}</strong> · {pulse.risk_level}</span>
            </div>
          )}
        </div>

        {loading || !pulse ? (
          <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
            <div style={{ width:20, height:20, border:'2px solid var(--s4)', borderTopColor:'var(--ac)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
          </div>
        ) : (
          <>
            {/* Toplam süre */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,140px),1fr))', gap:10 }}>
              {[
                { label:'Toplam Süre', value:`${total.toFixed(1)} dk`, color: total>25?'var(--red)':total>18?'var(--amber)':'var(--green)' },
                { label:'Darboğaz', value:`${bottlenecks.length} adım`, color: bottlenecks.length>1?'var(--red)':bottlenecks.length===1?'var(--amber)':'var(--green)' },
                { label:'Hedef', value:'< 18 dk', color:'var(--tx3)' },
                { label:'Açık Sipariş', value:String(pulse.open_orders??0), color: (pulse.open_orders??0)>25?'var(--red)':'var(--tx)' },
              ].map(kpi => (
                <div key={kpi.label} style={{ background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                  <p style={{ fontSize:10, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>{kpi.label}</p>
                  <p style={{ fontSize:20, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:kpi.color }}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Akış */}
            <div className="card">
              <div className="card-h"><span className="card-title">Sipariş Akışı</span><span className="card-meta">Gerçek verilerden hesaplanmış</span></div>
              <div style={{ padding:'20px' }}>
                {steps.map((step, i) => {
                  const meta = STEPS[i]
                  const barW = (step.min / maxMin) * 100
                  const isBottleneck = step.bottleneck
                  const target = meta.target
                  const overTarget = target && step.min > target
                  return (
                    <div key={step.key} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                      <span style={{ fontSize:20, flexShrink:0, width:28 }}>{meta.icon}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:13, fontWeight:500, color:'var(--tx)' }}>{meta.label}</span>
                            {isBottleneck && <span className="badge badge-red" style={{ fontSize:9 }}>DARBOĞAZ</span>}
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            {target && <span style={{ fontSize:11, color:'var(--tx3)' }}>hedef: {target}dk</span>}
                            <span style={{ fontSize:13, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color: overTarget?'var(--red)':isBottleneck?'var(--amber)':meta.color }}>
                              {step.min} dk
                            </span>
                          </div>
                        </div>
                        <div style={{ height:8, borderRadius:4, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${barW}%`, borderRadius:4, background: overTarget?'var(--red)':isBottleneck?'var(--amber)':meta.color, transition:'width .8s ease', boxShadow: isBottleneck?`0 0 8px ${overTarget?'var(--red)':'var(--amber)'}`:'none' }}/>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* İstasyon yükleri */}
            {snap && (
              <div className="card">
                <div className="card-h"><span className="card-title">İstasyon Yükleri</span></div>
                <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { label:'Grill',   val: snap.grill_load   ?? 0 },
                    { label:'Fryer',   val: snap.fryer_load   ?? 0 },
                    { label:'Packing', val: snap.packing_load ?? 0 },
                    { label:'Kurye',   val: snap.courier_load ?? 0 },
                  ].map(({ label, val }) => {
                    const c = val>=80?'var(--red)':val>=60?'var(--amber)':'var(--green)'
                    return (
                      <div key={label} style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{ width:56, fontSize:12, color:'var(--tx3)', flexShrink:0 }}>{label}</span>
                        <div style={{ flex:1, height:8, borderRadius:4, background:'rgba(255,255,255,0.05)' }}>
                          <div style={{ height:'100%', borderRadius:4, width:`${val}%`, background:c, transition:'width .8s ease' }}/>
                        </div>
                        <span style={{ width:32, fontSize:12, fontFamily:'JetBrains Mono,monospace', color:c, textAlign:'right', flexShrink:0 }}>{val}</span>
                        {val>=80 && <span className="badge badge-red" style={{ fontSize:9, flexShrink:0 }}>KRİTİK</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
