'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { getRiskConfig } from '@/lib/utils'
import { RiskLevel } from '@/types'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot } from '@/data/seed/mock-data'
import { Play, TrendingDown, TrendingUp } from 'lucide-react'

interface SimParams { extraPacking:number; extraGrill:number; extraStaff:number; orderIncrease:number; campaignActive:boolean }
interface SimResult {
  current: { score:number; risk_level:RiskLevel; avg_prep_time:number }
  simulated: { score:number; risk_level:RiskLevel; avg_prep_time:number }
  delta: { score:number; score_pct:number; prep_time:number; risk_improved:boolean }
}

const DEFAULT: SimParams = { extraPacking:0, extraGrill:0, extraStaff:0, orderIncrease:0, campaignActive:false }

function Slider({ label, value, min, max, step=1, onChange, unit='' }: { label:string; value:number; min:number; max:number; step?:number; onChange:(v:number)=>void; unit?:string }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:12.5, color:'var(--tx2)' }}>{label}</span>
        <span style={{ fontSize:13, fontWeight:600, fontFamily:'JetBrains Mono,monospace', color:'var(--ac)' }}>{value>=0?'+':''}{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}
        style={{ width:'100%', accentColor:'var(--ac)', cursor:'pointer' }}/>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:2 }}>
        <span style={{ fontSize:10, color:'var(--tx3)' }}>{min}{unit}</span>
        <span style={{ fontSize:10, color:'var(--tx3)' }}>{max}{unit}</span>
      </div>
    </div>
  )
}

