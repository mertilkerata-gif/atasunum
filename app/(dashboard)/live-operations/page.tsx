'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchAllPulseScores, fetchLatestSnapshots, fetchActiveOrders, subscribeToOrders, subscribeToPulseScores } from '@/lib/supabase-client'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot } from '@/data/seed/mock-data'
import { getRiskConfig } from '@/lib/utils'
import { PulseScore, OperationSnapshot } from '@/types'
import { Wifi, RefreshCw } from 'lucide-react'

interface LiveData {
  restaurant: typeof RESTAURANTS[0]
  pulse: PulseScore
  snapshot: OperationSnapshot
  activeOrders: number
}

export default function LiveOperationsPage() {
  const [data, setData] = useState<LiveData[]>([])
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)

  const load = useCallback(async () => {
    try {
      const [pulseRows, snapRows, orderRows] = await Promise.all([
        fetchAllPulseScores(), fetchLatestSnapshots(), fetchActiveOrders()
      ])
      const pm = Object.fromEntries(pulseRows.map((p:any)=>[p.restaurant_id,p]))
      const sm = Object.fromEntries(snapRows.map((s:any)=>[s.restaurant_id,s]))
      const oc = orderRows.reduce((acc:Record<string,number>,o:any)=>{ acc[o.restaurant_id]=(acc[o.restaurant_id]||0)+1; return acc },{})

      const result: LiveData[] = RESTAURANTS.map(r => ({
        restaurant: r,
        pulse: (pm[r.id] ?? getPulseScore(r.id)) as PulseScore,
        snapshot: (sm[r.id] ?? getSnapshot(r.id)) as OperationSnapshot,
        activeOrders: oc[r.id] ?? pm[r.id]?.open_orders ?? getPulseScore(r.id).open_orders,
      })).sort((a,b)=>b.pulse.score-a.pulse.score)

      setData(result); setIsLive(pulseRows.length>0)
    } catch {
      setData(RESTAURANTS.map(r=>({ restaurant:r, pulse:getPulseScore(r.id), snapshot:getSnapshot(r.id), activeOrders:getPulseScore(r.id).open_orders })))
      setIsLive(false)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    const ps = subscribeToPulseScores(load)
    const os = subscribeToOrders(load)
    return () => { clearInterval(t); ps.unsubscribe(); os.unsubscribe() }
  }, [load])

  const critCount = data.filter(d=>d.pulse.risk_level==='KRITIK').length

  return (
    <div className="dm">
      <Topbar title="Canlı Operasyon" subtitle="5 sn güncelleme · Supabase Realtime"
        action={
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {critCount > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background:'var(--red2)', border:'1px solid rgba(242,87,87,.22)' }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--red)', animation:'pulse 1.5s ease-in-out infinite' }}/>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--red)' }}>{critCount} Kritik</span>
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20,
              background:isLive?'var(--green2)':'var(--s2)', border:`1px solid ${isLive?'var(--green-ln)':'var(--bdr)'}` }}>
              <Wifi size={10} style={{ color:isLive?'var(--green)':'var(--tx3)' }}/>
              <span style={{ fontSize:10, color:isLive?'var(--green)':'var(--tx3)' }}>{isLive?'Canlı':'Demo'}</span>
            </div>
            <button onClick={load} style={{ width:30, height:30, borderRadius:8, background:'var(--s2)', border:'1px solid var(--bdr)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <RefreshCw size={12} style={{ color:'var(--tx3)' }}/>
            </button>
          </div>
        }
      />

      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:8 }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
            <div style={{ width:20, height:20, border:'2px solid var(--s4)', borderTopColor:'var(--ac)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
          </div>
        ) : data.map((d, i) => {
          const rc = getRiskConfig(d.pulse.risk_level)
          const stations = (d.pulse.station_scores as unknown) as Record<string,number> ?? {}
          const isKritik = d.pulse.risk_level === 'KRITIK'
          return (
            <div key={d.restaurant.id} className="card" style={{
              borderLeft:`3px solid ${isKritik?rc.colorHex:'transparent'}`,
              boxShadow:isKritik?`0 0 16px ${rc.colorHex}10`:'none',
              animationDelay:`${i*20}ms`,
            }}>
              <div style={{ padding:'12px 18px', display:'flex', alignItems:'center', gap:14 }}>
                {/* Score */}
                <div style={{ textAlign:'center', width:48, flexShrink:0 }}>
                  <p style={{ fontSize:22, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:rc.colorHex, letterSpacing:'-.04em', lineHeight:1 }}>{d.pulse.score}</p>
                  <p style={{ fontSize:8, textTransform:'uppercase', color:rc.colorHex, opacity:.7, marginTop:2 }}>{d.pulse.risk_level}</p>
                </div>

                <div style={{ width:1, height:36, background:'var(--bdr)', flexShrink:0 }}/>

                {/* Name */}
                <div style={{ width:'clamp(100px,18%,180px)', flexShrink:0, minWidth:0 }}>
                  <p style={{ fontSize:12.5, fontWeight:500, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {d.restaurant.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.')}
                  </p>
                  <p style={{ fontSize:10, color:'var(--tx3)', marginTop:2 }}>{d.restaurant.district}</p>
                </div>

                {/* Orders */}
                <div style={{ textAlign:'center', flexShrink:0 }}>
                  <p style={{ fontSize:17, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)', lineHeight:1 }}>{d.activeOrders}</p>
                  <p style={{ fontSize:9, color:'var(--tx3)', marginTop:2 }}>açık</p>
                </div>

                {/* Prep */}
                <div style={{ textAlign:'center', flexShrink:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, fontFamily:'JetBrains Mono,monospace', color:'var(--tx2)', lineHeight:1 }}>
                    {(d.snapshot?.avg_preparation_time ?? d.pulse.avg_prep_time ?? 0).toFixed(1)} dk
                  </p>
                  <p style={{ fontSize:9, color:'var(--tx3)', marginTop:2 }}>hazırlama</p>
                </div>

                {/* Station bars */}
                <div style={{ flex:1, display:'flex', gap:10, alignItems:'center', minWidth:0 }}>
                  {['grill','fryer','packing','courier'].map(st => {
                    const val = stations[st] ?? (d.snapshot as any)?.[`${st}_load`] ?? 0
                    const barColor = val > 80 ? 'var(--red)' : val > 60 ? 'var(--amber)' : 'var(--green)'
                    return (
                      <div key={st} style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:8, textTransform:'uppercase', color:'var(--tx3)', marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{st}</p>
                        <div className="prog">
                          <div className="prog-fill" style={{ width:`${val}%`, background:barColor }}/>
                        </div>
                        <p style={{ fontSize:8, color:barColor, marginTop:2, fontFamily:'JetBrains Mono,monospace' }}>{val}%</p>
                      </div>
                    )
                  })}
                </div>

                {/* Nabız bar */}
                <div style={{ width:80, flexShrink:0 }}>
                  <div style={{ height:6, borderRadius:3, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:3, width:`${d.pulse.score}%`, background:rc.colorHex, opacity:.85, transition:'width 1s ease' }}/>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
