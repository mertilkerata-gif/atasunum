'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchComplaints, fetchRestaurants, resolveComplaint, insertAuditLog } from '@/lib/supabase-client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts'
import { MessageSquare, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react'

const REASON_LABELS: Record<string,string> = {
  LATE_DELIVERY:'Geç Teslimat', WRONG_ORDER:'Yanlış Sipariş', MISSING_ITEM:'Eksik Ürün',
  COLD_FOOD:'Soğuk Yemek', RAW_FOOD:'Az Pişmiş', PACKAGING:'Ambalaj Sorunu',
  PORTION:'Porsiyon', RUDE_STAFF:'Kaba Personel'
}

const TT = ({active,payload,label}:any) => {
  if (!active||!payload?.length) return null
  return <div style={{background:'var(--s2)',border:'1px solid var(--bdr2)',borderRadius:10,padding:'8px 12px'}}>
    <p style={{fontSize:11,color:'var(--tx3)',marginBottom:4}}>{label}</p>
    {payload.map((p:any)=><p key={p.name} style={{fontSize:13,fontWeight:600,color:p.color||'var(--tx)',fontFamily:'JetBrains Mono,monospace'}}>{p.value}</p>)}
  </div>
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([])
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string|null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [c,r] = await Promise.all([fetchComplaints(), fetchRestaurants()])
    setComplaints(c as any[]); setRestaurants(r as any[]); setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const resolve = async (id: string) => {
    await resolveComplaint(id)
    await insertAuditLog({ user_role:'', action:'RESOLVE_COMPLAINT', resource:'complaint', details:{id} })
    setComplaints(prev => prev.map(c => c.id===id ? {...c,status:'RESOLVED'} : c))
  }

  const open = complaints.filter(c=>c.status==='OPEN')
  const resolved = complaints.filter(c=>c.status==='RESOLVED')
  const totalLost = complaints.reduce((s,c)=>s+(c.lost_revenue??0), 0)
  const avgRate = complaints.length ? (open.length/complaints.length*100).toFixed(1) : '0'

  // Restoran bazlı gruplama
  const byRestaurant = restaurants.map(r => ({
    ...r,
    complaints: complaints.filter(c=>c.restaurant_id===r.id),
    total: complaints.filter(c=>c.restaurant_id===r.id).length,
    lost: complaints.filter(c=>c.restaurant_id===r.id).reduce((s,c)=>s+(c.lost_revenue??0),0),
  })).sort((a,b)=>b.total-a.total)

  const selectedComplaints = selectedId ? complaints.filter(c=>c.restaurant_id===selectedId) : []

  // Reason distribution
  const reasonData = Object.entries(REASON_LABELS).map(([key,label])=>({
    label: label.length>12?label.slice(0,12)+'…':label,
    count: complaints.filter(c=>c.reason===key).length,
  })).filter(d=>d.count>0).sort((a,b)=>b.count-a.count)

  const kpis = [
    { label:'Açık Şikayet', value:open.length, color:'var(--red)', iconBg:'var(--red2)', Icon:MessageSquare },
    { label:'Kayıp Ciro', value:`${totalLost.toLocaleString('tr-TR',{maximumFractionDigits:0})} ₺`, color:'var(--amber)', iconBg:'var(--amber2)', Icon:TrendingDown },
    { label:'Açık Oran', value:`%${avgRate}`, color:'var(--amber)', iconBg:'var(--amber2)', Icon:AlertTriangle },
    { label:'Çözülen', value:resolved.length, color:'var(--green)', iconBg:'var(--green2)', Icon:TrendingUp },
  ]

  return (
    <div className="dm">
      <Topbar title="Müşteri Şikayetleri" subtitle="Supabase · gerçek zamanlı"/>
      <div className="scroll" style={{padding:'22px 24px',display:'flex',flexDirection:'column',gap:16}}>

        {/* KPI */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
          {kpis.map((k,i)=>{const Icon=k.Icon;return(
            <div key={k.label} className="kpi" style={{borderLeft:`2.5px solid ${k.color}`,animationDelay:`${i*40}ms`}}>
              <div style={{position:'absolute',top:0,right:0,width:80,height:80,background:`radial-gradient(circle at top right,${k.iconBg},transparent 70%)`,pointerEvents:'none'}}/>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
                <div style={{width:34,height:34,borderRadius:9,background:k.iconBg,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Icon size={15} style={{color:k.color}} strokeWidth={1.9}/>
                </div>
              </div>
              <p className="kpi-label">{k.label}</p>
              <p className="kpi-value" style={{fontSize:22,color:k.color}}>{loading?'—':k.value}</p>
            </div>
          )})}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:14}}>
          {/* Ranking */}
          <div className="card">
            <div className="card-h"><span className="card-title">Restoran Sıralaması</span></div>
            <div>
              {byRestaurant.map((r,i)=>(
                <div key={r.id} className="row" style={{cursor:'pointer',background:selectedId===r.id?'var(--ac3)':undefined,borderLeft:selectedId===r.id?'2px solid var(--ac)':'2px solid transparent'}}
                  onClick={()=>setSelectedId(selectedId===r.id?null:r.id)}>
                  <span style={{fontSize:11,fontFamily:'JetBrains Mono,monospace',color:'var(--tx3)',width:16,flexShrink:0}}>{i+1}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:12.5,fontWeight:500,color:'var(--tx)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.')}</p>
                    <p style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>{r.lost.toLocaleString('tr-TR',{maximumFractionDigits:0})} ₺ kayıp</p>
                  </div>
                  <span style={{fontSize:18,fontWeight:700,fontFamily:'JetBrains Mono,monospace',color:r.total>15?'var(--red)':r.total>8?'var(--amber)':'var(--tx3)',flexShrink:0}}>{r.total}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {/* Chart */}
            <div className="card">
              <div className="card-h"><span className="card-title">Şikayet Türü Dağılımı</span></div>
              <div style={{padding:'16px 20px'}}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={reasonData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--s4)" horizontal={false}/>
                    <XAxis type="number" tick={{fill:'var(--tx3)',fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis dataKey="label" type="category" tick={{fill:'var(--tx2)',fontSize:11}} axisLine={false} tickLine={false} width={90}/>
                    <Tooltip content={<TT/>}/>
                    <Bar dataKey="count" name="Şikayet" radius={[0,4,4,0]}>
                      {reasonData.map((_,i)=><Cell key={i} fill={i===0?'var(--red)':i===1?'var(--amber)':'var(--s4)'}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Selected restaurant complaints */}
            {selectedId ? (
              <div className="card">
                <div className="card-h">
                  <span className="card-title">{restaurants.find(r=>r.id===selectedId)?.name} — Açık Şikayetler</span>
                  <span className="badge badge-red">{selectedComplaints.filter(c=>c.status==='OPEN').length} açık</span>
                </div>
                <div style={{maxHeight:280,overflowY:'auto'}}>
                  {selectedComplaints.filter(c=>c.status==='OPEN').map(c=>(
                    <div key={c.id} className="row">
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:12.5,fontWeight:500,color:'var(--tx)'}}>{REASON_LABELS[c.reason]??c.reason}</p>
                        <p style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>{new Date(c.created_at).toLocaleString('tr-TR')} · {c.lost_revenue?.toFixed(0)} ₺</p>
                      </div>
                      <button onClick={()=>resolve(c.id)} className="btn-ghost" style={{padding:'4px 10px',fontSize:11,display:'flex',alignItems:'center',gap:4}}>
                        <CheckCircle2 size={11}/> Çöz
                      </button>
                    </div>
                  ))}
                  {selectedComplaints.filter(c=>c.status==='OPEN').length===0 && (
                    <p style={{padding:'20px',textAlign:'center',color:'var(--tx3)',fontSize:12}}>Bu restoranda açık şikayet yok ✓</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-h"><span className="card-title">Son Şikayetler</span><span className="card-meta">Tüm ağ</span></div>
                <div style={{maxHeight:280,overflowY:'auto'}}>
                  {complaints.filter(c=>c.status==='OPEN').slice(0,8).map(c=>(
                    <div key={c.id} className="row">
                      <div style={{flex:1}}>
                        <p style={{fontSize:12.5,fontWeight:500,color:'var(--tx)'}}>{REASON_LABELS[c.reason]??c.reason}</p>
                        <p style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>{c.restaurant_id} · {new Date(c.created_at).toLocaleString('tr-TR')}</p>
                      </div>
                      <button onClick={()=>resolve(c.id)} className="btn-ghost" style={{padding:'4px 10px',fontSize:11,display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                        <CheckCircle2 size={11}/> Çöz
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
