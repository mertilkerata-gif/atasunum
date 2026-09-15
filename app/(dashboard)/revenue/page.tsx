'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchDailyRevenue, fetchRestaurants } from '@/lib/supabase-client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { TrendingUp, DollarSign, ShoppingBag, Store } from 'lucide-react'

const TT = ({active,payload,label}:any) => {
  if (!active||!payload?.length) return null
  return <div style={{background:'var(--s2)',border:'1px solid var(--bdr2)',borderRadius:10,padding:'8px 12px'}}>
    <p style={{fontSize:11,color:'var(--tx3)',marginBottom:4}}>{label}</p>
    {payload.map((p:any)=><p key={p.name} style={{fontSize:12,fontWeight:600,color:p.color||'var(--tx)',fontFamily:'JetBrains Mono,monospace'}}>{p.name}: {(p.value as number).toLocaleString('tr-TR')} ₺</p>)}
  </div>
}

export default function RevenuePage() {
  const [revenue, setRevenue] = useState<any[]>([])
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string|null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [rv,r] = await Promise.all([fetchDailyRevenue(selectedId??undefined,7), fetchRestaurants()])
    setRevenue(rv); setRestaurants(r); setLoading(false)
  }, [selectedId])

  useEffect(() => { load() }, [load])

  // Günlük toplamlar
  const byDate = [...new Set(revenue.map(r=>r.date))].sort().reverse().map(date => {
    const rows = revenue.filter(r=>r.date===date)
    return {
      date, label: new Date(date).toLocaleDateString('tr-TR',{weekday:'short',day:'numeric',month:'short'}),
      total: rows.reduce((s,r)=>s+(r.total_revenue??0),0),
      tiklagelsin: rows.reduce((s,r)=>s+(r.tiklagelsin_revenue??0),0),
      restaurant: rows.reduce((s,r)=>s+(r.restaurant_revenue??0),0),
      orders: rows.reduce((s,r)=>s+(r.order_count??0),0),
    }
  })

  const today = byDate[0]
  const yesterday = byDate[1]
  const todayTotal = today?.total ?? 0
  const diff = yesterday ? ((todayTotal - yesterday.total) / yesterday.total * 100).toFixed(1) : null

  // Restoran sıralaması (bugün)
  const todayRows = revenue.filter(r=>r.date===byDate[0]?.date)
  const ranked = restaurants.map(r=>({
    ...r,
    revenue: todayRows.find(rv=>rv.restaurant_id===r.id)?.total_revenue ?? 0,
    orders: todayRows.find(rv=>rv.restaurant_id===r.id)?.order_count ?? 0,
  })).sort((a,b)=>b.revenue-a.revenue)

  return (
    <div className="dm">
      <Topbar title="Satış & Ciro" subtitle="Son 7 gün · Supabase"/>
      <div className="scroll" style={{padding:'22px 24px',display:'flex',flexDirection:'column',gap:16}}>

        {/* KPI */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
          {[
            {label:"Bugün Ciro",value:todayTotal.toLocaleString('tr-TR',{maximumFractionDigits:0})+' ₺',color:'var(--ac)',bg:'var(--ac2)',Icon:DollarSign},
            {label:"Tıkla Gelsin",value:(today?.tiklagelsin??0).toLocaleString('tr-TR',{maximumFractionDigits:0})+' ₺',color:'var(--amber)',bg:'var(--amber2)',Icon:ShoppingBag},
            {label:"Restoran",value:(today?.restaurant??0).toLocaleString('tr-TR',{maximumFractionDigits:0})+' ₺',color:'var(--blue)',bg:'var(--blue2)',Icon:Store},
            {label:"Sipariş",value:String(today?.orders??0),color:'var(--green)',bg:'var(--green2)',Icon:TrendingUp},
          ].map((k,i)=>{const Icon=k.Icon;return(
            <div key={k.label} className="kpi" style={{borderLeft:`2.5px solid ${k.color}`,animationDelay:`${i*40}ms`}}>
              <div style={{position:'absolute',top:0,right:0,width:80,height:80,background:`radial-gradient(circle at top right,${k.bg},transparent 70%)`,pointerEvents:'none'}}/>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
                <div style={{width:34,height:34,borderRadius:9,background:k.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Icon size={15} style={{color:k.color}} strokeWidth={1.9}/>
                </div>
                {diff && i===0 && <span className={`badge ${parseFloat(diff)>=0?'badge-green':'badge-red'}`}>{parseFloat(diff)>=0?'+':''}{diff}%</span>}
              </div>
              <p className="kpi-label">{k.label}</p>
              <p className="kpi-value" style={{fontSize:20,color:k.color}}>{loading?'—':k.value}</p>
            </div>
          )})}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:14}}>
          {/* Chart */}
          <div className="card">
            <div className="card-h">
              <span className="card-title">7 Günlük Ciro Trendi</span>
              <select value={selectedId??''} onChange={e=>setSelectedId(e.target.value||null)} className="inp" style={{width:'auto',padding:'4px 10px',fontSize:12}}>
                <option value="">Tüm Ağ</option>
                {restaurants.map(r=><option key={r.id} value={r.id}>{r.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.')}</option>)}
              </select>
            </div>
            <div style={{padding:'16px 20px'}}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[...byDate].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--s4)" vertical={false}/>
                  <XAxis dataKey="label" tick={{fill:'var(--tx3)',fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'var(--tx3)',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                  <Tooltip content={<TT/>}/>
                  <Bar dataKey="tiklagelsin" name="Tıkla Gelsin" stackId="a" fill="var(--amber)" radius={[0,0,0,0]}/>
                  <Bar dataKey="restaurant" name="Restoran" stackId="a" fill="var(--ac)" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranking */}
          <div className="card">
            <div className="card-h"><span className="card-title">Bugün Sıralaması</span></div>
            <div>
              {ranked.map((r,i)=>(
                <div key={r.id} className="row">
                  <span style={{fontSize:11,fontFamily:'JetBrains Mono,monospace',color:'var(--tx3)',width:16,flexShrink:0}}>{i+1}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:12.5,fontWeight:500,color:'var(--tx)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.')}</p>
                    <p style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>{r.orders} sipariş</p>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,fontFamily:'JetBrains Mono,monospace',color:'var(--tx)',flexShrink:0}}>{(r.revenue/1000).toFixed(1)}K ₺</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
