'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchRestaurants, fetchAllPulseScores } from '@/lib/supabase-client'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore } from '@/data/seed/mock-data'
import { getRiskConfig } from '@/lib/utils'
import { Store, MapPin, Wifi, ExternalLink, UtensilsCrossed, AlertCircle } from 'lucide-react'
import Link from 'next/link'

type RiskFilter = 'ALL' | 'KRITIK' | 'RISKLI' | 'YOGUN' | 'NORMAL'

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [filter, setFilter] = useState<RiskFilter>('ALL')
  const [brandFilter, setBrandFilter] = useState<'ALL'|'BURGER_KING'|'POPEYES'>('ALL')

  const load = useCallback(async () => {
    try {
      const [restRows, pulseRows] = await Promise.all([fetchRestaurants(), fetchAllPulseScores()])
      const pm = Object.fromEntries(pulseRows.map((p:any) => [p.restaurant_id, p]))
      const merged: any[] = restRows.length > 0
        ? restRows.map((r:any) => ({ ...r, ...(pm[r.id] ? { score:pm[r.id].score, risk_level:pm[r.id].risk_level, open_orders:pm[r.id].open_orders, avg_prep_time:pm[r.id].avg_prep_time, courier_wait:pm[r.id].courier_wait } : { score:0, risk_level:'NORMAL', open_orders:0 }) }))
        : RESTAURANTS.map(r => { const p = pm[r.id] ?? getPulseScore(r.id); return { ...r, is_active:true, score:p.score, risk_level:p.risk_level, open_orders:p.open_orders, avg_prep_time:p.avg_prep_time, courier_wait:p.courier_wait } })
      merged.sort((a,b) => b.score - a.score)
      setRestaurants(merged)
      setIsLive(restRows.length > 0 && pulseRows.length > 0)
    } catch {
      setRestaurants(RESTAURANTS.map(r => { const p = getPulseScore(r.id); return { ...r, is_active:true, score:p.score, risk_level:p.risk_level, open_orders:p.open_orders, avg_prep_time:p.avg_prep_time, courier_wait:p.courier_wait } }))
      setIsLive(false)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const shown = restaurants
    .filter(r => filter === 'ALL' || r.risk_level === filter)
    .filter(r => brandFilter === 'ALL' || r.brand === brandFilter)

  const cnt = {
    total: restaurants.length,
    bk: restaurants.filter(r=>r.brand==='BURGER_KING').length,
    pop: restaurants.filter(r=>r.brand==='POPEYES').length,
    kritik: restaurants.filter(r=>r.risk_level==='KRITIK').length,
  }

  return (
    <div className="dm">
      <Topbar title="Restoranlar" subtitle="Aktif lokasyonlar · anlık durum"
        action={
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20,
            background:isLive?'var(--green2)':'var(--s2)',
            border:`1px solid ${isLive?'var(--green-ln)':'var(--bdr)'}` }}>
            <Wifi size={10} style={{ color:isLive?'var(--green)':'var(--tx3)' }}/>
            <span style={{ fontSize:10, color:isLive?'var(--green)':'var(--tx3)' }}>{isLive?'Supabase':'Demo'}</span>
          </div>
        }
      />

      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:16 }}>

        {/* KPI */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,160px),1fr))', gap:12 }}>
          {[
            { label:'Toplam', value:cnt.total, color:'var(--ac)',   bg:'var(--ac2)',    Icon:UtensilsCrossed },
            { label:'Burger King', value:cnt.bk, color:'var(--blue)', bg:'var(--blue2)', Icon:Store },
            { label:'Popeyes', value:cnt.pop, color:'var(--amber)', bg:'var(--amber2)', Icon:Store },
            { label:'Kritik', value:cnt.kritik, color:cnt.kritik>0?'var(--red)':'var(--green)', bg:cnt.kritik>0?'var(--red2)':'var(--green2)', Icon:AlertCircle },
          ].map(({ label, value, color, bg, Icon }) => (
            <div key={label} className="kpi" style={{ borderLeft:`2.5px solid ${color}` }}>
              <div style={{ position:'absolute', top:0, right:0, width:60, height:60, background:`radial-gradient(circle at top right,${bg},transparent 70%)`, pointerEvents:'none' }}/>
              <div style={{ width:30, height:30, borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                <Icon size={13} style={{ color }} strokeWidth={1.9}/>
              </div>
              <p className="kpi-label">{label}</p>
              <p className="kpi-value" style={{ fontSize:24, color }}>{loading?'—':value}</p>
            </div>
          ))}
        </div>

        {/* Filtreler */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {/* Risk filter */}
          <div className="tabs" style={{ borderRadius:10, flex:'none' }}>
            {(['ALL','KRITIK','RISKLI','YOGUN','NORMAL'] as RiskFilter[]).map(f => (
              <button key={f} className={`tab ${filter===f?'active':''}`} onClick={()=>setFilter(f)} style={{ padding:'6px 12px', fontSize:12 }}>
                {f==='ALL'?'Tümü':f}
                {f!=='ALL' && <span style={{ marginLeft:5, fontSize:10, fontFamily:'JetBrains Mono,monospace', background:filter===f?'var(--ac2)':'var(--s3)', color:filter===f?'var(--ac)':'var(--tx3)', padding:'1px 6px', borderRadius:5 }}>
                  {restaurants.filter(r=>r.risk_level===f).length}
                </span>}
              </button>
            ))}
          </div>
          {/* Brand filter */}
          <div style={{ display:'flex', gap:6 }}>
            {(['ALL','BURGER_KING','POPEYES'] as const).map(b => (
              <button key={b} onClick={()=>setBrandFilter(b)}
                style={{ padding:'6px 12px', borderRadius:8, fontSize:12, border:`1px solid ${brandFilter===b?'var(--bdr2)':'var(--bdr)'}`,
                  background:brandFilter===b?'var(--s2)':'transparent', color:brandFilter===b?'var(--tx)':'var(--tx3)', cursor:'pointer' }}>
                {b==='ALL'?'Tüm Marka':b==='BURGER_KING'?'Burger King':'Popeyes'}
              </button>
            ))}
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
            <div style={{ width:20, height:20, border:'2px solid var(--s4)', borderTopColor:'var(--ac)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {shown.map((r, i) => {
              const rc = getRiskConfig(r.risk_level)
              const isBK = r.brand === 'BURGER_KING'
              return (
                <Link href={`/restaurants/${r.id}`} key={r.id} style={{ textDecoration:'none' }}>
                  <div className="card" style={{
                    display:'flex', alignItems:'center', gap:14, padding:'14px 18px',
                    borderLeft:`3px solid ${r.risk_level==='KRITIK'?rc.colorHex:'transparent'}`,
                    cursor:'pointer', animationDelay:`${i*20}ms`,
                    transition:'border-color .15s, transform .15s, box-shadow .15s',
                  }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateX(2px)'; (e.currentTarget as HTMLElement).style.borderColor=rc.colorHex}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.borderColor=r.risk_level==='KRITIK'?rc.colorHex:'transparent'}}>

                    {/* Rank */}
                    <span style={{ fontSize:12, fontFamily:'JetBrains Mono,monospace', color:'var(--tx3)', width:18, flexShrink:0, textAlign:'center' }}>{i+1}</span>

                    {/* Icon */}
                    <div style={{ width:36, height:36, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                      background:isBK?'var(--blue2)':'var(--amber2)',
                      border:`1px solid ${isBK?'var(--blue-ln)':'var(--amber-ln)'}` }}>
                      <Store size={15} style={{ color:isBK?'var(--blue)':'var(--amber)' }}/>
                    </div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:isBK?'var(--blue)':'var(--amber)', letterSpacing:'.06em' }}>
                          {isBK?'BURGER KING':'POPEYES'}
                        </span>
                      </div>
                      <p style={{ fontSize:13.5, fontWeight:600, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', letterSpacing:'-.15px' }}>
                        {r.name.replace('Burger King ','').replace('Popeyes ','')}
                      </p>
                      <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:3 }}>
                        <MapPin size={10} style={{ color:'var(--tx3)', flexShrink:0 }}/>
                        <span style={{ fontSize:11, color:'var(--tx3)' }}>{r.district} · {r.region}</span>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div style={{ display:'flex', alignItems:'center', gap:16, flexShrink:0 }}>
                      <div style={{ textAlign:'center' }}>
                        <p style={{ fontSize:10, color:'var(--tx3)', marginBottom:2 }}>Sipariş</p>
                        <p style={{ fontSize:15, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)' }}>{r.open_orders}</p>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <p style={{ fontSize:10, color:'var(--tx3)', marginBottom:2 }}>Hazır. dk</p>
                        <p style={{ fontSize:13, fontWeight:600, fontFamily:'JetBrains Mono,monospace', color:'var(--tx2)' }}>{(r.avg_prep_time??0).toFixed(1)}</p>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <p style={{ fontSize:10, color:'var(--tx3)', marginBottom:2 }}>Nabız</p>
                        <p style={{ fontSize:22, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:rc.colorHex, letterSpacing:'-.04em' }}>{r.score}</p>
                      </div>
                      <span className={`badge badge-${r.risk_level==='KRITIK'?'red':r.risk_level==='RISKLI'?'amber':r.risk_level==='YOGUN'?'amber':'green'}`}>
                        {r.risk_level}
                      </span>
                      <ExternalLink size={13} style={{ color:'var(--tx3)' }}/>
                    </div>
                  </div>
                </Link>
              )
            })}
            {shown.length === 0 && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 20px', background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:14 }}>
                <UtensilsCrossed size={32} style={{ color:'var(--tx3)', marginBottom:12, opacity:.4 }}/>
                <p style={{ fontSize:14, color:'var(--tx2)' }}>Bu filtreye uygun restoran yok</p>
              </div>
            )}
          </div>
        )}

        {!loading && (
          <p style={{ fontSize:11, color:'var(--tx3)' }}>{shown.length} restoran görüntüleniyor · {isLive?'Supabase bağlı':'Demo verisi'}</p>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
