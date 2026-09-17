'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchAllPulseScores, fetchLatestSnapshots } from '@/lib/supabase-client'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot } from '@/data/seed/mock-data'
import { Zap, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

function riskMeta(level: string) {
  switch (level) {
    case 'KRITIK': return { color:'#f25757', glow:'rgba(242,87,87,0.35)', bg:'rgba(242,87,87,0.06)', border:'rgba(242,87,87,0.22)', label:'KRİTİK' }
    case 'RISKLI': return { color:'#f0a843', glow:'rgba(240,168,67,0.25)', bg:'rgba(240,168,67,0.06)', border:'rgba(240,168,67,0.20)', label:'RİSKLİ' }
    case 'YOGUN':  return { color:'#eaaa08', glow:'rgba(234,170,8,0.20)',  bg:'rgba(234,170,8,0.06)',  border:'rgba(234,170,8,0.18)',  label:'YOĞUN'  }
    default:       return { color:'#22d3a0', glow:'rgba(34,211,160,0.20)', bg:'rgba(34,211,160,0.05)', border:'rgba(34,211,160,0.16)', label:'NORMAL' }
  }
}

function StationBars({ stations }: { stations: Record<string,number> }) {
  const items = [
    { key:'grill',   label:'Grill',   icon:'🔥' },
    { key:'fryer',   label:'Fryer',   icon:'🍟' },
    { key:'packing', label:'Pack',    icon:'📦' },
    { key:'courier', label:'Kurye',   icon:'🛵' },
  ]
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {items.map(({ key, label, icon }) => {
        const val = stations[key] ?? 0
        const c = val >= 80 ? '#f25757' : val >= 60 ? '#f0a843' : '#22d3a0'
        return (
          <div key={key} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:13, flexShrink:0 }}>{icon}</span>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.35)', width:32, flexShrink:0 }}>{label}</span>
            <div style={{ flex:1, height:4, borderRadius:2, background:'rgba(255,255,255,0.07)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${val}%`, borderRadius:2, background:c, boxShadow:`0 0 6px ${c}`, transition:'width .8s ease' }}/>
            </div>
            <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:c, width:24, textAlign:'right', flexShrink:0 }}>{val}</span>
          </div>
        )
      })}
    </div>
  )
}

