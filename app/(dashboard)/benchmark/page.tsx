'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchAllPulseScores, fetchLatestSnapshots, fetchRestaurants } from '@/lib/supabase-client'
import { getRiskConfig } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'
import { fetchComplaints } from '@/lib/supabase-client'
import { fetchDailyRevenue } from '@/lib/supabase-client'

const METRICS = [
  { key:'pulse',      label:'Nabız Skoru',   lower:true,  unit:'' },
  { key:'prep',       label:'Hazırlama dk',  lower:true,  unit:'dk' },
  { key:'courier',    label:'Kurye Bekleme', lower:true,  unit:'dk' },
  { key:'complaints', label:'Şikayet',       lower:true,  unit:'' },
]

const BADGES: Record<string,{icon:string;label:string;color:string}> = {
  fastest:   {icon:'⚡',label:'En Hızlı',      color:'var(--amber)'},
  calmest:   {icon:'🟢',label:'En Sakin',      color:'var(--green)'},
  courier:   {icon:'🛵',label:'En Hızlı Kurye',color:'var(--ac)'},
  complaint: {icon:'💬',label:'En Az Şikayet', color:'var(--blue)'},
}

export default function BenchmarkPage() {
  const [metric, setMetric] = useState<'pulse'|'prep'|'courier'|'complaints'>('pulse')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [pulseRows, snapRows, restRows, complaintRows] = await Promise.all([
        fetchAllPulseScores(),
        fetchLatestSnapshots(),
        fetchRestaurants(),
        fetchComplaints(),
      ])
      const pm = Object.fromEntries(pulseRows.map((p:any) => [p.restaurant_id, p]))
      const sm = Object.fromEntries(snapRows.map((s:any) => [s.restaurant_id, s]))
      // Şikayet sayısı restoran bazında
      const cm: Record<string,number> = {}
      for (const c of complaintRows) {
        cm[c.restaurant_id] = (cm[c.restaurant_id] ?? 0) + 1
      }
      const rows = restRows.map((r:any) => {
        const p = pm[r.id] ?? {}
        const s = sm[r.id] ?? {}
        return {
          restaurant: r,
          pulse: p,
          scores: {
            pulse:      p.score             ?? 0,
            prep:       p.avg_prep_time     ?? s.avg_preparation_time ?? 0,
            courier:    p.courier_wait      ?? s.avg_courier_wait     ?? 0,
            complaints: cm[r.id]            ?? 0,
          },
          badges: [] as string[],
        }
      })
      // Badges
      const bestOf = (key:string, lower:boolean) => {
        const sorted = [...rows].sort((a:any,b:any) => lower ? a.scores[key]-b.scores[key] : b.scores[key]-a.scores[key])
        return sorted[0]?.restaurant.id
      }
      const winners = { fastest:bestOf('prep',true), calmest:bestOf('pulse',true), courier:bestOf('courier',true), complaint:bestOf('complaints',true) }
      rows.forEach((d:any) => { Object.entries(winners).forEach(([badge,id]) => { if(id===d.restaurant.id) d.badges.push(badge) }) })
      setData(rows)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 30000); return ()=>clearInterval(t) }, [load])

  if (loading) return <div className="dm"><Topbar title="Benchmark" subtitle="Restoran performans karşılaştırması"/><div style={{display:'flex',justifyContent:'center',padding:48}}><div style={{width:20,height:20,border:'2px solid var(--s4)',borderTopColor:'var(--ac)',borderRadius:'50%',animation:'spin .7s linear infinite'}}/></div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>

  const isLower = METRICS.find(m=>m.key===metric)?.lower ?? true
  const ranked = [...data].sort((a:any,b:any) => isLower ? a.scores[metric]-b.scores[metric] : b.scores[metric]-a.scores[metric])
  const vals = data.map((d:any)=>d.scores[metric])
  const best = isLower ? Math.min(...vals) : Math.max(...vals)
  const worst = isLower ? Math.max(...vals) : Math.min(...vals)
  const avg = vals.reduce((s:number,v:number)=>s+v,0)/vals.length

  const radarData = METRICS.map(m => ({
    metric: m.label,
    ...Object.fromEntries(data.slice(0,4).map((d:any) => [d.restaurant.name.slice(0,8), Math.round(d.scores[m.key])]))
  }))
  const COLORS = ['var(--ac)','var(--green)','var(--amber)','var(--blue)']

  return (
    <div className="dm">
      <Topbar title="Benchmark" subtitle="Restoran performans karşılaştırması"/>
      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Badges */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,160px),1fr))', gap:10 }}>
          {Object.entries(BADGES).map(([key,b]) => {
            const winner = data.find((d:any)=>d.badges.includes(key))
            return (
              <div key={key} style={{ background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>{b.icon}</div>
                <p style={{ fontSize:10.5, fontWeight:700, color:b.color, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>{b.label}</p>
                <p style={{ fontSize:12.5, fontWeight:600, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {winner?.restaurant.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.') ?? '—'}
                </p>
              </div>
            )
          })}
        </div>

        {/* Metric tabs */}
        <div className="tabs">
          {METRICS.map(m => (
            <button key={m.key} className={`tab ${metric===m.key?'active':''}`} onClick={()=>setMetric(m.key as any)}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Ranking */}
        <div className="card">
          <div className="card-h">
            <span className="card-title">Sıralama — {METRICS.find(m=>m.key===metric)?.label}</span>
            <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--tx3)' }}>
              <span>En iyi: <strong style={{ color:'var(--green)', fontFamily:'JetBrains Mono,monospace' }}>{Number(best).toFixed(1)}</strong></span>
              <span>Ort: <strong style={{ color:'var(--tx2)', fontFamily:'JetBrains Mono,monospace' }}>{avg.toFixed(1)}</strong></span>
              <span>En kötü: <strong style={{ color:'var(--red)', fontFamily:'JetBrains Mono,monospace' }}>{Number(worst).toFixed(1)}</strong></span>
            </div>
          </div>
          <div>
            {ranked.map((d:any, i:number) => {
              const val = d.scores[metric]
              const isBetter = isLower ? val < avg : val > avg
              const span = Math.abs(worst - best) || 1
              const barW = isLower ? (1-(val-best)/span)*100 : ((val-best)/span)*100
              const config = getRiskConfig(d.pulse.risk_level)
              return (
                <div key={d.restaurant.id} className="row" style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <span style={{ fontSize:12, fontFamily:'JetBrains Mono,monospace', color:'var(--tx3)', width:18, flexShrink:0 }}>{i+1}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                      <span style={{ fontSize:12.5, fontWeight:500, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {d.restaurant.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.')}
                      </span>
                      {d.badges.map((badge:string) => <span key={badge} style={{ fontSize:14 }}>{BADGES[badge]?.icon}</span>)}
                    </div>
                    <div className="prog">
                      <div className="prog-fill" style={{ width:`${Math.min(100,Math.max(0,barW))}%`, background:i===0?'var(--green)':i>=ranked.length-2?'var(--red)':'var(--ac)' }}/>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <span style={{ fontSize:14, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:i===0?'var(--green)':i>=ranked.length-2?'var(--red)':'var(--tx)' }}>
                      {Number(val).toFixed(1)}{METRICS.find(m=>m.key===metric)?.unit&&<span style={{ fontSize:10, color:'var(--tx3)', marginLeft:2 }}>{METRICS.find(m=>m.key===metric)?.unit}</span>}
                    </span>
                    {isBetter ? <TrendingDown size={13} style={{ color:'var(--green)' }}/> : <TrendingUp size={13} style={{ color:'var(--red)' }}/>}
                    <span className={`badge badge-${d.pulse.risk_level==='KRITIK'?'red':d.pulse.risk_level==='RISKLI'?'amber':'green'}`} style={{ fontSize:9 }}>
                      {d.pulse.risk_level}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Radar */}
        <div className="card">
          <div className="card-h"><span className="card-title">Radar Karşılaştırması</span><span className="card-meta">İlk 4 restoran</span></div>
          <div style={{ padding:'16px 20px' }}>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--bdr)"/>
                <PolarAngleAxis dataKey="metric" tick={{ fill:'var(--tx3)', fontSize:11 }}/>
                <Tooltip contentStyle={{ background:'var(--s2)', border:'1px solid var(--bdr2)', borderRadius:10, fontSize:12 }}/>
                {data.slice(0,4).map((d:any,i:number) => (
                  <Radar key={d.restaurant.id}
                    name={d.restaurant.name.slice(0,8)}
                    dataKey={d.restaurant.name.slice(0,8)}
                    stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.08} strokeWidth={2}/>
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
