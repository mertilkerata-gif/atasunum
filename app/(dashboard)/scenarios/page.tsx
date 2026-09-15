'use client'
import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { getSupabase } from '@/lib/supabase-client'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { Play, Zap, ShoppingBag, AlertTriangle, Users, CloudRain, Truck, Package, TrendingUp, CheckCircle2, Loader2 } from 'lucide-react'

interface ScenarioResult { ok: boolean; message: string; details?: string[] }

const SCENARIOS = [
  { id:'order_surge',     label:'Sipariş Dalgası',   icon:ShoppingBag,  color:'#7c6af7', bg:'rgba(124,106,247,0.08)', border:'rgba(124,106,247,0.25)', desc:'Seçili restorana X adet Tıkla Gelsin siparişi gönderir. Nabız otomatik yükselir.', params:[{key:'count',label:'Sipariş Adedi',type:'number',default:20,min:1,max:200},{key:'restaurant',label:'Restoran',type:'select'}] },
  { id:'packing_crisis',  label:'Packing Krizi',     icon:Package,       color:'#f0a843', bg:'rgba(240,168,67,0.08)',  border:'rgba(240,168,67,0.25)',  desc:'Packing istasyonunu %95 yüke çıkarır. AI personel takviyesi önerir.', params:[{key:'restaurant',label:'Restoran',type:'select'},{key:'load',label:'Packing Yükü (%)',type:'number',default:95,min:85,max:100}] },
  { id:'staff_shortage',  label:'Personel Eksikliği',icon:Users,         color:'#f25757', bg:'rgba(242,87,87,0.08)',   border:'rgba(242,87,87,0.25)',   desc:'X personeli "gelmedi" olarak işaretler. Uyarı tetiklenir.', params:[{key:'restaurant',label:'Restoran',type:'select'},{key:'count',label:'Gelmemiş Personel',type:'number',default:3,min:1,max:10}] },
  { id:'rain_effect',     label:'Yağmur Etkisi',     icon:CloudRain,     color:'#4ea8f0', bg:'rgba(78,168,240,0.08)',  border:'rgba(78,168,240,0.25)',  desc:'Tüm ağda yağmur — TG siparişleri %30 artar, kurye gecikmesi başlar.', params:[{key:'intensity',label:'Yağmur Şiddeti',type:'number',default:7,min:1,max:10}] },
  { id:'courier_blackout',label:'Kurye Kesintisi',   icon:Truck,         color:'#f25757', bg:'rgba(242,87,87,0.08)',   border:'rgba(242,87,87,0.25)',   desc:'Kurye sistemi duruyor. Bekleyen sipariş birikir.', params:[{key:'restaurant',label:'Restoran',type:'select'},{key:'duration',label:'Süre (dakika)',type:'number',default:15,min:5,max:60}] },
  { id:'pulse_spike',     label:'Nabız Artışı',      icon:TrendingUp,    color:'#f25757', bg:'rgba(242,87,87,0.08)',   border:'rgba(242,87,87,0.25)',   desc:'Seçili restoranın nabzını istenilen değere çıkar.', params:[{key:'restaurant',label:'Restoran',type:'select'},{key:'score',label:'Hedef Nabız',type:'number',default:90,min:50,max:100}] },
  { id:'multi_crisis',    label:'🔴 Tam Kriz',        icon:AlertTriangle, color:'#f25757', bg:'rgba(242,87,87,0.10)',   border:'rgba(242,87,87,0.40)',   desc:'3 restoranda aynı anda sipariş dalgası + packing + kurye krizi. Tam sunum senaryosu.', params:[{key:'intensity',label:'Kriz Seviyesi',type:'number',default:8,min:1,max:10}] },
  { id:'recovery',        label:'✅ Sistemi Resetle', icon:CheckCircle2,  color:'#22d3a0', bg:'rgba(34,211,160,0.08)',  border:'rgba(34,211,160,0.20)',  desc:'Tüm restoranları normale döndür. Demo sonrası kullan.', params:[] },
]

