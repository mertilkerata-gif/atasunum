'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore } from '@/data/seed/mock-data'

const STEPS = [
  { key:'order',    label:'Sipariş',   icon:'📱', color:'#7c6af7', target:null },
  { key:'kds',      label:'Mutfak',    icon:'🖥️',  color:'#4ea8f0', target:null },
  { key:'prep',     label:'Hazırlama', icon:'🔥', color:'#f0a843', target:7    },
  { key:'packing',  label:'Paketleme', icon:'📦', color:'#f0a843', target:3    },
  { key:'ready',    label:'Hazır',     icon:'✅', color:'#22d3a0', target:null },
  { key:'courier',  label:'Kurye',     icon:'🛵', color:'#f0a843', target:5    },
  { key:'delivery', label:'Teslimat',  icon:'🏠', color:'#22d3a0', target:null },
]

function getSteps(restaurantId: string) {
  const pulse = getPulseScore(restaurantId)
  const f = pulse.score / 100
  const stations = (pulse.station_scores as unknown) as Record<string,number>
  return [
    { key:'order',    min:0.5,                      bottleneck:false },
    { key:'kds',      min:+(0.8+f*0.5).toFixed(1),  bottleneck:false },
    { key:'prep',     min:+(pulse.avg_prep_time||8).toFixed(1), bottleneck:(pulse.avg_prep_time||8)>9 },
    { key:'packing',  min:+(pulse.avg_packing_time||3.5).toFixed(1), bottleneck:(stations?.packing||0)>80 },
    { key:'ready',    min:0.3,                       bottleneck:false },
    { key:'courier',  min:+(pulse.courier_wait||4).toFixed(1), bottleneck:(pulse.courier_wait||4)>6 },
    { key:'delivery', min:+(12+f*5).toFixed(1),      bottleneck:false },
  ]
}

