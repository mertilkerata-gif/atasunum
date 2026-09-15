'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { fetchRecommendations } from '@/lib/supabase-client'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { Lightbulb, CheckCircle2, Clock, ArrowRight, Wifi } from 'lucide-react'

const PC: Record<string, { color: string; bg: string; border: string; label: string }> = {
  HIGH:   { label:'Yüksek', color:'var(--red)',   bg:'var(--red2)',   border:'rgba(242,87,87,.22)' },
  MEDIUM: { label:'Orta',   color:'var(--amber)', bg:'var(--amber2)', border:'rgba(240,168,67,.22)' },
  LOW:    { label:'Düşük',  color:'var(--yellow,#eab308)', bg:'rgba(234,179,8,.08)', border:'rgba(234,179,8,.22)' },
}

export default function AIRecommendationsPage() {
  const [recs, setRecs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [applying, setApplying] = useState<string|null>(null)

  const load = useCallback(async () => {
    try {
      const rows = await fetchRecommendations()
      if (rows.length > 0) {
        setRecs(rows.map((r:any) => ({ ...r, actions: Array.isArray(r.actions) ? r.actions : (r.recommendation_actions ?? []) })))
        setIsLive(true)
      } else {
        setRecs([
          { id:'mock-r6', restaurant_id:'r6', summary:'Popeyes Taksim kritik eşiği aştı — acil müdahale', risk_explanation:'Tüm istasyonlar %88+ yükte. Hazırlama 13.4dk — normalin 2 katı.',
            actions:[
              {id:'a1',action_text:'Yedek personel çağır: en az 2 ek çalışan',priority:'HIGH',station:'packing',expected_improvement:'Packing yükü %20 düşer',time_to_impact:'10 dk',applied:false},
              {id:'a2',action_text:'Grill grubunu 2 ekstra ürün önceden hazırla',priority:'HIGH',station:'grill',expected_improvement:'Hazırlama 3-4 dk kısalır',time_to_impact:'5 dk',applied:false},
              {id:'a3',action_text:'Kurye toplama noktasını düzenle',priority:'MEDIUM',station:'courier',expected_improvement:'Kurye bekleme %30 azalır',time_to_impact:'15 dk',applied:false},
            ], forecast_note:'Sonraki 30dk içinde 12 yeni sipariş bekleniyor', created_at:new Date().toISOString() },
          { id:'mock-r1', restaurant_id:'r1', summary:'BK Kadıköy — packing darboğazı kritik', risk_explanation:'Packing yükü %94. Açık sipariş normalin %35 üzerinde.',
            actions:[
              {id:'b1',action_text:'Packing istasyonuna ek eleman al',priority:'HIGH',station:'packing',expected_improvement:'Yük %25 düşer',time_to_impact:'8 dk',applied:false},
              {id:'b2',action_text:'Kurye toplama noktasını düzenle',priority:'MEDIUM',station:'courier',expected_improvement:'Bekleme 2dk kısalır',time_to_impact:'10 dk',applied:false},
            ], forecast_note:'Yağmur etkisi 1 saat daha sürecek', created_at:new Date(Date.now()-300000).toISOString() },
        ])
      }
    } catch { setIsLive(false) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const applyAction = async (recId: string, actionId: string) => {
    setApplying(actionId)
    try {
      const { getSupabase } = await import('@/lib/supabase-client')
      await getSupabase().from('recommendation_actions').update({ applied:true, applied_at:new Date().toISOString() }).eq('id', actionId)
    } catch {}
    setRecs(prev => prev.map(r => r.id===recId ? { ...r, actions: r.actions.map((a:any) => a.id===actionId ? {...a,applied:true} : a) } : r))
    setApplying(null)
  }

  const total = recs.flatMap(r=>r.actions).length
  const applied = recs.flatMap(r=>r.actions).filter((a:any)=>a.applied).length

  return (
    <div className="dm">
      <Topbar title="AI Önerileri" subtitle="Otomatik üretilen operasyon reçeteleri"
        action={
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', background:'var(--s2)', border:'1px solid var(--bdr)', borderRadius:20, padding:'3px 10px', color:'var(--tx3)' }}>
              {applied}/{total} uygulandı
            </span>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background:isLive?'var(--green2)':'var(--s2)', border:`1px solid ${isLive?'var(--green-ln)':'var(--bdr)'}` }}>
              <Wifi size={10} style={{ color:isLive?'var(--green)':'var(--tx3)' }}/>
              <span style={{ fontSize:10, color:isLive?'var(--green)':'var(--tx3)' }}>{isLive?'Supabase':'Demo'}</span>
            </div>
          </div>
        }
      />

      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:16 }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
            <div style={{ width:20, height:20, border:'2px solid var(--s4)', borderTopColor:'var(--ac)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
          </div>
        ) : recs.map((rec, i) => {
          const restaurant = RESTAURANTS.find(r=>r.id===rec.restaurant_id)
          const appliedCount = rec.actions.filter((a:any)=>a.applied).length
          const isPop = restaurant?.brand === 'POPEYES'
          return (
            <div key={rec.id} className="card" style={{ animationDelay:`${i*50}ms` }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'16px 20px', borderBottom:'1px solid var(--bdr)' }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'var(--amber2)', border:'1px solid rgba(240,168,67,.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Lightbulb size={15} style={{ color:'var(--amber)' }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:5, background:isPop?'rgba(249,115,22,.1)':'rgba(78,168,240,.1)', color:isPop?'var(--amber)':'var(--blue)' }}>
                      {isPop?'POP':'BK'}
                    </span>
                    <span style={{ fontSize:12, color:'var(--tx2)' }}>{restaurant?.name ?? rec.restaurant_id}</span>
                    <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4 }}>
                      <Clock size={10} style={{ color:'var(--tx3)' }}/>
                      <span style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--tx3)' }}>
                        {new Date(rec.created_at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize:14, fontWeight:600, color:'var(--tx)', letterSpacing:'-.2px', marginBottom:4 }}>{rec.summary}</p>
                  <p style={{ fontSize:12, color:'var(--tx3)', lineHeight:1.5 }}>{rec.risk_explanation}</p>
                </div>
              </div>

              {/* Aksiyonlar */}
              <div style={{ padding:'14px 20px' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>
                  Önerilen Aksiyonlar — {appliedCount}/{rec.actions.length} uygulandı
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {rec.actions.map((action:any) => {
                    const p = PC[action.priority] ?? PC.MEDIUM
                    return (
                      <div key={action.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, opacity:action.applied?.5:1, background:action.applied?'var(--s2)':p.bg, border:`1px solid ${action.applied?'var(--bdr)':p.border}`, transition:'all .15s' }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:action.applied?'var(--tx3)':p.color, flexShrink:0 }}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:13, fontWeight:500, color:action.applied?'var(--tx3)':'var(--tx)', textDecoration:action.applied?'line-through':'none', lineHeight:1.4 }}>{action.action_text}</p>
                          {action.expected_improvement && !action.applied && (
                            <p style={{ fontSize:11, color:'var(--tx3)', marginTop:3 }}>{action.expected_improvement} · {action.time_to_impact}</p>
                          )}
                        </div>
                        {action.station && (
                          <span style={{ fontSize:10, padding:'2px 8px', borderRadius:5, background:'var(--s3)', border:'1px solid var(--bdr)', color:'var(--tx3)', flexShrink:0 }}>{action.station}</span>
                        )}
                        {action.applied
                          ? <CheckCircle2 size={14} style={{ color:'var(--green)', flexShrink:0 }}/>
                          : <button onClick={()=>applyAction(rec.id,action.id)} disabled={applying===action.id}
                              style={{ padding:'5px 12px', borderRadius:8, background:p.bg, border:`1px solid ${p.border}`, color:p.color, fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0, transition:'opacity .15s' }}>
                              {applying===action.id?'…':'Uygula'}
                            </button>
                        }
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Tahmin notu */}
              {rec.forecast_note && (
                <div style={{ padding:'0 20px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:9, background:'var(--blue2)', border:'1px solid var(--blue-ln)' }}>
                    <ArrowRight size={11} style={{ color:'var(--blue)', flexShrink:0 }}/>
                    <span style={{ fontSize:11.5, color:'var(--tx2)' }}>{rec.forecast_note}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