async function run(id: string, p: Record<string, any>): Promise<ScenarioResult> {
  const sb = getSupabase()
  const rid = p.restaurant || 'r6'
  const now = new Date().toISOString()
  const details: string[] = []

  const getPulse = async (r: string) => {
    const { data } = await sb.from('pulse_scores').select('*').eq('restaurant_id', r).order('computed_at', { ascending: false }).limit(1).single()
    return data
  }

  try {
    if (id === 'order_surge') {
      const count = Number(p.count) || 20
      await sb.from('orders').insert(Array.from({ length: count }, (_, i) => ({ restaurant_id: rid, status:'ACTIVE', channel: i % 3 === 0 ? 'PICKUP' : 'DELIVERY', total: 150 + Math.round(Math.random()*250), customer_name:`Demo ${i+1}`, created_at:now })))
      const cur = await getPulse(rid)
      if (cur) { const s = Math.min(99,(cur.score||50)+Math.round(count*1.2)); await sb.from('pulse_scores').insert({ ...cur, id:undefined, score:s, open_orders:(cur.open_orders||0)+count, risk_level:s>=80?'KRITIK':s>=60?'RISKLI':'YOGUN', computed_at:now }) }
      await sb.from('anomalies').insert({ restaurant_id:rid, type:'DEMAND_SPIKE', severity:'CRITICAL', title:'Ani Sipariş Dalgası', description:`${count} sipariş aynı anda geldi. Kapasite aşımı.`, metric:'Sipariş/5dk', expected_value:'10-15', actual_value:String(count), deviation:`+%${Math.round(count/12*100-100)}`, acknowledged:false, detected_at:now, auto_action:'AI Motor devreye alındı' })
      return { ok:true, message:`${count} sipariş gönderildi! AI motoru tetikleniyor…`, details:[`✅ ${count} sipariş oluşturuldu`,`⚡ Nabız artırıldı`,`🚨 DEMAND_SPIKE anomalisi eklendi`] }
    }

    if (id === 'packing_crisis') {
      const load = Number(p.load) || 95
      const cur = await getPulse(rid)
      if (cur) await sb.from('pulse_scores').insert({ ...cur, id:undefined, score:Math.min(99,Math.max(cur.score||70,82)), station_scores:{...(cur.station_scores||{}),packing:load,grill:78,fryer:72}, avg_packing_time:8.5, risk_level:'KRITIK', computed_at:now })
      await sb.from('anomalies').insert({ restaurant_id:rid, type:'STAFF_SHORTAGE', severity:'CRITICAL', title:'Packing Kapasitesi Kritik', description:`Packing %${load} yükde. Paketleme süresi 2 katına çıktı.`, metric:'Packing Yükü', expected_value:'<%70', actual_value:`%${load}`, deviation:`+%${load-70}`, acknowledged:false, detected_at:now, auto_action:'Personel takviyesi öneriliyor' })
      return { ok:true, message:`Packing krizi! (Yük: %${load})`, details:[`📦 Packing %${load}'e çıkarıldı`,`🚨 Anomali eklendi`] }
    }

    if (id === 'staff_shortage') {
      const count = Number(p.count) || 3
      const { data: shifts } = await sb.from('shifts').select('id').eq('restaurant_id', rid).eq('status','ACTIVE').limit(count)
      if (shifts?.length) { await sb.from('shifts').update({ status:'ABSENT' }).in('id', shifts.map((s:any)=>s.id)); details.push(`👥 ${shifts.length} personel işaretlendi`) }
      else { for (let i=0;i<count;i++) await sb.from('shifts').insert({ restaurant_id:rid, staff_name:`Demo ${i+1}`, role:'PACKING', shift_start:now.split('T')[0]+'T09:00:00', shift_end:now.split('T')[0]+'T17:00:00', status:'ABSENT' }); details.push(`👥 ${count} absent vardiya oluşturuldu`) }
      await sb.from('anomalies').insert({ restaurant_id:rid, type:'STAFF_SHORTAGE', severity:'WARNING', title:'Personel Eksikliği', description:`${count} personel gelmedi.`, acknowledged:false, detected_at:now })
      return { ok:true, message:`${count} personel gelmedi senaryosu!`, details }
    }

    if (id === 'rain_effect') {
      const intens = Number(p.intensity) || 7
      for (const r of RESTAURANTS) { const cur = await getPulse(r.id); if (cur) { const s=Math.min(99,(cur.score||50)+Math.round(intens*2.5)); await sb.from('pulse_scores').insert({ ...cur, id:undefined, score:s, courier_wait:(cur.courier_wait||3)+intens*0.8, rain_intensity:intens/10, risk_level:s>=80?'KRITIK':s>=60?'RISKLI':'YOGUN', computed_at:now }) } }
      await sb.from('anomalies').insert({ restaurant_id:'r1', type:'COURIER_BLACKOUT', severity:'WARNING', title:`Yağmur Etkisi (${intens}/10)`, description:`Tüm ağda kurye gecikmesi. TG +%${intens*4}`, acknowledged:false, detected_at:now })
      return { ok:true, message:`Yağmur senaryosu! (${intens}/10)`, details:[`🌧️ ${RESTAURANTS.length} restoran etkilendi`,`🚨 Kurye gecikmesi eklendi`] }
    }

    if (id === 'courier_blackout') {
      const dur = Number(p.duration) || 15
      const cur = await getPulse(rid)
      if (cur) await sb.from('pulse_scores').insert({ ...cur, id:undefined, courier_wait:dur, score:Math.min(99,(cur.score||60)+25), risk_level:'KRITIK', computed_at:now })
      await sb.from('anomalies').insert({ restaurant_id:rid, type:'COURIER_BLACKOUT', severity:'CRITICAL', title:'Kurye Sistemi Durdu', description:`${dur} dakikadır kurye yok.`, acknowledged:false, detected_at:now })
      return { ok:true, message:`Kurye kesintisi (${dur} dk)!`, details:[`🛵 Kurye ${dur} dk durdu`,`⚡ Nabız +25`] }
    }

    if (id === 'pulse_spike') {
      const score = Number(p.score) || 90
      const cur = await getPulse(rid)
      if (cur) await sb.from('pulse_scores').insert({ ...cur, id:undefined, score, risk_level:score>=80?'KRITIK':score>=60?'RISKLI':'YOGUN', open_orders:Math.round(score*0.4), avg_prep_time:score/8, station_scores:{grill:score-5,fryer:score-8,packing:score,courier:score-15}, computed_at:now })
      return { ok:true, message:`Nabız ${score}'e çıkarıldı!`, details:[`⚡ ${rid}: ${score}/100`,`🏷️ ${score>=80?'KRİTİK':'RİSKLİ'}`] }
    }

    if (id === 'multi_crisis') {
      const lvl = Number(p.intensity) || 8
      for (const r of ['r6','r1','r9']) { const cur = await getPulse(r); if (cur) { const s=Math.min(99,80+lvl); await sb.from('pulse_scores').insert({ ...cur, id:undefined, score:s, risk_level:'KRITIK', open_orders:25+lvl*2, avg_prep_time:8+lvl*0.5, courier_wait:5+lvl*0.8, station_scores:{grill:s-5,fryer:s-8,packing:Math.min(99,s+2),courier:s-20}, computed_at:now }) }; await sb.from('orders').insert(Array.from({length:15+lvl},(_,i)=>({ restaurant_id:r, status:'ACTIVE', channel:'DELIVERY', total:200+Math.round(Math.random()*150), customer_name:`Demo ${i}`, created_at:now }))) }
      await sb.from('anomalies').insert([{ restaurant_id:'r6', type:'DEMAND_SPIKE', severity:'CRITICAL', title:'Popeyes Taksim: Tam Kapasite', description:`${15+lvl} sipariş dalgası`, acknowledged:false, detected_at:now },{ restaurant_id:'r1', type:'COURIER_BLACKOUT', severity:'CRITICAL', title:'BK Kadıköy: Kurye Kesildi', description:'Tüm kuryeler devre dışı', acknowledged:false, detected_at:now },{ restaurant_id:'r9', type:'POS_CRASH', severity:'CRITICAL', title:'BK Maltepe: Sistem Durdu', description:'POS bağlantısı kesildi', acknowledged:false, detected_at:now }])
      return { ok:true, message:'🔴 TAM KRİZ başlatıldı! AI müdahale edecek.', details:[`🔴 3 restoran kritik`,`📦 ${(15+lvl)*3} sipariş oluşturuldu`,`🚨 3 CRITICAL anomali`,`🤖 AI Otopilot devreye girecek…`] }
    }

    if (id === 'recovery') {
      for (const r of RESTAURANTS) { const cur = await getPulse(r.id); if (cur) { const s=25+Math.round(Math.random()*30); await sb.from('pulse_scores').insert({ ...cur, id:undefined, score:s, risk_level:s>=60?'YOGUN':'NORMAL', open_orders:5+Math.round(Math.random()*8), avg_prep_time:5+Math.random()*2, courier_wait:2+Math.random()*2, station_scores:{grill:30+Math.round(Math.random()*20),fryer:28+Math.round(Math.random()*18),packing:32+Math.round(Math.random()*22),courier:25+Math.round(Math.random()*15)}, rain_intensity:0, computed_at:now }) } }
      await sb.from('orders').update({ status:'COMPLETED' }).eq('status','ACTIVE')
      await sb.from('anomalies').update({ acknowledged:true, acknowledged_at:now }).eq('acknowledged',false)
      await sb.from('shifts').update({ status:'ACTIVE' }).eq('status','ABSENT')
      return { ok:true, message:'✅ Sistem sıfırlandı! Demo hazır.', details:[`✅ ${RESTAURANTS.length} restoran normale döndü`,`✅ Siparişler kapatıldı`,`✅ Anomaliler temizlendi`,`✅ Vardiyalar düzeltildi`] }
    }

    return { ok:false, message:'Bilinmeyen senaryo' }
  } catch (e: any) {
    return { ok:false, message:`Hata: ${e.message}` }
  }
}

