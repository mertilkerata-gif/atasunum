'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, Cell } from 'recharts'
import { TrendingUp, Target, Activity, CheckCircle2 } from 'lucide-react'

const ACCURACY_DATA = [
  { hour:'14:00', predicted:38,  actual:41,  diff:3  },
  { hour:'15:00', predicted:45,  actual:43,  diff:-2 },
  { hour:'16:00', predicted:52,  actual:55,  diff:3  },
  { hour:'17:00', predicted:68,  actual:71,  diff:3  },
  { hour:'18:00', predicted:94,  actual:98,  diff:4  },
  { hour:'18:30', predicted:127, actual:132, diff:5  },
  { hour:'19:00', predicted:141, actual:138, diff:-3 },
  { hour:'19:30', predicted:128, actual:121, diff:-7 },
  { hour:'20:00', predicted:109, actual:114, diff:5  },
  { hour:'21:00', predicted:72,  actual:69,  diff:-3 },
]

const WEEKLY = [
  { day:'Pzt', accuracy:94.9 }, { day:'Sal', accuracy:95.3 },
  { day:'Çar', accuracy:93.8 }, { day:'Per', accuracy:92.2 },
  { day:'Cum', accuracy:90.6 }, { day:'Cmt', accuracy:88.2 },
  { day:'Paz', accuracy:89.7 },
]