export default function SimulatorPage() {
  const [restaurantId, setRestaurantId] = useState('r6')
  const [params, setParams] = useState<SimParams>(DEFAULT)
  const [result, setResult] = useState<SimResult|null>(null)
  const [loading, setLoading] = useState(false)

  const pulse = getPulseScore(restaurantId)
  const snapshot = getSnapshot(restaurantId)
  const origConfig = getRiskConfig(pulse.risk_level)

  const run = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/simulate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          current:{ restaurant_id:restaurantId, open_orders:snapshot.open_orders, orders_last_5m:snapshot.orders_last_5m, orders_last_15m:snapshot.orders_last_15m,
            avg_preparation_time:snapshot.avg_preparation_time, avg_packing_time:snapshot.avg_packing_time, avg_courier_wait:snapshot.avg_courier_wait,
            grill_load:snapshot.grill_load, fryer_load:snapshot.fryer_load, packing_load:snapshot.packing_load, courier_load:snapshot.courier_load,
            active_staff:snapshot.active_staff, restaurant_capacity:RESTAURANTS.find(r=>r.id===restaurantId)?.capacity??80,
            rain_intensity:snapshot.rain_intensity, campaign_active:snapshot.campaign_active, special_event:snapshot.special_event,
            delay_rate:snapshot.delay_rate, cancellation_rate:snapshot.cancellation_rate },
          changes:params,
        }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      // fallback simülasyon
      const newScore = Math.max(0, Math.min(100,
        pulse.score - params.extraPacking*3 - params.extraGrill*2 - params.extraStaff*4 + params.orderIncrease*2 + (params.campaignActive?8:0)
      ))
      const newPrep = Math.max(2, snapshot.avg_preparation_time - params.extraGrill*0.5 - params.extraStaff*0.3 + params.orderIncrease*0.2)
      const newRisk: RiskLevel = newScore >= 75 ? 'KRITIK' : newScore >= 55 ? 'RISKLI' : newScore >= 35 ? 'YOGUN' : 'NORMAL'
      setResult({
        current:{ score:pulse.score, risk_level:pulse.risk_level, avg_prep_time:snapshot.avg_preparation_time },
        simulated:{ score:newScore, risk_level:newRisk, avg_prep_time:newPrep },
        delta:{ score:newScore-pulse.score, score_pct:((newScore-pulse.score)/pulse.score)*100, prep_time:newPrep-snapshot.avg_preparation_time, risk_improved:newScore<pulse.score },
      })
    } finally { setLoading(false) }
  }

  const simConfig = result ? getRiskConfig(result.simulated.risk_level) : null

  return (
    <div className="dm">
      <Topbar title="Simülatör" subtitle="Aksiyon etkisini önceden gör"/>
      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:16 }}>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap:16, alignItems:'start' }}>
          {/* Sol — parametreler */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div className="card">
              <div className="card-h"><span className="card-title">Senaryo Parametreleri</span></div>
              <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:16 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.08em', display:'block', marginBottom:6 }}>Restoran</label>
                  <select value={restaurantId} onChange={e=>{setRestaurantId(e.target.value);setResult(null)}} className="inp" style={{ width:'100%', padding:'8px 12px', fontSize:13 }}>
                    {RESTAURANTS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <Slider label="Packing kapasitesi artışı" value={params.extraPacking} min={0} max={5} onChange={v=>setParams(p=>({...p,extraPacking:v}))} unit=" kişi"/>
                <Slider label="Grill kapasitesi artışı" value={params.extraGrill} min={0} max={5} onChange={v=>setParams(p=>({...p,extraGrill:v}))} unit=" kişi"/>
                <Slider label="Toplam ek personel" value={params.extraStaff} min={0} max={10} onChange={v=>setParams(p=>({...p,extraStaff:v}))} unit=" kişi"/>
                <Slider label="Sipariş artış oranı" value={params.orderIncrease} min={0} max={100} step={5} onChange={v=>setParams(p=>({...p,orderIncrease:v}))} unit="%"/>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:10 }}>
                  <div>
                    <p style={{ fontSize:13, fontWeight:500, color:'var(--tx)' }}>Kampanya aktif</p>
                    <p style={{ fontSize:11, color:'var(--tx3)' }}>+8% sipariş baskısı ekler</p>
                  </div>
                  <button onClick={()=>setParams(p=>({...p,campaignActive:!p.campaignActive}))}
                    style={{ width:42, height:24, borderRadius:12, border:'none', cursor:'pointer', transition:'background .2s', background:params.campaignActive?'var(--ac)':'var(--s4)', position:'relative' }}>
                    <div style={{ width:18, height:18, borderRadius:'50%', background:'#fff', position:'absolute', top:3, transition:'left .2s', left:params.campaignActive?21:3 }}/>
                  </button>
                </div>
                <button onClick={run} disabled={loading}
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', background:'var(--ac)', color:'#fff', border:'none', borderRadius:10, padding:'11px', fontSize:13.5, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 14px rgba(124,106,247,.3)', opacity:loading?.7:1 }}>
                  {loading ? '…Simüle ediliyor' : <><Play size={14}/> Simülasyonu Çalıştır</>}
                </button>
              </div>
            </div>

            {/* Mevcut durum */}
            <div className="card" style={{ borderLeft:`3px solid ${origConfig.colorHex}` }}>
              <div className="card-h"><span className="card-title">Mevcut Durum</span></div>
              <div style={{ padding:'14px 20px', display:'flex', gap:20 }}>
                {[
                  { label:'Nabız', value:pulse.score, color:origConfig.colorHex },
                  { label:'Risk',  value:pulse.risk_level, color:origConfig.colorHex },
                  { label:'Hazır. dk', value:snapshot.avg_preparation_time.toFixed(1), color:'var(--tx)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign:'center', flex:1 }}>
                    <p style={{ fontSize:10, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>{label}</p>
                    <p style={{ fontSize:18, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sağ — sonuç */}
          {result && simConfig ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* Simüle sonuç */}
              <div style={{ background:simConfig.bg, border:`1px solid ${simConfig.colorHex}35`, borderRadius:14, padding:'22px 24px', textAlign:'center', boxShadow:`0 0 24px ${simConfig.colorHex}10` }}>
                <p style={{ fontSize:11, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:12 }}>Simüle Sonuç</p>
                <p style={{ fontSize:56, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:simConfig.colorHex, letterSpacing:'-.04em', lineHeight:1, marginBottom:8 }}>
                  {result.simulated.score}
                </p>
                <span className={`badge badge-${result.simulated.risk_level==='KRITIK'?'red':result.simulated.risk_level==='RISKLI'?'amber':result.simulated.risk_level==='YOGUN'?'amber':'green'}`}>
                  {simConfig.label}
                </span>
              </div>

              {/* Delta */}
              <div className="card">
                <div className="card-h"><span className="card-title">Değişim Analizi</span></div>
                <div style={{ padding:'14px 20px', display:'flex', flexDirection:'column', gap:12 }}>
                  {[
                    { label:'Nabız Değişimi', delta:result.delta.score, unit:'', invert:true },
                    { label:'Hazırlama Değişimi', delta:result.delta.prep_time, unit:'dk', invert:true },
                  ].map(({ label, delta, unit, invert }) => {
                    const good = invert ? delta < 0 : delta > 0
                    const color = good ? 'var(--green)' : delta===0 ? 'var(--tx3)' : 'var(--red)'
                    return (
                      <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {delta<0&&invert||delta>0&&!invert ? <TrendingDown size={14} style={{ color:'var(--green)' }}/> : delta===0 ? null : <TrendingUp size={14} style={{ color:'var(--red)' }}/>}
                          <span style={{ fontSize:13, color:'var(--tx2)' }}>{label}</span>
                        </div>
                        <span style={{ fontSize:16, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color }}>
                          {delta>=0?'+':''}{delta.toFixed(1)}{unit}
                        </span>
                      </div>
                    )
                  })}
                  <div style={{ padding:'12px 14px', background:result.delta.risk_improved?'var(--green2)':'var(--red2)', border:`1px solid ${result.delta.risk_improved?'var(--green-ln)':'var(--red-ln)'}`, borderRadius:10, textAlign:'center' }}>
                    <p style={{ fontSize:13.5, fontWeight:600, color:result.delta.risk_improved?'var(--green)':'var(--red)' }}>
                      {result.delta.risk_improved ? '✅ Bu aksiyon riski azaltıyor' : '⚠️ Risk artıyor veya değişmiyor'}
                    </p>
                  </div>
                </div>
              </div>

              {/* İstasyon karşılaştırma */}
              <div className="card">
                <div className="card-h"><span className="card-title">İstasyon Karşılaştırması</span></div>
                <div style={{ padding:'14px 20px', display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { label:'Packing', cur:(snapshot as any).packing_load??0, sim:Math.max(0,((snapshot as any).packing_load??0)-params.extraPacking*12) },
                    { label:'Grill',   cur:(snapshot as any).grill_load??0,   sim:Math.max(0,((snapshot as any).grill_load??0)-params.extraGrill*10) },
                  ].map(({ label, cur, sim }) => (
                    <div key={label}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:12, color:'var(--tx2)' }}>{label}</span>
                        <div style={{ display:'flex', gap:10 }}>
                          <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--tx3)' }}>Şimdi: {cur}</span>
                          <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:sim<cur?'var(--green)':'var(--tx3)' }}>→ {sim}</span>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:4 }}>
                        <div style={{ flex:1, height:6, borderRadius:3, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${cur}%`, background:'var(--red)', borderRadius:3, transition:'width .7s ease' }}/>
                        </div>
                        <div style={{ flex:1, height:6, borderRadius:3, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${sim}%`, background:'var(--green)', borderRadius:3, transition:'width .7s ease' }}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:320, background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:14, gap:12, padding:32 }}>
              <div style={{ fontSize:42 }}>🧪</div>
              <p style={{ fontSize:14, color:'var(--tx2)', fontWeight:500 }}>Senaryo oluştur</p>
              <p style={{ fontSize:12, color:'var(--tx3)', textAlign:'center', lineHeight:1.6 }}>Parametreleri ayarla ve Simülasyonu Çalıştır butonuna bas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
