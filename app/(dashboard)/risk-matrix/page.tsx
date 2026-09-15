'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore } from '@/data/seed/mock-data'
import { getComplaintSummary } from '@/data/seed/complaints'
import { getRevenueSnapshot } from '@/data/seed/revenue'
import { getRiskConfig } from '@/lib/utils'

const QUADRANTS = [
  { x:0,   y:0.5, w:0.5, h:0.5, label:'İzle',        desc:'Yüksek etki, düşük olasılık',  color:'rgba(234,179,8,0.06)',  border:'rgba(234,179,8,0.14)'  },
  { x:0.5, y:0.5, w:0.5, h:0.5, label:'Acil Aksiyon', desc:'Yüksek etki, yüksek olasılık', color:'rgba(242,87,87,0.07)',  border:'rgba(242,87,87,0.14)'  },
  { x:0,   y:0,   w:0.5, h:0.5, label:'Kabul Et',     desc:'Düşük etki, düşük olasılık',  color:'rgba(23,178,106,0.05)', border:'rgba(23,178,106,0.10)' },
  { x:0.5, y:0,   w:0.5, h:0.5, label:'Azalt',        desc:'Düşük etki, yüksek olasılık', color:'rgba(249,115,22,0.05)', border:'rgba(249,115,22,0.12)' },
]

export default function RiskMatrixPage() {
  const [hovered, setHovered] = useState<string|null>(null)

  const data = RESTAURANTS.map(r => {
    const pulse = getPulseScore(r.id)
    const comp  = getComplaintSummary(r.id)
    const rev   = getRevenueSnapshot(r.id)
    const probability = pulse.score / 100
    const impact = Math.min(1, (rev.totalLostRevenue/5000 + comp.total/25) / 2)
    return { restaurant:r, pulse, comp, rev, probability, impact }
  })

  const W = 560, H = 380

  const LEGEND = [
    { label:'Acil Aksiyon', desc:'Hemen müdahale',   color:'var(--red)' },
    { label:'İzle',         desc:'Hazırlıklı bekle', color:'var(--yellow,#eab308)' },
    { label:'Azalt',        desc:'Riski minimize et', color:'var(--amber)' },
    { label:'Kabul Et',     desc:'Standart izleme',  color:'var(--green)' },
  ]

  return (
    <div className="dm">
      <Topbar title="Operasyonel Risk Matrisi" subtitle="Olasılık × Etki büyüklüğü"/>
      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:16 }}>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap:16, alignItems:'start' }}>
          {/* Matris */}
          <div className="card">
            <div className="card-h"><span className="card-title">Risk Matrisi</span><span className="card-meta">hover ile detay</span></div>
            <div style={{ padding:'16px 20px 20px' }}>
              <div style={{ position:'relative', paddingLeft:32, paddingBottom:28 }}>
                <p style={{ position:'absolute', left:0, top:'50%', transform:'translateY(-50%) rotate(-90deg)', fontSize:9, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.1em', whiteSpace:'nowrap', transformOrigin:'center' }}>
                  Etki Büyüklüğü →
                </p>
                <p style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', fontSize:9, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.1em' }}>
                  Oluşma Olasılığı →
                </p>
                <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:'visible', display:'block' }}>
                  {QUADRANTS.map((q,i) => (
                    <g key={i}>
                      <rect x={q.x*W} y={(1-q.y-q.h)*H} width={q.w*W} height={q.h*H} fill={q.color} stroke={q.border} strokeWidth="1" rx="4"/>
                      <text x={(q.x+q.w/2)*W} y={(1-q.y-q.h/2)*H-8} textAnchor="middle" fill="rgba(255,255,255,.35)" fontSize="14" fontWeight="700">{q.label}</text>
                      <text x={(q.x+q.w/2)*W} y={(1-q.y-q.h/2)*H+10} textAnchor="middle" fill="rgba(255,255,255,.18)" fontSize="10">{q.desc}</text>
                    </g>
                  ))}
                  <line x1={W/2} y1={0} x2={W/2} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="5 5"/>
                  <line x1={0} y1={H/2} x2={W} y2={H/2} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="5 5"/>
                  {[0,.25,.5,.75,1].map(v => (
                    <g key={v}>
                      <text x={v*W} y={H+16} textAnchor="middle" fill="rgba(255,255,255,.2)" fontSize="10">%{Math.round(v*100)}</text>
                      <text x={-6} y={(1-v)*H+4} textAnchor="end" fill="rgba(255,255,255,.2)" fontSize="10">%{Math.round(v*100)}</text>
                    </g>
                  ))}
                  {data.map(d => {
                    const cx = d.probability * W
                    const cy = (1 - d.impact) * H
                    const rc = getRiskConfig(d.pulse.risk_level)
                    const isH = hovered === d.restaurant.id
                    const r = isH ? 15 : 10
                    return (
                      <g key={d.restaurant.id} onMouseEnter={()=>setHovered(d.restaurant.id)} onMouseLeave={()=>setHovered(null)} style={{ cursor:'pointer' }}>
                        <circle cx={cx} cy={cy} r={r+6} fill={rc.colorHex+'18'}/>
                        <circle cx={cx} cy={cy} r={r} fill={rc.colorHex} opacity={isH?1:.85} style={{ filter:`drop-shadow(0 0 ${isH?10:5}px ${rc.colorHex}80)` }}/>
                        <text x={cx} y={cy} textAnchor="middle" dy=".35em" fill="white" fontSize={isH?9:7} fontWeight="700">
                          {d.restaurant.id.toUpperCase()}
                        </text>
                        {isH && (
                          <g>
                            <rect x={cx+16} y={cy-30} width={140} height={58} rx="8" fill="var(--s2)" stroke="var(--bdr2)" strokeWidth="1"/>
                            <text x={cx+24} y={cy-16} fill="rgba(255,255,255,.85)" fontSize="11" fontWeight="600">
                              {d.restaurant.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.')}
                            </text>
                            <text x={cx+24} y={cy+1} fill="rgba(255,255,255,.4)" fontSize="10">Nabız: {d.pulse.score} · {d.rev.totalLostRevenue.toLocaleString('tr-TR')} ₺</text>
                            <text x={cx+24} y={cy+15} fill="rgba(255,255,255,.4)" fontSize="10">Şikayet: {d.comp.total} · {d.pulse.risk_level}</text>
                          </g>
                        )}
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* Sağ panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* Legend */}
            <div className="card">
              <div className="card-h"><span className="card-title">Kadrant Rehberi</span></div>
              <div style={{ padding:'12px 20px', display:'flex', flexDirection:'column', gap:10 }}>
                {LEGEND.map(({ label, desc, color }) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:color, flexShrink:0 }}/>
                    <div>
                      <p style={{ fontSize:12.5, fontWeight:500, color:'var(--tx)' }}>{label}</p>
                      <p style={{ fontSize:11, color:'var(--tx3)' }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Öncelikli riskler */}
            <div className="card">
              <div className="card-h"><span className="card-title">Öncelikli Riskler</span></div>
              <div>
                {[...data].sort((a,b)=>(b.probability+b.impact)-(a.probability+a.impact)).slice(0,6).map((d,i) => {
                  const rc = getRiskConfig(d.pulse.risk_level)
                  return (
                    <div key={d.restaurant.id} className="row" style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--tx3)', width:16, flexShrink:0 }}>{i+1}</span>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:rc.colorHex, flexShrink:0 }}/>
                      <span style={{ fontSize:12.5, color:'var(--tx)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {d.restaurant.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.')}
                      </span>
                      <span style={{ fontSize:13, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:rc.colorHex, flexShrink:0 }}>{d.pulse.score}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