const REST_ACCURACY = RESTAURANTS.map(r => ({
  id: r.id,
  name: r.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.'),
  mae: +(4 + Math.sin(r.id.charCodeAt(1)) * 2).toFixed(1),
  accuracy: +(95 - Math.sin(r.id.charCodeAt(1)) * 3).toFixed(1),
})).sort((a,b) => b.accuracy - a.accuracy)

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--s2)', border:'1px solid var(--bdr2)', borderRadius:10, padding:'8px 12px' }}>
      <p style={{ fontSize:11, color:'var(--tx3)', marginBottom:5 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:p.color, flexShrink:0 }}/>
          <span style={{ fontSize:11, color:'var(--tx2)' }}>{p.name}:</span>
          <span style={{ fontSize:12, fontWeight:600, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function ForecastAccuracyPage() {
  const [period, setPeriod] = useState<'today'|'7d'|'30d'>('today')
  const [restFilter, setRestFilter] = useState('all')

  const mae = (ACCURACY_DATA.reduce((s,d)=>s+Math.abs(d.diff),0)/ACCURACY_DATA.length).toFixed(1)
  const mape = (ACCURACY_DATA.reduce((s,d)=>s+Math.abs(d.diff/d.actual)*100,0)/ACCURACY_DATA.length).toFixed(1)
  const accuracy = (100 - parseFloat(mape)).toFixed(1)

  const kpis = [
    { label:'Doğruluk', value:`%${accuracy}`, desc:'100 − MAPE', color:'var(--green)', bg:'var(--green2)', Icon:CheckCircle2 },
    { label:'MAE', value:mae, desc:'Ort. mutlak hata', color:parseFloat(mae)<7?'var(--green)':'var(--amber)', bg:parseFloat(mae)<7?'var(--green2)':'var(--amber2)', Icon:Target },
    { label:'MAPE', value:`%${mape}`, desc:'Yüzde hata', color:parseFloat(mape)<8?'var(--green)':'var(--amber)', bg:parseFloat(mape)<8?'var(--green2)':'var(--amber2)', Icon:Activity },
    { label:'Değerlendirilen', value:String(ACCURACY_DATA.length), desc:'saatlik tahmin', color:'var(--ac)', bg:'var(--ac2)', Icon:TrendingUp },
  ]

  return (
    <div className="dm">
      <Topbar title="Tahmin Doğruluğu" subtitle="MAE · MAPE · Gerçekleşen vs Tahmin"/>
      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Filtreler */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <div className="tabs" style={{ borderRadius:10, flex:'none' }}>
            {[{ v:'today',l:'Bugün'},{v:'7d',l:'7 Gün'},{v:'30d',l:'30 Gün'}].map(({v,l})=>(
              <button key={v} className={`tab ${period===v?'active':''}`} onClick={()=>setPeriod(v as any)} style={{ padding:'7px 14px' }}>{l}</button>
            ))}
          </div>
          <select value={restFilter} onChange={e=>setRestFilter(e.target.value)} className="inp" style={{ width:'auto', padding:'7px 12px', fontSize:12.5 }}>
            <option value="all">Tüm Restoranlar</option>
            {RESTAURANTS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* KPI */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,200px),1fr))', gap:12 }}>
          {kpis.map(({ label, value, desc, color, bg, Icon }, i) => (
            <div key={label} className="kpi" style={{ borderLeft:`2.5px solid ${color}`, animationDelay:`${i*40}ms` }}>
              <div style={{ position:'absolute', top:0, right:0, width:70, height:70, background:`radial-gradient(circle at top right,${bg},transparent 70%)`, pointerEvents:'none' }}/>
              <div style={{ width:32, height:32, borderRadius:9, background:bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
                <Icon size={14} style={{ color }} strokeWidth={1.9}/>
              </div>
              <p className="kpi-label">{label}</p>
              <p className="kpi-value" style={{ fontSize:24, color }}>{value}</p>
              <p className="kpi-sub">{desc}</p>
            </div>
          ))}
        </div>

        {/* Ana karşılaştırma */}
        <div className="card">
          <div className="card-h">
            <span className="card-title">Tahmin vs Gerçekleşen — Saatlik</span>
            <div style={{ display:'flex', gap:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:24, height:2, background:'var(--ac)', borderRadius:2, borderTop:'2px dashed var(--ac)' }}/>
                <span style={{ fontSize:11, color:'var(--tx3)' }}>Tahmin</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:24, height:2, background:'var(--amber)', borderRadius:2 }}/>
                <span style={{ fontSize:11, color:'var(--tx3)' }}>Gerçek</span>
              </div>
            </div>
          </div>
          <div style={{ padding:'16px 20px' }}>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={ACCURACY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--s4)" vertical={false}/>
                <XAxis dataKey="hour" tick={{ fill:'var(--tx3)', fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'var(--tx3)', fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<TT/>}/>
                <Line type="monotone" dataKey="predicted" stroke="var(--ac)" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Tahmin"/>
                <Line type="monotone" dataKey="actual" stroke="var(--amber)" strokeWidth={2.5} dot={{ fill:'var(--amber)', r:4, strokeWidth:0 }} name="Gerçek"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap:14 }}>
          {/* Haftalık trend */}
          <div className="card">
            <div className="card-h"><span className="card-title">Haftalık Doğruluk Trendi</span></div>
            <div style={{ padding:'16px 20px' }}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={WEEKLY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--s4)" vertical={false}/>
                  <XAxis dataKey="day" tick={{ fill:'var(--tx3)', fontSize:10 }} axisLine={false} tickLine={false}/>
                  <YAxis domain={[80,100]} tick={{ fill:'var(--tx3)', fontSize:10 }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<TT/>}/>
                  <Bar dataKey="accuracy" name="Doğruluk %" radius={[5,5,0,0]}>
                    {WEEKLY.map((d,i) => (
                      <Cell key={i} fill={d.accuracy>=95?'var(--green)':d.accuracy>=92?'var(--ac)':'var(--amber)'}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Restoran tablosu */}
          <div className="card">
            <div className="card-h"><span className="card-title">Restoran Bazlı Doğruluk</span></div>
            <div style={{ maxHeight:220, overflowY:'auto' }}>
              {REST_ACCURACY.map((r,i) => (
                <div key={r.id} className="row" style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--tx3)', width:16, flexShrink:0 }}>{i+1}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</p>
                    <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.06)', marginTop:5, overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:2, width:`${(r.accuracy-80)*5}%`, background:r.accuracy>=95?'var(--green)':r.accuracy>=92?'var(--ac)':'var(--amber)', transition:'width .7s ease' }}/>
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ fontSize:13, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:r.accuracy>=95?'var(--green)':r.accuracy>=92?'var(--ac)':'var(--amber)' }}>%{r.accuracy}</p>
                    <p style={{ fontSize:10, color:'var(--tx3)', marginTop:2 }}>MAE {r.mae}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hata dağılımı */}
        <div className="card">
          <div className="card-h">
            <span className="card-title">Hata Dağılımı</span>
            <span className="card-meta">Tahmin − Gerçek · pozitif = fazla tahmin</span>
          </div>
          <div style={{ padding:'16px 20px' }}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={ACCURACY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--s4)" vertical={false}/>
                <XAxis dataKey="hour" tick={{ fill:'var(--tx3)', fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'var(--tx3)', fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<TT/>}/>
                <Bar dataKey="diff" name="Hata" radius={[3,3,0,0]}>
                  {ACCURACY_DATA.map((d,i) => (
                    <Cell key={i} fill={d.diff>0?'var(--ac)':d.diff<0?'var(--red)':'var(--tx3)'}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', gap:16, marginTop:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:10, height:10, borderRadius:2, background:'var(--ac)', flexShrink:0 }}/>
                <span style={{ fontSize:11, color:'var(--tx3)' }}>Fazla tahmin</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:10, height:10, borderRadius:2, background:'var(--red)', flexShrink:0 }}/>
                <span style={{ fontSize:11, color:'var(--tx3)' }}>Eksik tahmin</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
