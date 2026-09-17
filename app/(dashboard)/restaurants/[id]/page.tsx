'use client'
import { use, useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { PulseGauge } from '@/components/cards/pulse-gauge'
import { KPICard } from '@/components/cards/kpi-card'
import { StationBar } from '@/components/cards/station-bar'
import { HourlyChart } from '@/components/charts/hourly-chart'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { fetchPulseScore, fetchSnapshot, fetchForecasts } from '@/lib/supabase-client'
import { getRiskConfig } from '@/lib/utils'
import { AlertTriangle, CheckCircle2, Clock, Package, Flame, Zap, Users, CloudRain, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-client'
import { insertAuditLog } from '@/lib/supabase-client'

export default function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const restaurant = RESTAURANTS.find(r => r.id === id)
  const [pulse, setPulse] = useState<any>(null)
  const [snapshot, setSnapshot] = useState<any>(null)
  const [sbLoading, setSbLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchPulseScore(id), fetchSnapshot(id)])
      .then(([p,s]) => { if(p) setPulse(p); if(s) setSnapshot(s) })
      .catch(console.error)
      .finally(() => setSbLoading(false))
    const t = setInterval(() =>
      Promise.all([fetchPulseScore(id), fetchSnapshot(id)])
        .then(([p,s]) => { if(p) setPulse(p); if(s) setSnapshot(s) }).catch(()=>{})
    , 10000)
    return () => clearInterval(t)
  }, [id])

  if (!restaurant) return <div style={{ padding:40, color:'var(--tx3)', fontSize:14 }}>Restoran bulunamadı.</div>
  if (sbLoading || !pulse) return <div style={{display:'flex',justifyContent:'center',padding:48}}><div style={{width:20,height:20,border:'2px solid var(--s4)',borderTopColor:'var(--ac)',borderRadius:'50%',animation:'spin .7s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>

  const config = getRiskConfig(pulse.risk_level)
  // snapshot alanlarını normalize et — computed değişkenler
  const ps = pulse.station_scores ?? {}
  const snap_prep    = snapshot?.avg_preparation_time ?? pulse.avg_prep_time ?? 0
  const snap_courier = snapshot?.avg_courier_wait     ?? pulse.courier_wait  ?? 0
  const snap_orders  = snapshot?.open_orders          ?? pulse.open_orders   ?? 0
  const snap_grill   = snapshot?.grill_load           ?? ps.grill   ?? 0
  const snap_fryer   = snapshot?.fryer_load           ?? ps.fryer   ?? 0
  const snap_packing = snapshot?.packing_load         ?? ps.packing ?? 0
  const snap_cload   = snapshot?.courier_load         ?? ps.courier ?? 0

  return (
    <div className="dm">
      <Topbar
        title={restaurant.name}
        subtitle={`${restaurant.district}, ${restaurant.city} · Canlı Veri`}
      />
      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Back nav */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Link href="/restaurants" style={{ color:'var(--tx3)', display:'flex', alignItems:'center', textDecoration:'none' }}>
            <ChevronLeft size={16}/>
          </Link>
          <span style={{ fontSize:12, color:'var(--tx3)' }}>{restaurant.brand.replace('_',' ')}</span>
          <span style={{ color:'var(--bdr2)' }}>·</span>
          <span style={{ fontSize:12, color:'var(--tx3)' }}>{restaurant.region}</span>
        </div>

        {/* Üst grid — Nabız + KPI + İstasyon */}
        <div style={{ display:'grid', gridTemplateColumns:'clamp(200px,22%,260px) 1fr clamp(180px,28%,300px)', gap:14, alignItems:'start' }}>

          {/* Nabız kartı */}
          <div style={{ borderRadius:14, border:`1px solid ${config.colorHex}30`, background:config.bg, padding:'22px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
            <p style={{ fontSize:9.5, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'3px', fontWeight:600 }}>Operasyon Nabzı</p>
            <PulseGauge score={pulse.score} riskLevel={pulse.risk_level} size="lg"/>
            {pulse.top_signals.length > 0 && (
              <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:5 }}>
                {pulse.top_signals.map((s, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:6, fontSize:11.5, color:config.colorHex }}>
                    <AlertTriangle size={11} style={{ flexShrink:0, marginTop:1 }}/>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KPI 2x3 grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <KPICard label="Açık Sipariş"    value={String(pulse.open_orders)} trend="up" trendValue="Normalin %35 üstünde" alert={pulse.open_orders>25} icon={<Package size={14}/>}/>
            <KPICard label="Ort. Hazırlama"  value={(pulse.avg_prep_time??0).toFixed(1)} unit="dk" trend={pulse.avg_prep_time>9?'up':'neutral'} trendValue={pulse.avg_prep_time>9?'Hedef: 7 dk':'Normal'} alert={pulse.avg_prep_time>10} icon={<Flame size={14}/>}/>
            <KPICard label="Packing Süresi"  value={(pulse.avg_packing_time??0).toFixed(1)} unit="dk" trend="neutral" trendValue="Stabil" icon={<Package size={14}/>}/>
            <KPICard label="Kurye Bekleme"   value={(pulse.courier_wait??0).toFixed(1)} unit="dk" trend={pulse.courier_wait>6?'up':'neutral'} trendValue={pulse.courier_wait>6?'Artıyor':'Normal'} alert={pulse.courier_wait>7} icon={<Clock size={14}/>}/>
            <KPICard label="Aktif Personel"  value={String((snapshot?.active_staff??0))} unit="kişi" icon={<Users size={14}/>}/>
            <KPICard label="Yağış Yoğunluğu" value={String(snapshot?.rain_intensity??0)} unit="/10" icon={<CloudRain size={14}/>}/>
          </div>

          {/* İstasyon + Kanal */}
          <div style={{ background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 18px' }}>
            <p style={{ fontSize:9.5, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'2px', fontWeight:600, marginBottom:14 }}>İstasyon Nabzı</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <StationBar label="Grill"   score={pulse.station_scores.grill}   icon="🔥"/>
              <StationBar label="Fryer"   score={pulse.station_scores.fryer}   icon="🍟"/>
              <StationBar label="Packing" score={pulse.station_scores.packing} icon="📦"/>
              <StationBar label="Kurye"   score={pulse.station_scores.courier} icon="🛵"/>
            </div>
            <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--bdr)' }}>
              <p style={{ fontSize:9.5, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'2px', fontWeight:600, marginBottom:10 }}>Sipariş Kanalı</p>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {[
                  { label:'Tıkla Gelsin Paket', value:snapshot.tiklagelsin_delivery_orders, color:'var(--amber)' },
                  { label:'Tıkla Gelsin Gel Al', value:snapshot.tiklagelsin_pickup_orders,  color:'var(--blue)'  },
                  { label:'Normal Restoran',     value:snapshot.restaurant_orders,           color:'var(--ac)'    },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:color, flexShrink:0 }}/>
                    <span style={{ fontSize:11.5, color:'var(--tx3)', flex:1 }}>{label}</span>
                    <span style={{ fontSize:12, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Grafik + Tahmin */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr clamp(180px,28%,300px)', gap:14 }}>
          <div style={{ background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <p style={{ fontSize:9.5, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'2px', fontWeight:600 }}>Saatlik Sipariş Trendi</p>
              <div style={{ display:'flex', gap:14 }}>
                <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--tx3)' }}>
                  <span style={{ width:16, height:2, background:'var(--amber)', display:'inline-block', borderRadius:2 }}/>Gerçek
                </span>
                <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--tx3)' }}>
                  <span style={{ width:16, height:2, background:'var(--ac)', display:'inline-block', borderRadius:2, borderTop:'2px dashed var(--ac)' }}/>Tahmin
                </span>
              </div>
            </div>
            <HourlyChart data={forecast}/>
          </div>

          <div style={{ background:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 18px' }}>
            <p style={{ fontSize:9.5, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'2px', fontWeight:600, marginBottom:14 }}>İleriye Dönük Tahmin</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {predictions.map(p => {
                const pc = getRiskConfig(p.predicted_pulse_score>=80?'KRITIK':p.predicted_pulse_score>=60?'RISKLI':p.predicted_pulse_score>=40?'YOGUN':'NORMAL')
                return (
                  <div key={p.horizon_minutes} style={{ borderRadius:10, border:`1px solid ${pc.colorHex}30`, background:pc.bg, padding:'10px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11, color:'rgba(255,255,255,.45)', fontWeight:500 }}>+{p.horizon_minutes} dk</span>
                      <span style={{ fontSize:20, fontWeight:800, fontFamily:'JetBrains Mono,monospace', color:pc.colorHex, letterSpacing:'-.04em' }}>{p.predicted_pulse_score}</span>
                    </div>
                    <p style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginBottom:2 }}>{p.predicted_orders} sipariş bekleniyor</p>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,.25)' }}>Güven: %{Math.round(p.confidence_score*100)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* AI Reçete */}
        {recommendation && <RecommendationPanel recommendation={recommendation} restaurantId={id}/>}

        {/* Alt grid */}
        <ProductComplaintRow restaurantId={id}/>

      </div>
    </div>
  )
}

// ── Reçete paneli — checkbox Supabase'e yazar ─────────────────────────────
function RecommendationPanel({ recommendation, restaurantId }: { recommendation: any; restaurantId: string }) {
  const [actions, setActions] = useState<any[]>(recommendation.actions ?? [])
  const [saving, setSaving] = useState<string|null>(null)

  const toggle = async (actionId: string) => {
    const action = actions.find(a => a.id === actionId)
    if (!action) return
    const newApplied = !action.applied
    const appliedAt  = newApplied ? new Date().toISOString() : null

    setSaving(actionId)
    // Optimistic update
    setActions(prev => prev.map(a => a.id===actionId ? { ...a, applied:newApplied, applied_at:appliedAt } : a))

    try {
      // Supabase'e yaz
      await getSupabase()
        .from('recommendation_actions')
        .update({ applied: newApplied, applied_at: appliedAt })
        .eq('id', actionId)

      // Audit log
      await insertAuditLog({
        user_role: 'Müdür',
        action: newApplied ? 'ACTION_APPLIED' : 'ACTION_UNDONE',
        resource: 'recommendation_actions',
        details: { action_id:actionId, restaurant_id:restaurantId, action_text:action.action_text, applied:newApplied },
      })
    } catch (e) {
      // Rollback
      setActions(prev => prev.map(a => a.id===actionId ? { ...a, applied:action.applied, applied_at:action.applied_at } : a))
    } finally { setSaving(null) }
  }

  return (
    <div style={{ borderRadius:14, border:'1px solid rgba(124,106,247,.25)', background:'rgba(124,106,247,.04)', padding:'18px 20px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
        <Zap size={15} style={{ color:'var(--ac)' }}/>
        <span style={{ fontSize:13.5, fontWeight:600, color:'var(--ac)', letterSpacing:'-.15px' }}>Operasyon Reçetesi</span>
        <span style={{ marginLeft:'auto', fontSize:11, color:'var(--tx3)', fontFamily:'JetBrains Mono,monospace' }}>
          {new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}
        </span>
      </div>
      <p style={{ fontSize:12, color:'var(--tx3)', marginBottom:2, lineHeight:1.5 }}>{recommendation.summary}</p>
      <p style={{ fontSize:11.5, color:'rgba(255,255,255,.25)', marginBottom:16, lineHeight:1.5 }}>{recommendation.risk_explanation}</p>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {actions.map(action => (
          <div key={action.id} style={{
            display:'flex', alignItems:'flex-start', gap:12,
            borderRadius:10, padding:'12px 14px',
            border:`1px solid ${action.applied?'rgba(34,211,160,.25)':action.priority==='HIGH'?'rgba(242,87,87,.18)':'rgba(255,255,255,.07)'}`,
            background:action.applied?'rgba(34,211,160,.05)':action.priority==='HIGH'?'rgba(242,87,87,.04)':'rgba(255,255,255,.02)',
            transition:'all .2s',
            opacity: saving===action.id ? .6 : 1,
          }}>
            {/* Checkbox */}
            <button onClick={()=>toggle(action.id)} disabled={saving===action.id}
              style={{
                marginTop:2, width:18, height:18, borderRadius:5, flexShrink:0,
                border:`2px solid ${action.applied?'#22d3a0':'rgba(255,255,255,.2)'}`,
                background:action.applied?'#22d3a0':'transparent',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', transition:'all .15s',
              }}>
              {action.applied && <CheckCircle2 size={11} color="#fff" strokeWidth={3}/>}
            </button>

            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:13, color:action.applied?'rgba(255,255,255,.35)':'rgba(255,255,255,.8)', textDecoration:action.applied?'line-through':'none', lineHeight:1.5 }}>
                {action.action_text}
              </p>
              {action.expected_improvement && !action.applied && (
                <p style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:3 }}>→ {action.expected_improvement}</p>
              )}
              {action.applied && action.applied_at && (
                <p style={{ fontSize:11, color:'#22d3a0', marginTop:3 }}>
                  ✓ Uygulandı · {new Date(action.applied_at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}
                </p>
              )}
            </div>

            <span style={{
              fontSize:10, padding:'2px 8px', borderRadius:5, fontWeight:700, textTransform:'uppercase', flexShrink:0,
              background: action.priority==='HIGH'?'rgba(242,87,87,.15)':'rgba(255,255,255,.06)',
              color: action.priority==='HIGH'?'#f25757':'rgba(255,255,255,.35)',
            }}>
              {action.priority==='HIGH'?'Acil':'Orta'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Alt grid — Ürün + Şikayet + Ciro ─────────────────────────────────────
function ProductComplaintRow({ restaurantId }: { restaurantId: string }) {
  const { getProductSnapshot } = require('@/data/seed/products')
  const { getComplaintSummary, REASON_LABELS } = require('@/data/seed/complaints')
  const { getRevenueSnapshot } = require('@/data/seed/revenue')

  const products   = getProductSnapshot(restaurantId)
  const complaints = getComplaintSummary(restaurantId)
  const revenue    = getRevenueSnapshot(restaurantId)

  const topProducts = [...products.products].sort((a:any,b:any)=>b.demandIndex-a.demandIndex).slice(0,4)
  const topComplaint = Object.entries(complaints.byReason as Record<string,number>).sort(([,a],[,b])=>b-a).slice(0,3)

  const S = { card:'var(--s1)', border:'1px solid var(--bdr)', borderRadius:14, padding:'18px 18px' }
  const label = { fontSize:9.5, color:'var(--tx3)', textTransform:'uppercase' as const, letterSpacing:'2px', fontWeight:600 as const, marginBottom:14 }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap:14 }}>

      {/* Ürün yoğunluğu */}
      <div style={S}>
        <p style={label}>Ürün Yoğunluğu</p>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {topProducts.map((p:any) => {
            const c = p.demandIndex>=150?'#f25757':p.demandIndex>=120?'#f97316':p.demandIndex>=100?'#eab308':'#22c55e'
            return (
              <div key={p.id}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11.5, color:'var(--tx2)' }}>{p.name}</span>
                  <span style={{ fontSize:12, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:c }}>%{p.demandIndex}</span>
                </div>
                <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,.06)', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:2, width:`${Math.min(p.demandIndex,200)/2}%`, background:c }}/>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Şikayetler */}
      <div style={S}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
          <p style={{ ...label, marginBottom:0 }}>Müşteri Şikayeti</p>
          <span style={{ fontSize:22, fontWeight:800, fontFamily:'JetBrains Mono,monospace', color:complaints.total>15?'var(--red)':complaints.total>8?'var(--amber)':'var(--tx3)' }}>{complaints.total}</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
          {topComplaint.map(([reason,count]:any)=> count>0 && (
            <div key={reason} style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:11.5, color:'var(--tx3)' }}>{(REASON_LABELS as any)[reason]}</span>
              <span style={{ fontSize:12, fontWeight:600, color:'var(--tx)' }}>{count}</span>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:20, paddingTop:12, borderTop:'1px solid var(--bdr)' }}>
          <div>
            <p style={{ fontSize:10, color:'var(--tx3)', marginBottom:2 }}>Kayıp Ciro</p>
            <p style={{ fontSize:13.5, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--red)' }}>{complaints.totalLostRevenue.toLocaleString('tr-TR')} ₺</p>
          </div>
          <div>
            <p style={{ fontSize:10, color:'var(--tx3)', marginBottom:2 }}>Çözüm</p>
            <p style={{ fontSize:13.5, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--green)' }}>%{Math.round(complaints.resolvedRate*100)}</p>
          </div>
        </div>
      </div>

      {/* Ciro */}
      <div style={S}>
        <p style={label}>Ciro Durumu</p>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <p style={{ fontSize:10, color:'var(--tx3)', marginBottom:3 }}>Gerçekleşen</p>
            <p style={{ fontSize:22, fontWeight:800, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)' }}>{revenue.actualRevenue.toLocaleString('tr-TR')} ₺</p>
          </div>
          <div>
            <p style={{ fontSize:10, color:'var(--tx3)', marginBottom:3 }}>Kayıp Ciro</p>
            <p style={{ fontSize:18, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'var(--red)' }}>{revenue.totalLostRevenue.toLocaleString('tr-TR')} ₺</p>
          </div>
          <div style={{ paddingTop:10, borderTop:'1px solid var(--bdr)' }}>
            <p style={{ fontSize:10, color:'var(--tx3)', marginBottom:6 }}>Kapasite Kullanımı</p>
            <div style={{ height:6, borderRadius:3, background:'rgba(255,255,255,.06)', overflow:'hidden', marginBottom:5 }}>
              <div style={{ height:'100%', borderRadius:3, width:`${revenue.capacityUtilization}%`, background:revenue.capacityUtilization>80?'var(--red)':'var(--green)', transition:'width .7s ease' }}/>
            </div>
            <p style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'var(--tx3)' }}>%{revenue.capacityUtilization}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
