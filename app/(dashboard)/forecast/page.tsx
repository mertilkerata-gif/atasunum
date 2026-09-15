'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchForecasts, fetchRestaurants } from '@/lib/supabase-client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts'

const TT = ({active,payload,label}:any) => {
  if (!active||!payload?.length) return null
  return <div style={{background:'var(--s2)',border:'1px solid var(--bdr2)',borderRadius:10,padding:'8px 12px'}}>
    <p style={{fontSize:11,color:'var(--tx3)',marginBottom:4}}>{label}:00</p>
    {payload.map((p:any)=><p key={p.name} style={{fontSize:12,fontWeight:600,color:p.color||'var(--tx)',fontFamily:'JetBrains Mono,monospace'}}>{p.name}: {p.value}</p>)}
  </div>
}

export default function ForecastPage() {
  const [forecasts, setForecasts] = useState<any[]>([])
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState('r1')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [f,r] = await Promise.all([fetchForecasts(selectedId), fetchRestaurants()])
    setForecasts(f as any[]); setRestaurants(r as any[]); setLoading(false)
  }, [selectedId])

  useEffect(() => { load() }, [load])

  const currentHour = new Date().getHours()
  const chartData = forecasts.map(f=>({
    hour: `${f.hour}`,
    orders: f.predicted_orders,
    revenue: Math.round(f.predicted_revenue/100)*100,
    isPast: f.hour < currentHour,
    isCurrent: f.hour === currentHour,
  }))

  const peakHour = forecasts.reduce((max,f)=>f.predicted_orders>max.predicted_orders?f:max, forecasts[0]??{})
  const totalPredicted = forecasts.reduce((s,f)=>s+f.predicted_orders,0)
  const remainingHours = forecasts.filter(f=>f.hour>=currentHour)
  const remainingOrders = remainingHours.reduce((s,f)=>s+f.predicted_orders,0)

  return (
    <div className="dm">
      <Topbar title="Talep Tahmini" subtitle="AI destekli sipariş öngörüsü · Supabase"/>
      <div className="scroll" style={{padding:'clamp(14px,3vw,24px) clamp(14px,3vw,24px)',display:'flex',flexDirection:'column',gap:16}}>

        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <select value={selectedId} onChange={e=>setSelectedId(e.target.value)} className="inp" style={{width:'auto',padding:'7px 12px',fontSize:13}}>
            {restaurants.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* KPI */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14}}>
          {[
            {label:'Günlük Tahmin',value:loading?'—':String(totalPredicted),sub:'sipariş'},
            {label:'Kalan Tahmin',value:loading?'—':String(remainingOrders),sub:'bu saatten itibaren'},
            {label:'Zirve Saat',value:loading?'—':(peakHour?.hour!=null?`${peakHour.hour}:00`:'—'),sub:`${peakHour?.predicted_orders??0} sipariş bekleniyor`},
          ].map(k=>(
            <div key={k.label} className="kpi" style={{borderLeft:'2.5px solid var(--ac)'}}>
              <p className="kpi-label">{k.label}</p>
              <p className="kpi-value" style={{color:'var(--ac)'}}>{k.value}</p>
              <p className="kpi-sub">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Sipariş tahmin grafiği */}
        <div className="card">
          <div className="card-h"><span className="card-title">Saatlik Sipariş Tahmini</span><span className="card-meta">Bugün</span></div>
          <div style={{padding:'16px 20px'}}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--ac)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--ac)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--s4)" vertical={false}/>
                <XAxis dataKey="hour" tick={{fill:'var(--tx3)',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={h=>`${h}:00`}/>
                <YAxis tick={{fill:'var(--tx3)',fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<TT/>}/>
                <Area type="monotone" dataKey="orders" name="Tahmini Sipariş" stroke="var(--ac)" strokeWidth={2} fill="url(#ordGrad)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Saat bazlı tablo */}
        <div className="card">
          <div className="card-h"><span className="card-title">Saat Detayı</span></div>
          <div style={{display:'grid',gridTemplateColumns:'80px 1fr 120px 100px',gap:0,padding:'8px 20px',borderBottom:'1px solid var(--bdr)', overflowX: "auto"}}>
            {['Saat','Tahmin Bar','Sipariş','Güven'].map(h=><span key={h} style={{fontSize:10.5,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'.06em'}}>{h}</span>)}
          </div>
          <div style={{maxHeight:320,overflowY:'auto'}}>
            {forecasts.map(f=>{
              const isCurrent = f.hour===currentHour
              const isPast = f.hour < currentHour
              const max = Math.max(...forecasts.map(x=>x.predicted_orders),1)
              return (
                <div key={f.hour} className="row" style={{display:'grid',gridTemplateColumns:'80px 1fr 120px 100px',gap:0,background:isCurrent?'var(--ac3)':undefined,borderLeft:isCurrent?'2px solid var(--ac)':'2px solid transparent',opacity:isPast?.6:1, overflowX: "auto"}}>
                  <span style={{fontSize:12,fontFamily:'JetBrains Mono,monospace',color:isCurrent?'var(--ac)':'var(--tx2)',fontWeight:isCurrent?700:400}}>{f.hour}:00{isCurrent?' ●':''}</span>
                  <div style={{paddingRight:16,alignSelf:'center'}}>
                    <div className="prog"><div className="prog-fill" style={{width:`${(f.predicted_orders/max)*100}%`,background:isCurrent?'var(--ac)':'var(--s5)'}}/></div>
                  </div>
                  <span style={{fontSize:13,fontWeight:600,fontFamily:'JetBrains Mono,monospace',color:'var(--tx)'}}>{f.predicted_orders}</span>
                  <span style={{fontSize:12,color:'var(--tx3)'}}>{Math.round((f.confidence??0.8)*100)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