function Arc({ score, color }: { score: number; color: string }) {
  const r = 52, cx = 64, cy = 64, sw = 7
  const circ = 2 * Math.PI * r, arc = circ * 0.75
  const off = arc - (arc * Math.min(score, 100)) / 100
  return (
    <svg width={128} height={100} viewBox="0 0 128 128" style={{ overflow:'visible' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw}
        strokeDasharray={`${arc} ${circ}`} strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${arc} ${circ}`} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
        style={{ filter:`drop-shadow(0 0 10px ${color})`, transition:'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }}/>
      <text x={cx} y={cy+2} textAnchor="middle" dominantBaseline="middle"
        style={{ fill:color, fontSize:28, fontWeight:800, fontFamily:'JetBrains Mono,monospace', letterSpacing:'-2px' }}>
        {score}
      </text>
      <text x={cx} y={cy+22} textAnchor="middle"
        style={{ fill:'rgba(255,255,255,0.3)', fontSize:9, fontWeight:700, letterSpacing:'3px', textTransform:'uppercase', fontFamily:'Inter,sans-serif' }}>
        / 100
      </text>
    </svg>
  )
}

export default function TVPage() {
  const [tick, setTick] = useState(0)
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const [focusIdx, setFocusIdx] = useState(0)
  const [auto, setAuto] = useState(true)
  const [allData, setAllData] = useState<any[]>([])

  const load = useCallback(async () => {
    try {
      const [pulseRows, snapRows] = await Promise.all([fetchAllPulseScores(), fetchLatestSnapshots()])
      const pm = Object.fromEntries(pulseRows.map((p:any)=>[p.restaurant_id,p]))
      const sm = Object.fromEntries(snapRows.map((s:any)=>[s.restaurant_id,s]))
      const data = RESTAURANTS.map(r => ({
        restaurant: r,
        pulse: pm[r.id] ?? getPulseScore(r.id),
        snapshot: sm[r.id] ?? getSnapshot(r.id),
      })).sort((a:any,b:any)=>b.pulse.score-a.pulse.score)
      setAllData(data)
    } catch {
      setAllData(RESTAURANTS.map(r=>({ restaurant:r, pulse:getPulseScore(r.id), snapshot:getSnapshot(r.id) })).sort((a,b)=>b.pulse.score-a.pulse.score))
    }
  }, [])

  useEffect(() => {
    load()
    // Saat: her saniye
    const clock = setInterval(() => {
      setTick(p => p + 1)
      setTime(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDate(new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }))
    }, 1000)
    // Supabase: her 10 saniye bagımsız interval
    const refresh = setInterval(() => { load() }, 10000)
    return () => { clearInterval(clock); clearInterval(refresh) }
  }, [load])

  useEffect(() => {
    if (!auto || allData.length === 0) return
    const t = setInterval(() => setFocusIdx(i=>(i+1)%allData.length), 8000)
    return () => clearInterval(t)
  }, [auto, allData.length])

  if (allData.length === 0) return (
    <div style={{ minHeight:'100vh', background:'#030306', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'rgba(255,255,255,0.3)', fontSize:14 }}>Yükleniyor…</div>
    </div>
  )

  const focused = allData[focusIdx % allData.length]
  const fm = riskMeta(focused.pulse.risk_level)
  const stations = (focused.pulse.station_scores as unknown) as Record<string,number> ?? {}
  const byRisk = {
    KRITIK: allData.filter((d:any)=>d.pulse.risk_level==='KRITIK').length,
    RISKLI: allData.filter((d:any)=>d.pulse.risk_level==='RISKLI').length,
    YOGUN:  allData.filter((d:any)=>d.pulse.risk_level==='YOGUN').length,
    NORMAL: allData.filter((d:any)=>d.pulse.risk_level==='NORMAL').length,
  }
  const avgScore = Math.round(allData.reduce((s:number,d:any)=>s+d.pulse.score,0)/allData.length)
  const totalOrders = allData.reduce((s:number,d:any)=>s+(d.snapshot?.open_orders??d.pulse.open_orders??0),0)

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', userSelect:'none',
      background:'#030306', fontFamily:'Inter,system-ui,sans-serif', position:'relative' }}>

      {/* Ambient glow */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', top:'-10%', left:'15%', width:500, height:500, borderRadius:'50%',
          background:focused.pulse.risk_level==='KRITIK'?'rgba(242,87,87,0.12)':focused.pulse.risk_level==='RISKLI'?'rgba(240,168,67,0.10)':'rgba(34,211,160,0.08)',
          filter:'blur(80px)', transition:'background 2s ease' }}/>
        <div style={{ position:'absolute', bottom:'-10%', right:'15%', width:400, height:400, borderRadius:'50%',
          background:'rgba(124,106,247,0.08)', filter:'blur(80px)' }}/>
        {/* Grid */}
        <div style={{ position:'absolute', inset:0,
          backgroundImage:'linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)',
          backgroundSize:'64px 64px' }}/>
      </div>

      {/* Header */}
      <header style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 40px', height:72, borderBottom:'1px solid rgba(255,255,255,0.05)',
        background:'rgba(3,3,6,0.85)', backdropFilter:'blur(24px)' }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:42, height:42, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
            background:'linear-gradient(135deg,#7c6af7,#5b4de0)', boxShadow:'0 0 24px rgba(124,106,247,0.5)' }}>
            <Zap size={20} color="#fff" strokeWidth={2.5}/>
          </div>
          <div>
            <p style={{ fontSize:17, fontWeight:800, color:'#fff', letterSpacing:'-.3px', lineHeight:1.2 }}>Mutfak Nabzı</p>
            <p style={{ fontSize:10, color:'rgba(255,255,255,0.25)', letterSpacing:'3px', textTransform:'uppercase' }}>TAB Gıda · TV Modu</p>
          </div>
        </div>

        {/* Risk sayaçları */}
        <div style={{ display:'flex', alignItems:'center', gap:32 }}>
          {[
            { label:'KRİTİK', count:byRisk.KRITIK, color:'#f25757' },
            { label:'RİSKLİ', count:byRisk.RISKLI, color:'#f0a843' },
            { label:'YOĞUN',  count:byRisk.YOGUN,  color:'#eaaa08' },
            { label:'NORMAL', count:byRisk.NORMAL,  color:'#22d3a0' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ textAlign:'center' }}>
              <p style={{ fontSize:32, fontWeight:800, fontFamily:'JetBrains Mono,monospace', color, lineHeight:1,
                textShadow:`0 0 20px ${color}60` }}>{count}</p>
              <p style={{ fontSize:9, color:'rgba(255,255,255,0.25)', letterSpacing:'2px', textTransform:'uppercase', marginTop:3 }}>{label}</p>
            </div>
          ))}
          <div style={{ width:1, height:40, background:'rgba(255,255,255,0.08)' }}/>
          <div style={{ textAlign:'center' }}>
            <p style={{ fontSize:32, fontWeight:800, fontFamily:'JetBrains Mono,monospace', color:'#fff', lineHeight:1 }}>{avgScore}</p>
            <p style={{ fontSize:9, color:'rgba(255,255,255,0.25)', letterSpacing:'2px', textTransform:'uppercase', marginTop:3 }}>ORT. NABIZ</p>
          </div>
        </div>

        {/* Saat */}
        <div style={{ textAlign:'right' }}>
          <p style={{ fontSize:26, fontWeight:800, fontFamily:'JetBrains Mono,monospace', color:'#fff', letterSpacing:'-1px' }}>{time}</p>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:2 }}>{date}</p>
        </div>
      </header>

      {/* Main */}
      <main style={{ position:'relative', zIndex:10, flex:1, display:'flex', gap:20, padding:'20px 24px', overflow:'hidden' }}>

        {/* Sol — Focus kart */}
        <div style={{ width:300, flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
          <p style={{ fontSize:10, color:'rgba(255,255,255,0.2)', letterSpacing:'3px', textTransform:'uppercase' }}>
            ODAK · {auto?'OTOMATİK':'MANUEL'}
          </p>

          <div style={{ flex:1, borderRadius:20, border:`1px solid ${fm.border}`, padding:'24px 20px',
            background:fm.bg, boxShadow:`0 0 40px ${fm.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
            display:'flex', flexDirection:'column', gap:16, position:'relative', overflow:'hidden' }}>

            {/* Top glow line */}
            <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
              background:`linear-gradient(90deg,transparent,${fm.color}80,transparent)` }}/>

            {/* Kritik ping */}
            {focused.pulse.risk_level === 'KRITIK' && (
              <div style={{ position:'absolute', top:16, right:16 }}>
                <div style={{ position:'relative', width:12, height:12 }}>
                  <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'#f25757',
                    animation:'ping 1.2s ease-out infinite', opacity:.6 }}/>
                  <div style={{ width:12, height:12, borderRadius:'50%', background:'#f25757',
                    boxShadow:'0 0 12px rgba(242,87,87,0.9)' }}/>
                </div>
              </div>
            )}

            {/* Brand + Name */}
            <div>
              <p style={{ fontSize:10, color:'rgba(255,255,255,0.3)', letterSpacing:'2px', textTransform:'uppercase', marginBottom:6 }}>
                {focused.restaurant.brand === 'BURGER_KING' ? '🍔 BURGER KING' : '🍗 POPEYES'}
              </p>
              <p style={{ fontSize:22, fontWeight:800, color:'#fff', letterSpacing:'-.4px', lineHeight:1.2 }}>
                {focused.restaurant.name.replace('Burger King ','').replace('Popeyes ','')}
              </p>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginTop:4 }}>{focused.restaurant.district} · {focused.restaurant.region}</p>
            </div>

            {/* Arc gauge */}
            <div style={{ display:'flex', justifyContent:'center' }}>
              <Arc score={focused.pulse.score} color={fm.color}/>
            </div>

            {/* KPI row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { label:'Açık Sipariş', value:focused.pulse.open_orders, alert:focused.pulse.open_orders>25 },
                { label:'Hazırlama', value:`${(focused.pulse.avg_prep_time||0).toFixed(1)} dk`, alert:(focused.pulse.avg_prep_time||0)>10 },
              ].map(({ label, value, alert }) => (
                <div key={label} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                  <p style={{ fontSize:20, fontWeight:800, fontFamily:'JetBrains Mono,monospace', color:alert?'#f25757':'#fff', letterSpacing:'-.03em', lineHeight:1 }}>{value}</p>
                  <p style={{ fontSize:9, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'1.5px', marginTop:4 }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Station bars */}
            <StationBars stations={stations}/>

            {/* Signals */}
            {(focused.pulse.top_signals?.length??0) > 0 && (
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:12, display:'flex', flexDirection:'column', gap:5 }}>
                {focused.pulse.top_signals.slice(0,2).map((s:string,i:number)=>(
                  <p key={i} style={{ fontSize:11, color:fm.color, lineHeight:1.4 }}>◆ {s}</p>
                ))}
              </div>
            )}
          </div>

          {/* Kontroller */}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setAuto(p=>!p)}
              style={{ flex:1, padding:'10px', borderRadius:10, border:`1px solid ${auto?'rgba(124,106,247,0.3)':'rgba(255,255,255,0.08)'}`,
                background:auto?'rgba(124,106,247,0.10)':'rgba(255,255,255,0.03)',
                color:auto?'#7c6af7':'rgba(255,255,255,0.3)', fontSize:12, fontWeight:600, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
              {auto?<><Pause size={12}/> Durdur</>:<><Play size={12}/> Otomatik</>}
            </button>
            <button onClick={()=>{ setFocusIdx(i=>(i-1+allData.length)%allData.length); setAuto(false) }}
              style={{ width:40, height:40, borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', color:'rgba(255,255,255,0.35)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronLeft size={16}/>
            </button>
            <button onClick={()=>{ setFocusIdx(i=>(i+1)%allData.length); setAuto(false) }}
              style={{ width:40, height:40, borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', color:'rgba(255,255,255,0.35)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ChevronRight size={16}/>
            </button>
          </div>
        </div>

        {/* Sağ — Grid */}
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(5,1fr)', gridTemplateRows:'repeat(2,1fr)', gap:12, overflow:'hidden' }}>
          {allData.map((d:any, i:number) => {
            const m = riskMeta(d.pulse.risk_level)
            const isFoc = i === focusIdx % allData.length
            const sts = (d.pulse.station_scores as unknown) as Record<string,number> ?? {}
            return (
              <button key={d.restaurant.id}
                onClick={()=>{ setFocusIdx(i); setAuto(false) }}
                style={{ borderRadius:14, border:`1px solid ${isFoc?m.border:'rgba(255,255,255,0.06)'}`,
                  background:isFoc?m.bg:'rgba(13,13,20,0.85)',
                  boxShadow:isFoc?`0 0 24px ${m.glow}`:'none',
                  transform:isFoc?'scale(1.02)':'scale(1)',
                  transition:'all .4s ease', padding:'14px', textAlign:'left', cursor:'pointer',
                  position:'relative', overflow:'hidden' }}>
                {isFoc && <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
                  background:`linear-gradient(90deg,transparent,${m.color}80,transparent)` }}/>}

                {d.pulse.risk_level === 'KRITIK' && (
                  <div style={{ position:'absolute', top:10, right:10, width:8, height:8, borderRadius:'50%',
                    background:'#f25757', boxShadow:'0 0 8px rgba(242,87,87,0.9)', animation:'ping 1.5s ease-out infinite' }}/>
                )}

                <p style={{ fontSize:9, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:4 }}>
                  {d.restaurant.district}
                </p>
                <p style={{ fontSize:13, fontWeight:700, color:'#fff', lineHeight:1.2, marginBottom:10, paddingRight:12,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {d.restaurant.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.')}
                </p>

                <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:10 }}>
                  <div>
                    <p style={{ fontSize:36, fontWeight:800, fontFamily:'JetBrains Mono,monospace', lineHeight:1, color:m.color,
                      textShadow:`0 0 16px ${m.color}60` }}>{d.pulse.score}</p>
                    <p style={{ fontSize:9, fontWeight:700, color:m.color, letterSpacing:'2px', textTransform:'uppercase', marginTop:3 }}>{m.label}</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:12, fontFamily:'JetBrains Mono,monospace', color:'rgba(255,255,255,0.4)' }}>{d.pulse.open_orders} açık</p>
                    <p style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'rgba(255,255,255,0.25)', marginTop:2 }}>{(d.pulse.avg_prep_time||0).toFixed(1)}dk</p>
                  </div>
                </div>

                {/* Mini station bars */}
                <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                  {['grill','fryer','packing','courier'].map(st => {
                    const val = sts[st] ?? 0
                    const c = val>=80?'#f25757':val>=60?'#f0a843':'#22d3a0'
                    return (
                      <div key={st} style={{ height:3, borderRadius:2, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${val}%`, background:c, transition:'width .8s ease',
                          boxShadow:val>=80?`0 0 4px ${c}`:'none' }}/>
                      </div>
                    )
                  })}
                </div>
              </button>
            )
          })}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ position:'relative', zIndex:10, borderTop:'1px solid rgba(255,255,255,0.05)',
        background:'rgba(3,3,6,0.92)', padding:'0 40px', height:48,
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ position:'relative', width:8, height:8 }}>
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'#22d3a0', animation:'ping 2.5s ease-out infinite', opacity:.5 }}/>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#22d3a0', boxShadow:'0 0 6px rgba(34,211,160,0.8)' }}/>
          </div>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>Supabase · Her 10 saniyede güncelleniyor</span>
        </div>
        <div style={{ display:'flex', gap:24 }}>
          {[
            { label:'Toplam Açık Sipariş', value:String(totalOrders) },
            { label:'Kritik Restoran', value:String(byRisk.KRITIK) },
            { label:'Tick', value:`#${tick}` },
          ].map(({ label, value }) => (
            <span key={label} style={{ fontSize:11, color:'rgba(255,255,255,0.2)' }}>
              {label}: <strong style={{ color:'rgba(255,255,255,0.4)', fontFamily:'JetBrains Mono,monospace' }}>{value}</strong>
            </span>
          ))}
        </div>
        <a href="/overview" style={{ fontSize:11, color:'rgba(255,255,255,0.2)', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
          <ChevronLeft size={12}/> Dashboard
        </a>
      </footer>

      <style>{`
        @keyframes ping { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.5);opacity:0} }
      `}</style>
    </div>
  )
}