export default function ScenariosPage() {
  const [params, setParams] = useState<Record<string, Record<string, any>>>({})
  const [running, setRunning] = useState<string|null>(null)
  const [results, setResults] = useState<Record<string, ScenarioResult>>({})

  const getP = (sid: string, key: string, def: any) => params[sid]?.[key] ?? def
  const setP = (sid: string, key: string, val: any) => setParams(p => ({ ...p, [sid]: { ...(p[sid]||{}), [key]: val } }))

  const execute = async (scen: typeof SCENARIOS[0]) => {
    setRunning(scen.id)
    const result = await run(scen.id, params[scen.id] || {})
    setResults(r => ({ ...r, [scen.id]: result }))
    setRunning(null)
  }

  return (
    <div className="dm">
      <Topbar title="Senaryo Simülatörü" subtitle="Demo & sunum için anlık tetikleyici — gerçek Supabase"/>
      <div className="scroll" style={{ padding:'clamp(14px,3vw,24px)', display:'flex', flexDirection:'column', gap:14 }}>

        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px', background:'var(--ac2)', border:'1px solid rgba(124,106,247,.2)', borderRadius:12 }}>
          <Zap size={15} style={{ color:'var(--ac)', flexShrink:0 }}/>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:'var(--tx)', marginBottom:2 }}>Sunum Senaryoları</p>
            <p style={{ fontSize:12, color:'var(--tx3)' }}>Gerçek Supabase'e yazar. AI Otopilot açıksa 30sn içinde sesli tepki verir. Sonunda "Sistemi Resetle" ile temizle.</p>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,320px),1fr))', gap:14 }}>
          {SCENARIOS.map(scen => {
            const Icon = scen.icon
            const res = results[scen.id]
            const isRunning = running === scen.id
            return (
              <div key={scen.id} style={{ background:'var(--s1)', border:`1px solid ${scen.border}`, borderRadius:14, overflow:'hidden', display:'flex', flexDirection:'column' }}>
                <div style={{ padding:'16px 18px', background:scen.bg, borderBottom:'1px solid var(--bdr)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:`${scen.color}18`, border:`1px solid ${scen.color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon size={16} style={{ color:scen.color }}/>
                    </div>
                    <p style={{ fontSize:14, fontWeight:700, color:'var(--tx)' }}>{scen.label}</p>
                  </div>
                  <p style={{ fontSize:12, color:'var(--tx3)', lineHeight:1.55 }}>{scen.desc}</p>
                </div>

                {scen.params.length > 0 && (
                  <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--bdr)', display:'flex', flexDirection:'column', gap:12 }}>
                    {scen.params.map((param: any) => (
                      <div key={param.key}>
                        <label style={{ fontSize:11, fontWeight:600, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:5 }}>{param.label}</label>
                        {param.type === 'select' ? (
                          <select value={getP(scen.id, param.key, 'r6')} onChange={e=>setP(scen.id,param.key,e.target.value)} className="inp" style={{ padding:'7px 10px', fontSize:12 }}>
                            {RESTAURANTS.map(r=><option key={r.id} value={r.id}>{r.name.replace('Burger King ','BK ').replace('Popeyes ','Pop.')}</option>)}
                          </select>
                        ) : (
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <input type="range" min={param.min??1} max={param.max??100} value={getP(scen.id,param.key,param.default??10)} onChange={e=>setP(scen.id,param.key,Number(e.target.value))} style={{ flex:1, accentColor:scen.color, cursor:'pointer' }}/>
                            <span style={{ fontSize:15, fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:scen.color, minWidth:32, textAlign:'right', flexShrink:0 }}>
                              {getP(scen.id,param.key,param.default??10)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {res && (
                  <div style={{ padding:'10px 18px', background:res.ok?'rgba(34,211,160,0.05)':'rgba(242,87,87,0.05)', borderBottom:'1px solid var(--bdr)' }}>
                    <p style={{ fontSize:12.5, fontWeight:600, color:res.ok?'var(--green)':'var(--red)', marginBottom:3 }}>{res.message}</p>
                    {res.details?.map((d,i)=><p key={i} style={{ fontSize:11, color:'var(--tx3)', marginTop:2 }}>{d}</p>)}
                  </div>
                )}

                <div style={{ padding:'12px 18px', marginTop:'auto' }}>
                  <button onClick={()=>execute(scen)} disabled={!!running}
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px', borderRadius:10, fontSize:13, fontWeight:600, cursor:running?'not-allowed':'pointer', background:isRunning?'var(--s2)':scen.color, color:isRunning?'var(--tx3)':'#fff', border:`1px solid ${isRunning?'var(--bdr)':'transparent'}`, opacity:running&&!isRunning?.5:1, boxShadow:isRunning?'none':`0 4px 14px ${scen.color}40`, transition:'all .15s' }}>
                    {isRunning ? <><Loader2 size={14} style={{ animation:'spin .7s linear infinite' }}/> Çalışıyor…</> : <><Play size={13}/> Başlat</>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
