import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SB_URL  = 'https://exkhzmpowcoxdzzvzisv.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4a2h6bXBvd2NveGR6enZ6aXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Mzg5OTUsImV4cCI6MjEwMzQxNDk5NX0.bysVio77j6ncmzYjt3T2saDPCmV3NnqbOyWFS987YIQ'
const sb = () => createClient(SB_URL, SB_ANON)

const THRESHOLDS = { packing: 75, prep: 8, courier: 6, orders: 25, pulse: 70 }

async function applyToPulse(restaurantId: string, actionType: string) {
  const { data: cur } = await sb().from('pulse_scores').select('*')
    .eq('restaurant_id', restaurantId).order('computed_at', { ascending: false }).limit(1).single()
  if (!cur) return null
  const s = (f: string) => Number((cur.station_scores as any)?.[f] ?? 0)
  let score = Number(cur.score), prep = Number(cur.avg_prep_time || 0)
  let courier = Number(cur.courier_wait || 0), orders = Number(cur.open_orders || 0)
  const stations = { grill: s('grill'), fryer: s('fryer'), packing: s('packing'), courier: s('courier') }

  switch (actionType) {
    case 'PACKING_OVERLOAD': stations.packing=Math.max(20,stations.packing-22); prep=Math.max(4,prep-2.5); score=Math.max(10,score-18); break
    case 'PREP_SLOW':        stations.grill=Math.max(20,stations.grill-18); prep=Math.max(4,prep-3); score=Math.max(10,score-15); break
    case 'COURIER_WAIT':     stations.courier=Math.max(20,stations.courier-20); courier=Math.max(2,courier-4); score=Math.max(10,score-10); break
    case 'ORDER_SURGE':      orders=Math.max(5,orders-12); score=Math.max(10,score-12); break
    case 'PULSE_CRITICAL':   stations.packing=Math.max(20,stations.packing-20); stations.grill=Math.max(20,stations.grill-15); prep=Math.max(4,prep-2); courier=Math.max(2,courier-2); orders=Math.max(5,orders-8); score=Math.max(10,score-20); break
    case 'STOCK_REPLENISHMENT': score=Math.max(10,score-5); break
    default: score=Math.max(10,score-5)
  }
  const risk = score>=80?'KRITIK':score>=60?'RISKLI':score>=40?'YOGUN':'NORMAL'
  await sb().from('pulse_scores').insert({
    restaurant_id: restaurantId, score: Math.round(score), risk_level: risk,
    station_scores: stations, avg_prep_time: +prep.toFixed(1), courier_wait: +courier.toFixed(1),
    open_orders: Math.round(orders), avg_packing_time: Number(cur.avg_packing_time || 3),
    top_signals: [`AI aksiyonu: ${actionType}`], computed_at: new Date().toISOString(),
  })
  return { old_score: Math.round(Number(cur.score)), new_score: Math.round(score), new_risk: risk }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const apiKey = body.api_key || process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key gerekli' }, { status: 400 })
  const auto_apply = body.auto_apply ?? true

  // 1. Her restoran için EN SON pulse — DISTINCT ON ile
  const { data: pulseRows, error: pulseErr } = await sb().rpc('get_latest_pulse_scores')
  const rows = (!pulseErr && pulseRows?.length) ? pulseRows
    : (await sb().from('pulse_scores').select('*').order('computed_at', { ascending: false }).limit(200)).data ?? []

  // Her restoran için en güncel — number'a çevir
  const latest: Record<string,any> = {}
  for (const p of rows) {
    const norm = {
      ...p,
      score:          Number(p.score ?? 0),
      avg_prep_time:  Number(p.avg_prep_time ?? 0),
      courier_wait:   Number(p.courier_wait ?? 0),
      open_orders:    Number(p.open_orders ?? 0),
      station_scores: {
        grill:   Number(p.station_scores?.grill   ?? 0),
        fryer:   Number(p.station_scores?.fryer   ?? 0),
        packing: Number(p.station_scores?.packing ?? 0),
        courier: Number(p.station_scores?.courier ?? 0),
      }
    }
    const ex = latest[p.restaurant_id]
    if (!ex || new Date(p.computed_at) > new Date(ex.computed_at)) latest[p.restaurant_id] = norm
  }

  console.log('[ai-watch] restoranlar:', Object.entries(latest).map(([id,p]:any)=>`${id}=${p.score}`).join(' '))

  // 2. İhlalleri tespit et
  const violations: any[] = []
  for (const [rid, p] of Object.entries(latest)) {
    if (p.station_scores.packing >= THRESHOLDS.packing) violations.push({ restaurant_id:rid, type:'PACKING_OVERLOAD', value:p.station_scores.packing, severity:'HIGH' })
    if (p.avg_prep_time >= THRESHOLDS.prep)             violations.push({ restaurant_id:rid, type:'PREP_SLOW',        value:p.avg_prep_time,            severity:'HIGH' })
    if (p.courier_wait  >= THRESHOLDS.courier)          violations.push({ restaurant_id:rid, type:'COURIER_WAIT',     value:p.courier_wait,             severity:'MEDIUM' })
    if (p.open_orders   >= THRESHOLDS.orders)           violations.push({ restaurant_id:rid, type:'ORDER_SURGE',      value:p.open_orders,              severity:'HIGH' })
    if (p.score         >= THRESHOLDS.pulse)            violations.push({ restaurant_id:rid, type:'PULSE_CRITICAL',   value:p.score,                    severity:'CRITICAL' })
  }

  // Kritik stok
  const { data: stockRows } = await sb().from('stock_levels').select('restaurant_id, quantity, min_threshold').lte('quantity', 10)
  const stockMap: Record<string,string[]> = {}
  for (const s of (stockRows ?? [])) {
    if (!stockMap[s.restaurant_id]) stockMap[s.restaurant_id] = []
    stockMap[s.restaurant_id].push(`stok(${s.quantity})`)
  }
  for (const [rid, items] of Object.entries(stockMap)) {
    violations.push({ restaurant_id:rid, type:'STOCK_REPLENISHMENT', value:items.length, severity:'MEDIUM', items })
  }

  console.log('[ai-watch] ihlaller:', violations.length, violations.map((v:any)=>`${v.restaurant_id}:${v.type}`).join(' '))

  if (!violations.length) return NextResponse.json({ status:'OK', message:'Tüm sistemler normal', violations:0, decisions:[] })

  // 3. Restoran adlarını çek
  const { data: restRows } = await sb().from('restaurants').select('id, name, district')
  const restNames: Record<string,string> = {}
  for (const r of (restRows ?? [])) restNames[r.id] = r.name

  // 4. GPT-4o'ya gönder
  const violationText = violations.map(v => {
    const p = latest[v.restaurant_id]
    return `- ${v.restaurant_id} (${restNames[v.restaurant_id]||v.restaurant_id}): ${v.type}=${v.value} | Nabız=${p?.score} | Hazır=${p?.avg_prep_time}dk | Kurye=${p?.courier_wait}dk | Sipariş=${p?.open_orders} | Packing=${p?.station_scores?.packing}%`
  }).join('\n')

  const prompt = `TAB Gıda AI Karar Motoru. Aşağıdaki ihlaller için JSON karar üret.

İHLALLER:
${violationText}

KURALLAR:
1. Her ihlal eden restoran için AYRI karar
2. restaurant_id yukarıdaki listeden al (r1..r10)
3. action_type: PACKING_OVERLOAD/PREP_SLOW/COURIER_WAIT/ORDER_SURGE/PULSE_CRITICAL/STOCK_REPLENISHMENT
4. voice_message Türkçe, kısa

{"decisions":[{"restaurant_id":"r1","action_type":"PULSE_CRITICAL","action":"Müdahale uygulandı","severity":"HIGH","voice_message":"Türkçe sesli bildirim","expected_impact":"Nabız düşer"}],"summary":"özet"}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${apiKey}`},
    body: JSON.stringify({ model:'gpt-4o', max_tokens:1000, temperature:0.1, response_format:{type:'json_object'}, messages:[{role:'user',content:prompt}] }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(()=>'')
    console.error('[ai-watch] OpenAI hata:', res.status, errBody.slice(0,200))
    return NextResponse.json({ error:`OpenAI: ${res.status}`, detail: errBody.slice(0,200) }, { status:500 })
  }
  const aiData = await res.json()
  let result: any
  try { result = JSON.parse(aiData.choices[0].message.content) }
  catch(e) {
    console.error('[ai-watch] Parse hatası:', aiData.choices?.[0]?.message?.content?.slice(0,200))
    return NextResponse.json({ error:'Parse hatası' }, { status:500 })
  }

  // 5. Uygula + kaydet
  const applied: any[] = []
  const pulseUpdates: any[] = []

  for (const dec of (result.decisions ?? [])) {
    if (auto_apply && latest[dec.restaurant_id]) {
      const upd = await applyToPulse(dec.restaurant_id, dec.action_type)
      if (upd) pulseUpdates.push({ restaurant_id:dec.restaurant_id, ...upd })
    }

    const { data: rec } = await sb().from('ai_recommendations').insert({
      restaurant_id: dec.restaurant_id, summary: dec.action,
      risk_explanation: `${dec.action_type} — ${dec.severity}`,
      forecast_note: `AI Watch — ${new Date().toLocaleTimeString('tr-TR')}`,
    }).select().single()

    if (rec) {
      await sb().from('recommendation_actions').insert({
        recommendation_id: rec.id, action_text: dec.action,
        priority: dec.severity==='CRITICAL'?'HIGH':dec.severity,
        expected_improvement: dec.expected_impact,
        applied: auto_apply, applied_at: auto_apply?new Date().toISOString():null,
      })
    }

    await sb().from('audit_logs').insert({
      user_role:'AI Watch Motor', action:'AUTO_DECISION', resource:'restaurant',
      details:{ restaurant_id:dec.restaurant_id, action_type:dec.action_type, action:dec.action, severity:dec.severity, auto_applied:auto_apply, pulse_updated:pulseUpdates.some(p=>p.restaurant_id===dec.restaurant_id) },
    })

    applied.push({ ...dec, pulse_updated:auto_apply })
  }

  return NextResponse.json({ status:'DECISIONS_MADE', violations:violations.length, decisions:applied, pulse_updates:pulseUpdates, summary:result.summary, auto_applied:auto_apply, timestamp:new Date().toISOString() })
}
