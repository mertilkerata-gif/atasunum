'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { MEMORY_ENTRIES, LEARNED_PATTERNS } from '@/data/seed/memory'
import { getRiskConfig } from '@/lib/utils'
import { Brain, TrendingDown, CheckCircle2, Zap, ChevronRight } from 'lucide-react'

const ACTION_COLORS: Record<string,string> = {
  STAFF_ADD:'var(--ac)', PREP_ADJUST:'var(--amber)', COURIER_PRIORITY:'var(--green)',
  STOCK_REFILL:'var(--yellow,#eab308)', PROCESS_CHANGE:'#c084fc',
}
const ACTION_LABELS: Record<string,string> = {
  STAFF_ADD:'Personel Takviye', PREP_ADJUST:'Hazırlık Ayarı',
  COURIER_PRIORITY:'Kurye Öncelik', STOCK_REFILL:'Stok İkmal', PROCESS_CHANGE:'Süreç Değişimi',
}

export default function MemoryPage() {
  const [tab, setTab] = useState<'history'|'patterns'>('history')

  const avgImprovement = Math.round(MEMORY_ENTRIES.reduce((s,m)=>s+m.improvement,0)/MEMORY_ENTRIES.length)
  const aiRecommendedCount = MEMORY_ENTRIES.filter(m=>m.aiRecommended).length
  const totalPulseReduced = MEMORY_ENTRIES.reduce((s,m)=>s+(m.pulseBefore-m.pulseAfter),0)

  const kpis = [
    { label:'Toplam Aksiyon',  value:MEMORY_ENTRIES.length, sub:'kayıtlı',              color:'var(--ac)',    bg:'var(--ac2)',    Icon:CheckCircle2 },
    { label:'Ort. İyileşme',   value:`%${avgImprovement}`,  sub:'metrik düşüşü',        color:'var(--green)', bg:'var(--green2)', Icon:TrendingDown },
    { label:'AI Önerisi',      value:`%${Math.round(aiRecommendedCount/MEMORY_ENTRIES.length*100)}`, sub:`${aiRecommendedCount} aksiyondan`, color:'var(--ac)', bg:'var(--ac2)', Icon:Zap },
    { label:'Öğrenilen Örüntü',value:LEARNED_PATTERNS.length, sub:'aktif pattern',     color:'var(--amber)', bg:'var(--amber2)', Icon:Brain },
  ]

  return (
    <div className="dm">
      <Topbar title="Operasyonel Hafıza" subtitle="Uygulanan aksiyonlar · Öğrenilen örüntüler"/>
      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:16 }}>

        {/* KPI */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,180px),1fr))', gap:12 }}>
          {kpis.map(({ label, value, sub, color, bg, Icon }) => (
            <div key={label} className="kpi" style={{ borderLeft:`2.5px solid ${color}` }}>
              <div style={{ width:30, height:30, borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                <Icon size={13} style={{ color }} strokeWidth={1.9}/>
              </div>
              <p className="kpi-label">{label}</p>
              <p className="kpi-value" style={{ fontSize:22, color }}>{value}</p>
              <p className="kpi-sub">{sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ borderRadius:10, width:'fit-content' }}>
          {[{ id:'history', label:'📋 Aksiyon Geçmişi' }, { id:'patterns', label:'🧠 Örüntüler' }].map(t => (
            <button key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id as any)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* History */}
        {tab === 'history' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {MEMORY_ENTRIES.map(entry => {
              const color = ACTION_COLORS[entry.actionType] ?? 'var(--ac)'
              const scoreDiff = entry.pulseBefore - entry.pulseAfter
              const beforeConfig = getRiskConfig(entry.pulseBefore >= 80 ? 'KRITIK' : entry.pulseBefore >= 60 ? 'RISKLI' : entry.pulseBefore >= 40 ? 'YOGUN' : 'NORMAL')
              const afterConfig  = getRiskConfig(entry.pulseAfter  >= 80 ? 'KRITIK' : entry.pulseAfter  >= 60 ? 'RISKLI' : entry.pulseAfter  >= 40 ? 'YOGUN' : 'NORMAL')
              return (
                <div key={entry.id} className="card">
                  <div style={{ padding:'16px 20px', display:'flex', gap:16 }}>
                    {/* Timeline */}
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0, paddingTop:4 }}>
                      <div style={{ width:12, height:12, borderRadius:'50%', background:color, boxShadow:`0 0 8px ${color}60`, flexShrink:0 }}/>
                      <div style={{ width:1, flex:1, minHeight:40, background:'var(--bdr)' }}/>
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                      {/* Header */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, flexWrap:'wrap', gap:6 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                          <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px', borderRadius:20, background:`${color}18`, color, border:`1px solid ${color}30` }}>
                            {ACTION_LABELS[entry.actionType]}
                          </span>
                          <span style={{ fontSize:12, color:'var(--tx2)' }}>{entry.restaurantName}</span>
                          {entry.aiRecommended && (
                            <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:5, background:'var(--ac2)', color:'var(--ac)', border:'1px solid rgba(124,106,247,.2)' }}>
                              AI Önerisi
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--tx3)' }}>{entry.date} {entry.time}</span>
                      </div>

                      {/* Aksiyon */}
                      <p style={{ fontSize:13.5, fontWeight:600, color:'var(--tx)', marginBottom:12, letterSpacing:'-.15px' }}>{entry.action}</p>

                      {/* Before → After */}
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, flexWrap:'wrap' }}>
                        <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--red2)', border:'1px solid rgba(242,87,87,.18)', minWidth:110 }}>
                          <p style={{ fontSize:9, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:3 }}>Öncesi · {entry.before.metric}</p>
                          <p style={{ fontSize:14, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--red)' }}>{entry.before.value}</p>
                        </div>
                        <ChevronRight size={16} style={{ color:'var(--tx3)', flexShrink:0 }}/>
                        <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--green2)', border:'1px solid rgba(23,178,106,.18)', minWidth:110 }}>
                          <p style={{ fontSize:9, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:3 }}>Sonrası · {entry.after.metric}</p>
                          <p style={{ fontSize:14, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--green)' }}>{entry.after.value}</p>
                        </div>
                        <div style={{ textAlign:'center' }}>
                          <p style={{ fontSize:20, fontWeight:700, color:'var(--green)' }}>↓%{entry.improvement}</p>
                          {scoreDiff > 0 && <p style={{ fontSize:10, color:'var(--tx3)' }}>Nabız ↓{scoreDiff}</p>}
                        </div>
                      </div>

                      {/* Nabız */}
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: entry.learnedPattern ? 8 : 0 }}>
                        <span style={{ fontSize:10, color:'var(--tx3)' }}>Nabız:</span>
                        <span style={{ fontSize:14, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:beforeConfig.colorHex }}>{entry.pulseBefore}</span>
                        <span style={{ color:'var(--tx3)', fontSize:12 }}>→</span>
                        <span style={{ fontSize:14, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:afterConfig.colorHex }}>{entry.pulseAfter}</span>
                        <span style={{ fontSize:10, color:'var(--tx3)' }}>— {entry.appliedBy}</span>
                      </div>

                      {entry.learnedPattern && (
                        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:9, background:'var(--amber2)', border:'1px solid rgba(240,168,67,.2)' }}>
                          <Brain size={12} style={{ color:'var(--amber)', flexShrink:0 }}/>
                          <span style={{ fontSize:11, color:'var(--tx2)' }}>Öğrenilen: {entry.learnedPattern}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Patterns */}
        {tab === 'patterns' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {LEARNED_PATTERNS.map(p => (
              <div key={p.id} className="card">
                <div style={{ padding:'18px 20px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14, gap:12 }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                        <Brain size={15} style={{ color:'var(--ac)' }}/>
                        <p style={{ fontSize:14, fontWeight:600, color:'var(--tx)', letterSpacing:'-.15px' }}>{p.pattern}</p>
                      </div>
                      <p style={{ fontSize:12, color:'var(--tx3)' }}>Tetikleyici: {p.trigger}</p>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <p style={{ fontSize:26, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--green)', letterSpacing:'-.04em' }}>%{p.successRate}</p>
                      <p style={{ fontSize:10, color:'var(--tx3)' }}>başarı oranı</p>
                    </div>
                  </div>

                  <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--ac2)', border:'1px solid rgba(124,106,247,.2)', marginBottom:14 }}>
                    <p style={{ fontSize:10, color:'var(--tx3)', marginBottom:5, textTransform:'uppercase', letterSpacing:'.06em' }}>Önerilen Aksiyon</p>
                    <p style={{ fontSize:13, color:'var(--tx)' }}>{p.recommendedAction}</p>
                  </div>

                  <div style={{ display:'flex', gap:20 }}>
                    {[
                      { label:'Uygulama', value:p.appliedCount+' kez' },
                      { label:'Ort. İyileşme', value:`%${p.avgImprovement}` },
                      { label:'Restoran', value:p.restaurants.length+' lokasyon' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p style={{ fontSize:10, color:'var(--tx3)', marginBottom:2 }}>{label}</p>
                        <p style={{ fontSize:13, fontWeight:600, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)' }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