export default function JourneyPage() {
  const [restaurantId, setRestaurantId] = useState('r1')
  const steps = getSteps(restaurantId)
  const total = steps.reduce((s,d)=>s+d.min, 0)
  const bottlenecks = steps.filter(d=>d.bottleneck)
  const maxMin = Math.max(...steps.map(d=>d.min), 1)

  return (
    <div className="dm">
      <Topbar title="Müşteri Yolculuğu" subtitle="Sipariş → Teslimat akış analizi"/>
      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:14 }}>

        {/* Controls */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <select value={restaurantId} onChange={e=>setRestaurantId(e.target.value)}
            className="inp" style={{ width:'auto', padding:'7px 12px', fontSize:13 }}>
            {RESTAURANTS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:8 }}>
            <span style={{ fontSize:12, color:'var(--tx3)' }}>Toplam süre:</span>
            <span style={{ fontSize:15, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)' }}>{total.toFixed(1)} dk</span>
          </div>
          {bottlenecks.length>0 && (
            <span className="badge badge-red">⚠ {bottlenecks.length} darboğaz</span>
          )}
        </div>

        {/* Flow Map */}
        <div className="card">
          <div className="card-h">
            <span className="card-title">Sipariş Akış Haritası</span>
            <span className="card-meta">{STEPS.length} adım</span>
          </div>
          <div style={{ overflowX:'auto', padding:'0 8px' }}>
            <div style={{ minWidth:620, padding:'40px 20px 28px' }}>
              {/* Connector çizgisi — circle'ların tam ortasında */}
              <div style={{ position:'relative', display:'flex', alignItems:'flex-start' }}>
                {/* Arka plan connector */}
                <div style={{
                  position:'absolute',
                  top:30, /* circle height/2 = 30 */
                  left: `${100/STEPS.length/2}%`,
                  right: `${100/STEPS.length/2}%`,
                  height:2,
                  background:'rgba(255,255,255,0.06)',
                  zIndex:0,
                }}/>

                {STEPS.map((step, i) => {
                  const d = steps[i]
                  const barColor = d.bottleneck ? 'var(--red)' : step.color
                  const circleBg = d.bottleneck ? 'rgba(242,87,87,0.10)' : `${step.color}15`
                  const circleBorder = d.bottleneck ? '#f25757' : `${step.color}90`

                  return (
                    <div key={step.key} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', position:'relative', zIndex:1 }}>
                      {/* Renkli connector segment (önceki ile bu arasında) */}
                      {i > 0 && (
                        <div style={{
                          position:'absolute',
                          top:30,
                          right:'50%', left:'-50%',
                          height:2, zIndex:0,
                          background: (steps[i-1].bottleneck || d.bottleneck)
                            ? 'rgba(242,87,87,0.40)'
                            : `${step.color}35`,
                          transition:'background .5s',
                        }}/>
                      )}

                      {/* Circle */}
                      <div style={{
                        width:60, height:60, borderRadius:'50%',
                        background:circleBg,
                        border:`2px solid ${circleBorder}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:24, position:'relative', zIndex:2,
                        marginBottom:14, flexShrink:0,
                        boxShadow: d.bottleneck
                          ? '0 0 20px rgba(242,87,87,0.4), 0 0 0 4px rgba(242,87,87,0.08)'
                          : `0 0 14px ${step.color}25`,
                      }}>
                        {step.icon}
                        {d.bottleneck && (
                          <div style={{
                            position:'absolute', top:-4, right:-4,
                            width:20, height:20, borderRadius:'50%',
                            background:'#f25757',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:11, fontWeight:900, color:'#fff',
                            boxShadow:'0 0 10px rgba(242,87,87,0.8)',
                            border:'2px solid var(--s1)',
                            zIndex:3,
                          }}>!</div>
                        )}
                      </div>

                      {/* Duration bar */}
                      <div style={{ width:'78%', marginBottom:8 }}>
                        <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.06)' }}>
                          <div style={{
                            height:'100%', borderRadius:2,
                            width:`${(d.min/maxMin)*100}%`,
                            background:barColor,
                            boxShadow: d.bottleneck ? `0 0 6px ${barColor}` : 'none',
                            transition:'width .8s ease',
                          }}/>
                        </div>
                      </div>

                      {/* Labels */}
                      <div style={{ textAlign:'center', padding:'0 2px' }}>
                        <p style={{ fontSize:11, fontWeight:600, marginBottom:2,
                          color:d.bottleneck?'#f25757':'var(--tx2)' }}>
                          {step.label}
                        </p>
                        <p style={{ fontSize:17, fontWeight:700, fontFamily:'JetBrains Mono,monospace',
                          color:d.bottleneck?'#f25757':'var(--tx)', letterSpacing:'-.03em', lineHeight:1, marginBottom:2 }}>
                          {d.min}
                          <span style={{ fontSize:10, color:'var(--tx3)', marginLeft:2 }}>dk</span>
                        </p>
                        <p style={{ fontSize:9, color:'var(--tx3)' }}>
                          {step.target && d.bottleneck ? `hedef: ${step.target}dk` : step.key==='order'?'sipariş':step.key==='kds'?'KDS':step.key==='prep'?'ızgara':step.key==='packing'?'kutulama':step.key==='ready'?'hazır':step.key==='courier'?'bekleme':'teslimat'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottlenecks */}
        {bottlenecks.length > 0 && (
          <div className="card" style={{ borderLeft:'3px solid var(--red)' }}>
            <div className="card-h">
              <span className="card-title" style={{ color:'var(--red)' }}>Tespit Edilen Darboğazlar</span>
              <span className="badge badge-red">{bottlenecks.length} kritik adım</span>
            </div>
            <div>
              {bottlenecks.map(b => {
                const step = STEPS.find(s=>s.key===b.key)!
                const target = step.target ?? 5
                const overPct = Math.round((b.min/target-1)*100)
                return (
                  <div key={b.key} className="row" style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:'var(--red2)', border:'1px solid rgba(242,87,87,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                      {step.icon}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13.5, fontWeight:600, color:'var(--tx)' }}>{step.label}</p>
                      <p style={{ fontSize:11, color:'var(--tx3)', marginTop:2 }}>Hedef: {target} dk · Aşım: +{(b.min-target).toFixed(1)} dk</p>
                    </div>
                    <p style={{ fontSize:20, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--red)', letterSpacing:'-.04em', flexShrink:0 }}>{b.min} dk</p>
                    <span className="badge badge-red" style={{ flexShrink:0 }}>+%{overPct}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Toplam süre dağılımı */}
        <div className="card">
          <div className="card-h"><span className="card-title">Süre Dağılımı</span></div>
          <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:8 }}>
            {STEPS.map((step,i) => {
              const d = steps[i]
              const pct = (d.min/total)*100
              const barColor = d.bottleneck ? 'var(--red)' : step.color
              return (
                <div key={step.key} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:16, flexShrink:0 }}>{step.icon}</span>
                  <span style={{ fontSize:12, color:'var(--tx2)', width:80, flexShrink:0 }}>{step.label}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ height:6, borderRadius:3, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:3, width:`${pct}%`, background:barColor, boxShadow:d.bottleneck?`0 0 6px ${barColor}`:'none', transition:'width .8s ease' }}/>
                    </div>
                  </div>
                  <span style={{ fontSize:12, fontFamily:'JetBrains Mono,monospace', color:d.bottleneck?'var(--red)':'var(--tx2)', width:42, textAlign:'right', flexShrink:0 }}>{d.min} dk</span>
                  <span style={{ fontSize:11, color:'var(--tx3)', width:32, textAlign:'right', flexShrink:0 }}>%{pct.toFixed(0)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Restoran karşılaştırma */}
        <div className="card">
          <div className="card-h">
            <span className="card-title">Tüm Restoranlar — Süre Karşılaştırması</span>
            <span className="card-meta">Seçmek için tıkla</span>
          </div>
          <div>
            {RESTAURANTS.map(r => {
              const rd = getSteps(r.id)
              const rtotal = rd.reduce((s,d)=>s+d.min, 0)
              const pulse = getPulseScore(r.id)
              const isSelected = r.id === restaurantId
              const barColor = rtotal>30?'var(--red)':rtotal>24?'var(--amber)':'var(--green)'
              const maxTotal = 40
              return (
                <div key={r.id} className="row"
                  style={{ cursor:'pointer', background:isSelected?'var(--ac3)':undefined, borderLeft:isSelected?'2px solid var(--ac)':'2px solid transparent', display:'flex', alignItems:'center', gap:12 }}
                  onClick={()=>setRestaurantId(r.id)}>
                  <span style={{ fontSize:12.5, color:'var(--tx)', width:130, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {r.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.')}
                  </span>
                  <div style={{ flex:1 }}>
                    <div style={{ height:5, borderRadius:3, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:3, width:`${Math.min(100,(rtotal/maxTotal)*100)}%`, background:barColor, transition:'width .7s ease' }}/>
                    </div>
                  </div>
                  <span style={{ fontSize:14, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)', width:52, textAlign:'right', flexShrink:0 }}>{rtotal.toFixed(1)} dk</span>
                  <span style={{ fontSize:12, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:pulse.score>=80?'var(--red)':pulse.score>=60?'var(--amber)':'var(--green)', width:28, textAlign:'right', flexShrink:0 }}>{pulse.score}</span>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
