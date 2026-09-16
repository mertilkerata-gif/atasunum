import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const COLLECT_API_KEY = 'apikey 1XOyvFOuk2Txiq3KnAfSD8:5jubPvRPCdXqqi4jQACuqD'

async function getLiveWeather() {
  try {
    const res = await fetch('https://api.collectapi.com/weather/getWeather?lang=tr&city=istanbul', {
      headers: { 'content-type':'application/json', 'authorization':COLLECT_API_KEY }
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.success || !data.result?.[0]) return null
    const desc = (data.result[0].description || '').toLowerCase()
    const isRain = ['yagmur','saganak','yagis','firtina','yagmurlu'].some(k=>desc.includes(k))
    return { isRain, intensity: desc.includes('saganak')||desc.includes('firtina') ? 0.8 : isRain ? 0.5 : 0, desc: data.result[0].description }
  } catch { return null }
}

const SB_URL  = 'https://exkhzmpowcoxdzzvzisv.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4a2h6bXBvd2NveGR6enZ6aXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Mzg5OTUsImV4cCI6MjEwMzQxNDk5NX0.bysVio77j6ncmzYjt3T2saDPCmV3NnqbOyWFS987YIQ'
const sb = () => createClient(SB_URL, SB_ANON)

const THRESHOLDS = {
  packing_critical: 85,
  prep_critical: 10,
  courier_critical: 8,
  open_orders_critical: 30,
  pulse_critical: 80,
}

// Aksiyona göre pulse_scores'u güncelle — gerçek etki
async function applyActionToPulse(restaurantId: string, actionType: string, latestPulse: any) {
  const stations = { ...(latestPulse.station_scores || {}) } as Record<string,number>
  let newScore    = latestPulse.score
  let newPrepTime = latestPulse.avg_prep_time || 0
  let newCourierWait = latestPulse.courier_wait || 0
  let newOpenOrders  = latestPulse.open_orders || 0

  switch (actionType) {
    case 'PACKING_OVERLOAD':
      // Personel takviyesi → packing %15-25 düşer
      stations.packing  = Math.max(20, (stations.packing  || 80) - 22)
      stations.grill    = Math.max(20, (stations.grill    || 70) - 10)
      newPrepTime       = Math.max(4,  newPrepTime - 2.5)
      newScore          = Math.max(10, newScore - 18)
      break
    case 'PREP_SLOW':
      // Grill/fryer hızlandırma → hazırlama süresi düşer
      stations.grill  = Math.max(20, (stations.grill  || 80) - 18)
      stations.fryer  = Math.max(20, (stations.fryer  || 75) - 15)
      newPrepTime     = Math.max(4,  newPrepTime - 3)
      newScore        = Math.max(10, newScore - 15)
      break
    case 'COURIER_WAIT':
      // Kurye yeniden yönlendirme → bekleme düşer
      stations.courier  = Math.max(20, (stations.courier || 80) - 20)
      newCourierWait    = Math.max(2,  newCourierWait - 4)
      newScore          = Math.max(10, newScore - 10)
      break
    case 'ORDER_SURGE':
      // Kapasite artışı → sipariş baskısı azalır
      newOpenOrders = Math.max(5, newOpenOrders - 12)
      newScore      = Math.max(10, newScore - 12)
      break
    case 'PULSE_CRITICAL':
      // Genel iyileştirme aksiyonu
      stations.packing = Math.max(20, (stations.packing || 90) - 20)
      stations.grill   = Math.max(20, (stations.grill   || 85) - 15)
      stations.courier = Math.max(20, (stations.courier || 80) - 15)
      newPrepTime      = Math.max(4,  newPrepTime  - 2)
      newCourierWait   = Math.max(2,  newCourierWait - 2)
      newOpenOrders    = Math.max(5,  newOpenOrders - 8)
      newScore         = Math.max(10, newScore - 20)
      break
  }

  const newRisk = newScore >= 80 ? 'KRITIK' : newScore >= 60 ? 'RISKLI' : newScore >= 40 ? 'YOGUN' : 'NORMAL'

  // Yeni pulse_scores satırı ekle (INSERT — mevcut geçmişi koru)
  const { error } = await sb().from('pulse_scores').insert({
    restaurant_id: restaurantId,
    score: Math.round(newScore),
    risk_level: newRisk,
    station_scores: stations,
    avg_prep_time: +newPrepTime.toFixed(1),
    courier_wait: +newCourierWait.toFixed(1),
    open_orders: Math.round(newOpenOrders),
    avg_packing_time: latestPulse.avg_packing_time || 3,
    top_signals: [`AI Aksiyonu uygulandı — ${actionType}`],
    computed_at: new Date().toISOString(),
  })

  return { error, newScore: Math.round(newScore), newRisk }
}

export async function POST(req: NextRequest) {
  const { api_key, auto_apply = true } = await req.json().catch(() => ({}))
  const apiKey = api_key || process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'OpenAI API key gerekli' }, { status: 400 })

  const liveWeather = await getLiveWeather()
  const today = new Date().toISOString().split('T')[0]
  const [{ data: pulseRows }, { data: anomalyRows }, { data: orderRows }, { data: stockRows }, { data: weatherEventRows }, { data: shiftRows }, { data: complaintRows }, { data: eventRows }] = await Promise.all([
    (async () => {
      const rpcResult = await sb().rpc('get_latest_pulse_scores')
      if (rpcResult.error || !rpcResult.data?.length) {
        // RPC başarısız — direkt query ile al
        return sb().from('pulse_scores').select('*').order('computed_at', { ascending: false }).limit(200)
      }
      return rpcResult
    })(),
    sb().from('anomalies').select('*').eq('acknowledged', false),
    sb().from('orders').select('*').eq('status', 'ACTIVE'),
    sb().from('stock_levels').select('*, products(name, emoji)').lte('quantity', 10),
    sb().from('events').select('*').eq('event_date', today).eq('event_type', 'WEATHER').limit(1),
    sb().from('shifts').select('restaurant_id,status,role').gte('shift_start', today + 'T00:00:00').lte('shift_start', today + 'T23:59:59'),
    sb().from('events').select('*').gte('event_date', today).lte('event_date', new Date(Date.now()+86400000*2).toISOString().split('T')[0]),
    sb().from('complaints').select('restaurant_id,reason').eq('status', 'OPEN').order('created_at', { ascending: false }).limit(20) as any,
  ])

  // District → Restaurant ID map
  const DISTRICT_MAP: Record<string, string[]> = {
    'Beşiktaş':['r1'],'Kadıköy':['r2'],'Maltepe':['r3'],'Pendik':['r4'],
    'Ümraniye':['r5'],'Taksim':['r6'],'Bağcılar':['r7'],'Şişli':['r8'],
    'Bakırköy':['r9'],'Üsküdar':['r10'],
  }

  // Events → hangi restoranlar etkileniyor
  const todayEvents = (eventRows ?? []).filter((e:any) => e.event_date === today)
  const upcomingEvents = (eventRows ?? []).filter((e:any) => e.event_date !== today)
  const eventImpactMap: Record<string,any[]> = {}
  for (const ev of (eventRows ?? [])) {
    for (const district of (ev.affected_districts || [])) {
      const rids = DISTRICT_MAP[district] || []
      for (const rid of rids) {
        if (!eventImpactMap[rid]) eventImpactMap[rid] = []
        eventImpactMap[rid].push(ev)
      }
    }
  }

  // Hava — CollectAPI önce, events tablosu fallback
  const weatherEvent = (weatherEventRows ?? [])[0]
  const rainFromAPI = liveWeather?.isRain ?? false
  const rainFromDB  = weatherEvent && ['HIGH','MEDIUM','CRITICAL'].includes(weatherEvent.impact_level)
  const rainActive  = rainFromAPI || rainFromDB
  const rainIntensity = liveWeather?.intensity ?? (rainFromDB ? 0.7 : 0)
  const rainDesc = liveWeather?.desc ?? weatherEvent?.description ?? ''
  const rainRestaurants = rainActive ? Object.keys(DISTRICT_MAP).flatMap((d:string) => DISTRICT_MAP[d]) : []
  const campaignRestaurants: string[] = []

  const absentByRest: Record<string,number> = {}
  for (const sh of (shiftRows ?? [])) {
    if (sh.status === 'ABSENT') absentByRest[sh.restaurant_id] = (absentByRest[sh.restaurant_id]||0) + 1
  }
  const complaintsByRest: Record<string,number> = {}
  for (const c of (complaintRows ?? [])) {
    complaintsByRest[c.restaurant_id] = (complaintsByRest[c.restaurant_id]||0) + 1
  }



  // En güncel pulse/restoran
  // Her restoran için en son pulse — string değerleri number'a çevir
  const latestPulse: Record<string, any> = {}
  for (const p of (pulseRows ?? [])) {
    const norm = {
      ...p,
      score:          Number(p.score ?? 0),
      avg_prep_time:  Number(p.avg_prep_time ?? 0),
      avg_packing_time: Number(p.avg_packing_time ?? 0),
      courier_wait:   Number(p.courier_wait ?? 0),
      open_orders:    Number(p.open_orders ?? 0),
      station_scores: {
        grill:   Number(p.station_scores?.grill   ?? 0),
        fryer:   Number(p.station_scores?.fryer   ?? 0),
        packing: Number(p.station_scores?.packing ?? 0),
        courier: Number(p.station_scores?.courier ?? 0),
      }
    }
    const ex = latestPulse[p.restaurant_id]
    if (!ex || new Date(p.computed_at) > new Date(ex.computed_at)) {
      latestPulse[p.restaurant_id] = norm
    }
  }
  console.log('[ai-watch] pulse:', Object.entries(latestPulse).map(([id,p]:any)=>`${id}=${p.score}`).join(' | '))

  // Eşik ihlali tespiti
  const violations: any[] = []
  for (const [rid, p] of Object.entries(latestPulse)) {
    const stations = (p.station_scores as Record<string,number>) ?? {}
    if ((stations.packing ?? 0) >= THRESHOLDS.packing_critical)
      violations.push({ restaurant_id: rid, type: 'PACKING_OVERLOAD', value: stations.packing, severity: 'HIGH' })
    if ((p.avg_prep_time ?? 0) >= THRESHOLDS.prep_critical)
      violations.push({ restaurant_id: rid, type: 'PREP_SLOW', value: p.avg_prep_time, severity: 'HIGH' })
    if ((p.courier_wait ?? 0) >= THRESHOLDS.courier_critical)
      violations.push({ restaurant_id: rid, type: 'COURIER_WAIT', value: p.courier_wait, severity: 'MEDIUM' })
    if ((p.open_orders ?? 0) >= THRESHOLDS.open_orders_critical)
      violations.push({ restaurant_id: rid, type: 'ORDER_SURGE', value: p.open_orders, severity: 'HIGH' })
    if ((p.score ?? 0) >= THRESHOLDS.pulse_critical)
      violations.push({ restaurant_id: rid, type: 'PULSE_CRITICAL', value: p.score, severity: 'CRITICAL' })
  }

  // Kritik stok için ek ihlaller
  const stockByRest: Record<string,string[]> = {}
  for (const s of (stockRows ?? [])) {
    if (!stockByRest[s.restaurant_id]) stockByRest[s.restaurant_id] = []
    stockByRest[s.restaurant_id].push(`${s.products?.emoji||''}${s.products?.name}(${s.quantity})`)
  }
  for (const [rid, items] of Object.entries(stockByRest)) {
    violations.push({ restaurant_id: rid, type: 'STOCK_REPLENISHMENT', value: items.length, severity: 'MEDIUM', items })
  }

  // Yağmur için ek ihlaller
  if (rainActive) {
    for (const rid of rainRestaurants) {
      const p = latestPulse[rid]
      if (p && !violations.find((v:any) => v.restaurant_id===rid && v.type==='COURIER_WAIT')) {
        violations.push({
          restaurant_id: rid,
          type: 'COURIER_WAIT',
          value: +(( (p.courier_wait||3) + rainIntensity*8 )).toFixed(1),
          severity: rainIntensity > 0.6 ? 'HIGH' : 'MEDIUM',
          context: 'yağmur'
        })
      }
    }
  }

  if (violations.length === 0 && !(anomalyRows?.length)) {
    return NextResponse.json({ status: 'OK', message: 'Tüm sistemler normal', violations: 0, decisions: [] })
  }

  // Restoran adlarını ekle
  const restNames: Record<string,string> = {}
  for (const [rid, p] of Object.entries(latestPulse)) {
    restNames[rid] = (p as any).restaurant_name || rid
  }
  // Supabase'den restoran adlarını çek
  const { data: restRows } = await sb().from('restaurants').select('id,name')
  if (restRows) { for (const r of restRows) restNames[r.id] = r.name }

  // GPT-4o'ya gönder — HER ihlal için ayrı karar zorunlu
  const violationLines = violations.map(v => {
    const name = restNames[v.restaurant_id] || v.restaurant_id
    const p = latestPulse[v.restaurant_id]
    return `- ${v.restaurant_id} (${name}): ${v.type} = ${v.value} [${v.severity}] | Nabız:${p?.score} | Hazırlama:${p?.avg_prep_time?.toFixed(1)}dk | Kurye:${p?.courier_wait?.toFixed(1)}dk`
  }).join('\n')

  const prompt = `Sen TAB Gıda Mutfak Nabzı AI Karar Motorusun. Aşağıdaki GERÇEK ihlalleri analiz et ve HER ihlal için AYRI bir karar üret.

MEVCUT İHLALLER (restoran adıyla):
${violationLines}

ONAYSIZ ANOMALİ: ${(anomalyRows ?? []).length}
KRİTİK STOK: ${(stockRows ?? []).map((s:any)=>`${restNames[s.restaurant_id]||s.restaurant_id}: ${s.products?.name}(${s.quantity})`).join(', ')||'Yok'}
YAĞMUR DURUMU: ${rainActive ? `YAĞMURLU — ${weatherEvent?.title} — Tüm ağda kurye gecikmesi, TG siparişleri artıyor` : 'Yok — hava normal'}
KAMPANYALı RESTORANLAR: ${campaignRestaurants.map(id=>restNames[id]||id).join(', ')||'Yok'} — ekstra kapasite baskısı var
GELMEMİŞ PERSONEL: ${Object.entries(absentByRest).map(([id,n])=>`${restNames[id]||id}: ${n} kişi`).join(', ')||'Yok'}
AÇIK ŞİKAYET: ${Object.entries(complaintsByRest).map(([id,n])=>`${restNames[id]||id}: ${n}`).join(', ')||'Yok'}
SAAT: ${new Date().toLocaleTimeString('tr-TR')} — ${new Date().getHours()>=18&&new Date().getHours()<=21?'AKŞAM YOĞUNLUK SAATİ (18-21)':new Date().getHours()>=11&&new Date().getHours()<=14?'ÖĞLE YOĞUNLUK SAATİ (11-14)':'normal saat'}

BUGÜNKÜ ÖZEL ETKINLIKLER:
${todayEvents.length === 0 ? 'Yok' : todayEvents.map((e:any) => {
  const affRests = (e.affected_districts||[]).flatMap((d:string)=>(DISTRICT_MAP[d]||[]).map((r:string)=>restNames[r]||r))
  return `- ${e.event_type}: "${e.title}" | Etki: %+${e.expected_order_increase_pct} sipariş | Seviye: ${e.impact_level} | ${e.venue||''} ${e.kickoff_time?'Başlangıç:'+e.kickoff_time:''} | Etkilenen restoranlar: ${affRests.join(', ')}`
}).join('\n')}

YAKLAŞAN ETKİNLİKLER (2 gün):
${upcomingEvents.length === 0 ? 'Yok' : upcomingEvents.map((e:any) => `- ${e.event_date}: ${e.event_type} — "${e.title}" (+%${e.expected_order_increase_pct})`).join('\n')}

ETKINLIK ETKİSİNDEKİ RESTORANLAR (bugün):
${Object.entries(eventImpactMap).filter(([,evs])=>(evs as any[]).some((e:any)=>e.event_date===today)).map(([rid,evs])=>`${restNames[rid]||rid}: ${(evs as any[]).map((e:any)=>e.title).join(', ')}`).join('\n')||'Yok'}

KURALLAR:
1. decisions dizisinde her ihlal eden restoran için AYRI bir entry oluştur
2. restaurant_id alanına MUTLAKA yukarıdaki listedeki gerçek ID'yi yaz (r1, r2, r3... gibi)
3. voice_message'da restoran adını ve sorunu Türkçe açıkla
4. action_type şunlardan biri olmalı: PACKING_OVERLOAD, PREP_SLOW, COURIER_WAIT, ORDER_SURGE, PULSE_CRITICAL, STOCK_REPLENISHMENT
5. Yağmurlu restoranlarda kurye gecikmesine karşı önlem al, TG siparişlerinin artacağını belirt
6. Kampanyalı restoranlarda kapasite baskısına dikkat et
7. Gelmemiş personel varsa istasyon yükü artacağını hesaba kat
8. Akşam yoğunluk saatinde (18-21) kararları daha proaktif ver
9. Maç/konser/tatil olan bölgelerdeki restoranlar için önceden (maçtan 2 saat önce) stok ve personel hazırlığı öner
10. Etkinlik bölgelerinde sipariş artışı %30+ beklentisiyle kapasite planlaması yap
11. Maç sonrası (22:00-23:30) kurye baskısına karşı önceden kurye kapasitesini artır

JSON formatı:
{
  "decisions": [
    {
      "restaurant_id": "buraya_gercek_id_yaz",
      "action_type": "PACKING_OVERLOAD",
      "action": "Yapılan somut aksiyon",
      "severity": "HIGH",
      "voice_message": "Restoran Adı'nda sorun. Aksiyon alıyorum.",
      "expected_impact": "Beklenen etki"
    }
  ],
  "summary": "kısa genel özet"
}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o', max_tokens: 800, temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) return NextResponse.json({ error: `OpenAI: ${res.status}` }, { status: 500 })
  const aiData = await res.json()
  let result: any
  try { result = JSON.parse(aiData.choices[0].message.content) }
  catch { return NextResponse.json({ error: 'Parse hatası' }, { status: 500 }) }

  // Kararları uygula — hem kaydet hem GERÇEKTEN pulse güncelle
  const applied: any[] = []
  const pulseUpdates: any[] = []

  for (const decision of (result.decisions ?? [])) {
    // 1. ai_recommendations kaydet
    const { data: rec } = await sb().from('ai_recommendations').insert({
      restaurant_id: decision.restaurant_id,
      summary: decision.action,
      risk_explanation: `Otomatik: ${decision.action_type} — ${decision.severity}`,
      forecast_note: `AI Watch — ${new Date().toLocaleTimeString('tr-TR')}`,
    }).select().single()

    if (rec) {
      await sb().from('recommendation_actions').insert({
        recommendation_id: rec.id,
        action_text: decision.action,
        priority: decision.severity === 'CRITICAL' ? 'HIGH' : decision.severity,
        expected_improvement: decision.expected_impact,
        applied: auto_apply,
        applied_at: auto_apply ? new Date().toISOString() : null,
      })
    }

    // 2. Eğer onaylandıysa (auto_apply=true) PULSE SKORUNU GERÇEKTEN GÜNCELLE
    if (auto_apply && latestPulse[decision.restaurant_id]) {
      const updateResult = await applyActionToPulse(
        decision.restaurant_id,
        decision.action_type,
        latestPulse[decision.restaurant_id]
      )
      if (!updateResult.error) {
        pulseUpdates.push({
          restaurant_id: decision.restaurant_id,
          old_score: latestPulse[decision.restaurant_id].score,
          new_score: updateResult.newScore,
          new_risk: updateResult.newRisk,
        })
        // Lokal güncelle ki aynı restorana tekrar işlem yapılmasın
        latestPulse[decision.restaurant_id].score = updateResult.newScore
      }
    }

    // 3. Audit log
    await sb().from('audit_logs').insert({
      user_role: 'AI Watch Motor',
      action: 'AUTO_DECISION',
      resource: 'restaurant',
      details: {
        restaurant_id: decision.restaurant_id,
        action_type: decision.action_type,
        action: decision.action,
        severity: decision.severity,
        auto_applied: auto_apply,
        pulse_updated: pulseUpdates.some(p => p.restaurant_id === decision.restaurant_id),
      },
    })

    applied.push({ ...decision, saved: !!rec, pulse_updated: auto_apply })
  }

  // Anomalileri onayla
  for (const a of (anomalyRows ?? [])) {
    if (a.severity !== 'CRITICAL') {
      await sb().from('anomalies').update({ acknowledged: true, acknowledged_at: new Date().toISOString() }).eq('id', a.id)
    }
  }

  return NextResponse.json({
    status: 'DECISIONS_MADE',
    violations: violations.length,
    decisions: applied,
    pulse_updates: pulseUpdates,
    summary: result.summary,
    auto_applied: auto_apply,
    timestamp: new Date().toISOString(),
  })
}

export async function GET() {
  const { data } = await sb().from('audit_logs')
    .select('*').eq('action', 'AUTO_DECISION')
    .order('created_at', { ascending: false }).limit(5).single()
  return NextResponse.json({ last_run: data })
}
