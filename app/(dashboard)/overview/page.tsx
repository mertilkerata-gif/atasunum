'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { RestaurantCard } from '@/components/cards/restaurant-card'
import { fetchAllPulseScores, fetchRestaurants, fetchLatestSnapshots } from '@/lib/supabase-client'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { RestaurantDashboard, RiskLevel } from '@/types'
import { RefreshCw, Wifi, WifiOff, AlertCircle, TrendingUp, UtensilsCrossed, Activity, Brain, FileText, CheckCircle2, X, Zap, TriangleAlert } from 'lucide-react'
import { getOpenAIKey } from '@/lib/config-store'
import { AIAutopilot } from '@/components/ai-autopilot'

const RISK_ORDER: Record<RiskLevel, number> = { KRITIK:0, RISKLI:1, YOGUN:2, NORMAL:3 }
type Filter = RiskLevel | 'ALL'

interface AIAnalysis {
  summary: string
  overall_risk: string
  critical_count: number
  key_findings: string[]
  recommendations: { restaurant_id:string; restaurant_name:string; priority:string; issue:string; actions:{text:string;expected_impact:string;time_to_impact:string}[] }[]
  auto_actions_taken: string[]
  report_text: string
}

export default function OverviewPage() {
  const [boards, setBoards] = useState<RestaurantDashboard[]>([])
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [refreshed, setRefreshed] = useState<Date | null>(null)

  // AI state
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [aiError, setAiError] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [aiTimestamp, setAiTimestamp] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [pulseRows, restRows, snapRows] = await Promise.all([
        fetchAllPulseScores(), fetchRestaurants(), fetchLatestSnapshots(),
      ])
      const pm: Record<string, any> = Object.fromEntries(pulseRows.map(p => [p.restaurant_id, p]))
      const sm: Record<string, any> = Object.fromEntries(snapRows.map(s => [s.restaurant_id, s]))
      const allRests: any[] = restRows.length > 0 ? restRows : RESTAURANTS
      const result: RestaurantDashboard[] = allRests.map(r => ({
        restaurant: r as RestaurantDashboard['restaurant'],
        pulse: {} as RestaurantDashboard['pulse'],
        snapshot: {} as RestaurantDashboard['snapshot'],
        predictions: [] as any,
        latest_recommendation: null as any,
        weather: null as any,
        hourly_forecast: [] as any,
      })).sort((a,b) => RISK_ORDER[a.pulse.risk_level]-RISK_ORDER[b.pulse.risk_level])
      setBoards(result); setIsLive(pulseRows.length>0); setRefreshed(new Date())
    } catch {
      const fb = RESTAURANTS.map(r => ({
        restaurant: r as RestaurantDashboard['restaurant'],
        pulse: {} as RestaurantDashboard['pulse'],
        snapshot: {} as RestaurantDashboard['snapshot'],
        predictions: [], latest_recommendation: null,
        weather: null, hourly_forecast: [],
      })).sort((a,b) => RISK_ORDER[a.pulse.risk_level]-RISK_ORDER[b.pulse.risk_level])
      setBoards(fb); setIsLive(false)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [load])

  const runAI = async () => {
    setAiLoading(true); setAiError('')
    try {
      const apiKey = getOpenAIKey()
      const res = await fetch('/api/ai-auto-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setAiError(data.error ?? 'Analiz başarısız')
      } else {
        setAiAnalysis(data.analysis)
        setAiTimestamp(data.timestamp)
      }
    } catch (e: any) {
      setAiError(e.message)
    } finally { setAiLoading(false) }
  }

  const shown = boards.filter(d => filter==='ALL' || d.pulse.risk_level===filter)
  const cnt = {
    KRITIK: boards.filter(d=>d.pulse.risk_level==='KRITIK').length,
    RISKLI: boards.filter(d=>d.pulse.risk_level==='RISKLI').length,
    YOGUN:  boards.filter(d=>d.pulse.risk_level==='YOGUN').length,
    NORMAL: boards.filter(d=>d.pulse.risk_level==='NORMAL').length,
  }
  const avg = boards.length ? Math.round(boards.reduce((s,d)=>s+d.pulse.score,0)/boards.length) : 0

  const kpis = [
    { label:'Ort. Nabız',     value:loading?'—':String(avg),          sub:'10 restoran',      color:avg>70?'var(--red)':avg>50?'var(--amber)':'var(--green)', iconBg:avg>70?'var(--red2)':avg>50?'var(--amber2)':'var(--green2)', Icon:Activity,         trend:null },
    { label:'Kritik',         value:loading?'—':String(cnt.KRITIK),    sub:'Acil müdahale',    color:'var(--red)',   iconBg:'var(--red2)',   Icon:AlertCircle,      trend:cnt.KRITIK>0?{v:`${cnt.KRITIK} acil`}:null },
    { label:'Riskli / Yoğun', value:loading?'—':String(cnt.RISKLI+cnt.YOGUN), sub:'İzleme',  color:'var(--amber)', iconBg:'var(--amber2)', Icon:TrendingUp,        trend:null },
    { label:'Normal',         value:loading?'—':String(cnt.NORMAL),    sub:'Standart',         color:'var(--green)', iconBg:'var(--green2)', Icon:UtensilsCrossed,  trend:null },
  ]

  const FILTERS: { key:Filter; label:string; count:number }[] = [
    { key:'ALL',    label:'Tümü',   count:boards.length },
    { key:'KRITIK', label:'Kritik', count:cnt.KRITIK },
    { key:'RISKLI', label:'Riskli', count:cnt.RISKLI },
    { key:'YOGUN',  label:'Yoğun',  count:cnt.YOGUN  },
    { key:'NORMAL', label:'Normal', count:cnt.NORMAL  },
  ]

  const riskBadge = (r:string) => r==='KRITIK'?'badge-red':r==='RISKLI'?'badge-amber':r==='HIGH'?'badge-red':r==='MEDIUM'?'badge-amber':'badge-green'

  return (
    <div className="dm">
      <Topbar title="Genel Bakış" subtitle="Tüm restoranlar · anlık nabız durumu"
        action={
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {aiAnalysis && (
              <button onClick={()=>setShowReport(true)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:9,
                  background:'linear-gradient(135deg,var(--ac),#5b4de0)', color:'#fff', border:'none',
                  fontSize:12, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 14px rgba(124,106,247,.35)' }}>
                <FileText size={12}/> AI Raporu
              </button>
            )}
            <button onClick={runAI} disabled={aiLoading}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:9,
                background: aiLoading ? 'var(--s2)' : 'var(--ac2)',
                border:`1px solid ${aiLoading?'var(--bdr)':'rgba(124,106,247,.3)'}`,
                color: aiLoading ? 'var(--tx3)' : 'var(--ac)',
                fontSize:12, fontWeight:600, cursor:aiLoading?'not-allowed':'pointer' }}>
              {aiLoading
                ? <><div style={{ width:11, height:11, border:'1.5px solid var(--bdr)', borderTopColor:'var(--ac)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> Analiz ediliyor…</>
                : <><Brain size={12}/> AI Analizi</>
              }
            </button>
            <button onClick={load} className="btn-ghost" style={{ padding:'5px 10px', fontSize:12 }}>
              <RefreshCw size={12}/>
            </button>
            <span className={`badge ${isLive?'badge-green':'badge-muted'}`} style={{ display:'flex', alignItems:'center', gap:4 }}>
              {isLive ? <Wifi size={9}/> : <WifiOff size={9}/>}
              {isLive ? 'Canlı' : 'Demo'}
            </span>
          </div>
        }
      />

      {/* AI Otopilot — sabit şerit, scroll dışında */}
      <div style={{ padding:'0 clamp(14px,3vw,24px)', flexShrink:0 }}>
        <AIAutopilot interval={30} onRefresh={load}/>
      </div>

      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:16 }}>

        {/* AI Error */}
        {aiError && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'var(--red2)', border:'1px solid var(--red-ln)', borderRadius:10 }}>
            <TriangleAlert size={15} style={{ color:'var(--red)', flexShrink:0 }}/>
            <p style={{ fontSize:12.5, color:'var(--tx2)', flex:1 }}>{aiError}</p>
            <button onClick={()=>setAiError('')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--tx3)' }}><X size={14}/></button>
          </div>
        )}

        {/* AI Analiz Paneli */}
        {aiAnalysis && (
          <div style={{ background:'var(--s1)', border:'1px solid rgba(124,106,247,.25)', borderRadius:14,
            boxShadow:'0 0 32px rgba(124,106,247,.08)', overflow:'hidden' }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px',
              borderBottom:'1px solid var(--bdr)',
              background:'linear-gradient(135deg,rgba(124,106,247,.06),transparent)' }}>
              <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,var(--ac),#5b4de0)',
                display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 14px rgba(124,106,247,.4)' }}>
                <Brain size={14} color="#fff"/>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13.5, fontWeight:700, color:'var(--tx)', letterSpacing:'-.2px' }}>AI Karar Motoru</p>
                {aiTimestamp && <p style={{ fontSize:10.5, color:'var(--tx3)', marginTop:1 }}>{new Date(aiTimestamp).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})} · GPT-4o · Supabase verisi</p>}
              </div>
              <span className={`badge badge-${riskBadge(aiAnalysis.overall_risk)}`}>{aiAnalysis.overall_risk}</span>
              <button onClick={()=>setAiAnalysis(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--tx3)', padding:4 }}>
                <X size={14}/>
              </button>
            </div>

            {/* Özet */}
            <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--bdr)' }}>
              <p style={{ fontSize:13.5, color:'var(--tx)', lineHeight:1.6, marginBottom:10 }}>{aiAnalysis.summary}</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {aiAnalysis.key_findings.slice(0,4).map((f,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:6, padding:'6px 10px',
                    background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:8, maxWidth:320 }}>
                    <Zap size={10} style={{ color:'var(--ac)', flexShrink:0, marginTop:2 }}/>
                    <span style={{ fontSize:11.5, color:'var(--tx2)', lineHeight:1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Öneriler */}
            <div style={{ padding:'14px 20px', display:'flex', flexDirection:'column', gap:10 }}>
              <p style={{ fontSize:10.5, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:2 }}>
                Önerilen Aksiyonlar — {aiAnalysis.recommendations.length} restoran
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,320px),1fr))', gap:10 }}>
                {aiAnalysis.recommendations.map((rec,i) => (
                  <div key={i} style={{ background:'var(--s2)', border:`1px solid ${rec.priority==='HIGH'?'rgba(242,87,87,.2)':rec.priority==='MEDIUM'?'rgba(240,168,67,.2)':'var(--bdr)'}`,
                    borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                      <span className={`badge ${riskBadge(rec.priority)}`} style={{ fontSize:9 }}>{rec.priority}</span>
                      <span style={{ fontSize:12.5, fontWeight:600, color:'var(--tx)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {rec.restaurant_name}
                      </span>
                    </div>
                    <p style={{ fontSize:12, color:'var(--tx3)', marginBottom:8, lineHeight:1.4 }}>{rec.issue}</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {rec.actions.slice(0,2).map((a,j) => (
                        <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:6 }}>
                          <CheckCircle2 size={11} style={{ color:'var(--green)', flexShrink:0, marginTop:2 }}/>
                          <div style={{ flex:1 }}>
                            <span style={{ fontSize:11.5, color:'var(--tx2)', lineHeight:1.4 }}>{a.text}</span>
                            <span style={{ fontSize:10, color:'var(--tx3)', marginLeft:5 }}>· {a.time_to_impact}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Otomatik alınan aksiyonlar */}
              {(aiAnalysis.auto_actions_taken?.length ?? 0) > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
                  background:'var(--green2)', border:'1px solid var(--green-ln)', borderRadius:8, marginTop:4 }}>
                  <CheckCircle2 size={12} style={{ color:'var(--green)', flexShrink:0 }}/>
                  <span style={{ fontSize:11.5, color:'var(--tx2)' }}>
                    <strong style={{ color:'var(--green)' }}>Otomatik alınan aksiyonlar:</strong>{' '}
                    {aiAnalysis.auto_actions_taken.join(' · ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* KPI cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,200px),1fr))', gap:14 }}>
          {kpis.map((k, i) => {
            const Icon = k.Icon
            return (
              <div key={k.label} className="kpi" style={{ borderLeft:`2.5px solid ${k.color}`, animationDelay:`${i*40}ms` }}>
                <div style={{ position:'absolute', top:0, right:0, width:80, height:80, background:`radial-gradient(circle at top right,${k.iconBg},transparent 70%)`, pointerEvents:'none' }}/>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:k.iconBg, border:`1px solid ${k.color}25`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon size={15} style={{ color:k.color }} strokeWidth={1.9}/>
                  </div>
                  {k.trend && <span className="badge badge-red" style={{ fontSize:10.5 }}>{k.trend.v}</span>}
                </div>
                <p className="kpi-label">{k.label}</p>
                <p className="kpi-value" style={{ color:k.color }}>{k.value}</p>
                {k.sub && <p className="kpi-sub">{k.sub}</p>}
              </div>
            )
          })}
        </div>

        {/* Filter tabs */}
        <div className="tabs" style={{ borderRadius:'10px 10px 0 0', marginBottom:-1 }}>
          {FILTERS.map(f => (
            <button key={f.key} className={`tab ${filter===f.key?'active':''}`} onClick={()=>setFilter(f.key)}>
              {f.label}
              <span style={{ marginLeft:5, fontSize:10.5, fontFamily:'JetBrains Mono,monospace',
                background:filter===f.key?'var(--ac2)':'var(--s3)', color:filter===f.key?'var(--ac)':'var(--tx3)',
                padding:'1px 6px', borderRadius:5 }}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
            <div style={{ width:20, height:20, border:'2px solid var(--s4)', borderTopColor:'var(--ac)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,290px),1fr))', gap:14 }}>
            {shown.map((d, i) => (
              <div key={d.restaurant.id} className="anim-pop" style={{ animationDelay:`${i*30}ms` }}>
                <RestaurantCard data={d}/>
              </div>
            ))}
          </div>
        )}

        {refreshed && (
          <p style={{ fontSize:11, color:'var(--tx3)' }}>
            Son güncelleme: {refreshed.toLocaleTimeString('tr-TR')} · {isLive?'Supabase bağlı':'Demo'} · 60sn oto yenileme
          </p>
        )}
      </div>

      {/* Rapor Modal */}
      {showReport && aiAnalysis && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(6px)', zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'var(--s1)', border:'1px solid var(--bdr2)', borderRadius:16, width:'100%', maxWidth:680,
            maxHeight:'85vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,.5)' }}>
            {/* Modal header */}
            <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--bdr)', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,var(--ac),#5b4de0)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <FileText size={14} color="#fff"/>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:15, fontWeight:700, color:'var(--tx)' }}>AI Analiz Raporu</p>
                {aiTimestamp && <p style={{ fontSize:11, color:'var(--tx3)', marginTop:1 }}>{new Date(aiTimestamp).toLocaleString('tr-TR')} · GPT-4o</p>}
              </div>
              <button onClick={()=>setShowReport(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--tx3)', padding:4 }}>
                <X size={16}/>
              </button>
            </div>

            {/* Modal içerik */}
            <div style={{ overflowY:'auto', flex:1 }}>
              {/* Özet */}
              <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--bdr)' }}>
                <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:120, background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                    <p style={{ fontSize:11, color:'var(--tx3)', marginBottom:4 }}>Genel Risk</p>
                    <span className={`badge badge-${riskBadge(aiAnalysis.overall_risk)}`} style={{ fontSize:12 }}>{aiAnalysis.overall_risk}</span>
                  </div>
                  <div style={{ flex:1, minWidth:120, background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                    <p style={{ fontSize:11, color:'var(--tx3)', marginBottom:4 }}>Kritik Restoran</p>
                    <p style={{ fontSize:20, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--red)' }}>{aiAnalysis.critical_count}</p>
                  </div>
                  <div style={{ flex:1, minWidth:120, background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                    <p style={{ fontSize:11, color:'var(--tx3)', marginBottom:4 }}>Öneri</p>
                    <p style={{ fontSize:20, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--ac)' }}>{aiAnalysis.recommendations.length}</p>
                  </div>
                  <div style={{ flex:1, minWidth:120, background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                    <p style={{ fontSize:11, color:'var(--tx3)', marginBottom:4 }}>Oto Aksiyon</p>
                    <p style={{ fontSize:20, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--green)' }}>{aiAnalysis.auto_actions_taken?.length ?? 0}</p>
                  </div>
                </div>
              </div>

              {/* Tam rapor */}
              <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--bdr)' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:12 }}>YÖNETİCİ RAPORU</p>
                <div style={{ fontSize:13.5, color:'var(--tx2)', lineHeight:1.75, whiteSpace:'pre-wrap' }}>
                  {aiAnalysis.report_text}
                </div>
              </div>

              {/* Tespitler */}
              <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--bdr)' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>KRİTİK TESPİTLER</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {aiAnalysis.key_findings.map((f,i) => (
                    <div key={i} style={{ display:'flex', gap:10, padding:'9px 12px', background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:9 }}>
                      <span style={{ fontSize:13, fontFamily:'JetBrains Mono,monospace', color:'var(--ac)', fontWeight:700, flexShrink:0 }}>{i+1}</span>
                      <span style={{ fontSize:13, color:'var(--tx2)', lineHeight:1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Restoran aksiyonları */}
              <div style={{ padding:'20px 24px' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>RESTORAN AKSİYON PLANI</p>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {aiAnalysis.recommendations.map((rec,i) => (
                    <div key={i} style={{ background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:10, overflow:'hidden' }}>
                      <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--bdr)', display:'flex', alignItems:'center', gap:8 }}>
                        <span className={`badge ${riskBadge(rec.priority)}`} style={{ fontSize:9 }}>{rec.priority}</span>
                        <span style={{ fontSize:13, fontWeight:600, color:'var(--tx)' }}>{rec.restaurant_name}</span>
                        <span style={{ fontSize:12, color:'var(--tx3)', marginLeft:4 }}>— {rec.issue}</span>
                      </div>
                      <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:6 }}>
                        {rec.actions.map((a,j) => (
                          <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                            <CheckCircle2 size={12} style={{ color:'var(--green)', flexShrink:0, marginTop:2 }}/>
                            <div>
                              <span style={{ fontSize:12.5, color:'var(--tx2)' }}>{a.text}</span>
                              <span style={{ fontSize:11, color:'var(--tx3)', marginLeft:8 }}>{a.expected_impact} · {a.time_to_impact}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding:'14px 24px', borderTop:'1px solid var(--bdr)', display:'flex', gap:10, background:'var(--s2)' }}>
              <button onClick={() => {
                const text = `MUTFAK NABZI AI RAPORU\n${new Date(aiTimestamp!).toLocaleString('tr-TR')}\n\n${aiAnalysis.report_text}\n\nKritik Tespitler:\n${aiAnalysis.key_findings.map((f,i)=>`${i+1}. ${f}`).join('\n')}`
                navigator.clipboard.writeText(text)
              }} className="btn-ghost" style={{ flex:1, justifyContent:'center', fontSize:12 }}>
                📋 Kopyala
              </button>
              <button onClick={() => {
                const blob = new Blob([
                  `MUTFAK NABZI AI RAPORU\n${new Date(aiTimestamp!).toLocaleString('tr-TR')}\n\n${aiAnalysis.report_text}\n\nKritik Tespitler:\n${aiAnalysis.key_findings.map((f,i)=>`${i+1}. ${f}`).join('\n')}\n\nAksiyon Planı:\n${aiAnalysis.recommendations.map(r=>`${r.restaurant_name}:\n${r.actions.map(a=>`- ${a.text}`).join('\n')}`).join('\n\n')}`
                ], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = `mutfak-nabzi-rapor-${new Date().toISOString().slice(0,10)}.txt`
                a.click()
              }} className="btn" style={{ flex:1, justifyContent:'center', fontSize:12 }}>
                ⬇ İndir (.txt)
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
