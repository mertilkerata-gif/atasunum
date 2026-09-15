'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot } from '@/data/seed/mock-data'
import { getRevenueSnapshot } from '@/data/seed/revenue'
import { getComplaintSummary } from '@/data/seed/complaints'
import { getRiskConfig } from '@/lib/utils'
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'

const METRICS = [
  { key:'pulse',      label:'Nabız Skoru',   lower:true,  unit:'' },
  { key:'prep',       label:'Hazırlama dk',  lower:true,  unit:'dk' },
  { key:'courier',    label:'Kurye Bekleme', lower:true,  unit:'dk' },
  { key:'revenue',    label:'Ciro',          lower:false, unit:'₺' },
  { key:'complaints', label:'Şikayet',       lower:true,  unit:'' },
]

const BADGES: Record<string,{icon:string;label:string;color:string;bg:string}> = {
  fastest:   {icon:'⚡',label:'En Hızlı',   color:'var(--amber)',bg:'var(--amber2)'},
  calmest:   {icon:'🟢',label:'En Sakin',   color:'var(--green)',bg:'var(--green2)'},
  revenue:   {icon:'💰',label:'En Yüksek Ciro', color:'var(--amber)',bg:'var(--amber2)'},
  courier:   {icon:'🛵',label:'En Hızlı Kurye', color:'var(--ac)',bg:'var(--ac2)'},
  complaint: {icon:'💬',label:'En Az Şikayet',  color:'var(--blue)',bg:'var(--blue2)'},
}

export default function BenchmarkPage() {
  const [metric, setMetric] = useState<'pulse'|'prep'|'courier'|'revenue'|'complaints'>('pulse')

  const data = RESTAURANTS.map(r => {
    const pulse = getPulseScore(r.id)
    const snap  = getSnapshot(r.id)
    const rev   = getRevenueSnapshot(r.id)
    const comp  = getComplaintSummary(r.id)
    return { restaurant:r, pulse, snap, rev, comp,
      scores:{ pulse:pulse.score, prep:pulse.avg_prep_time, courier:pulse.courier_wait, revenue:rev.actualRevenue, complaints:comp.total },
      badges:[] as string[] }
  })

  // Badges ata
  const bestOf = (key: string, lower: boolean) => {
    const sorted = [...data].sort((a,b) => lower ? (a.scores as any)[key]-(b.scores as any)[key] : (b.scores as any)[key]-(a.scores as any)[key])
    return sorted[0]?.restaurant.id
  }
  const winners = { fastest:bestOf('prep',true), calmest:bestOf('pulse',true), revenue:bestOf('revenue',false), courier:bestOf('courier',true), complaint:bestOf('complaints',true) }
  data.forEach(d => { Object.entries(winners).forEach(([badge,id]) => { if(id===d.restaurant.id) d.badges.push(badge) }) })

  const isLower = METRICS.find(m=>m.key===metric)?.lower ?? true
  const ranked = [...data].sort((a,b) => isLower ? (a.scores as any)[metric]-(b.scores as any)[metric] : (b.scores as any)[metric]-(a.scores as any)[metric])
  const best = (ranked[0].scores as any)[metric]
  const worst = (ranked[ranked.length-1].scores as any)[metric]
  const avg = data.reduce((s,d)=>s+(d.scores as any)[metric],0)/data.length

  // Radar data
  const radarData = METRICS.map(m => ({
    metric: m.label,
    ...Object.fromEntries(data.slice(0,4).map(d => [d.restaurant.name.split(' ')[2]??d.restaurant.name.slice(0,8), Math.round((d.scores as any)[m.key])]))
  }))

  const COLORS = ['var(--ac)','var(--green)','var(--amber)','var(--blue)']

  return (
    <div className="dm">
      <Topbar title="Benchmark" subtitle="Restoran performans karşılaştırması"/>
      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Badge'ler */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,160px),1fr))', gap:10 }}>
          {Object.entries(BADGES).map(([key,b]) => {
            const winner = data.find(d=>d.badges.includes(key))
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
        <div className="tabs" style={{ borderRadius:'10px 10px 0 0' }}>
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
              <span>En iyi: <strong style={{ color:'var(--green)', fontFamily:'JetBrains Mono,monospace' }}>{best.toFixed(1)}</strong></span>
              <span>Ort: <strong style={{ color:'var(--tx2)', fontFamily:'JetBrains Mono,monospace' }}>{avg.toFixed(1)}</strong></span>
              <span>En kötü: <strong style={{ color:'var(--red)', fontFamily:'JetBrains Mono,monospace' }}>{worst.toFixed(1)}</strong></span>
            </div>
          </div>
          <div>
            {ranked.map((d, i) => {
              const val = (d.scores as any)[metric]
              const pct = Math.abs(val - avg) / (Math.abs(worst - best) || 1) * 100
              const isBetter = isLower ? val < avg : val > avg
              const barW = Math.min(100, ((val - Math.min(best,worst)) / (Math.abs(worst - best) || 1)) * 100)
              const finalBarW = isLower ? 100 - barW : barW
              const config = getRiskConfig(d.pulse.risk_level)
              return (
                <div key={d.restaurant.id} className="row" style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <span style={{ fontSize:12, fontFamily:'JetBrains Mono,monospace', color:'var(--tx3)', width:18, flexShrink:0 }}>{i+1}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                      <span style={{ fontSize:12.5, fontWeight:500, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {d.restaurant.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.')}
                      </span>
                      {d.badges.map(badge => (
                        <span key={badge} style={{ fontSize:14 }}>{BADGES[badge]?.icon}</span>
                      ))}
                    </div>
                    <div className="prog">
                      <div className="prog-fill" style={{ width:`${finalBarW}%`, background:i===0?'var(--green)':i>=ranked.length-2?'var(--red)':'var(--ac)' }}/>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <span style={{ fontSize:14, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:i===0?'var(--green)':i>=ranked.length-2?'var(--red)':'var(--tx)' }}>
                      {typeof val==='number'&&val>100?`${(val/1000).toFixed(0)}K`:val.toFixed(1)}
                      {METRICS.find(m=>m.key===metric)?.unit&&<span style={{ fontSize:10, color:'var(--tx3)', marginLeft:2 }}>{METRICS.find(m=>m.key===metric)?.unit}</span>}
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
                {data.slice(0,4).map((d,i) => (
                  <Radar key={d.restaurant.id}
                    name={d.restaurant.name.split(' ')[2]??d.restaurant.name.slice(0,8)}
                    dataKey={d.restaurant.name.split(' ')[2]??d.restaurant.name.slice(0,8)}
                    stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.08} strokeWidth={2}/>
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
