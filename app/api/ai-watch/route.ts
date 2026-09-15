import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

  // Canlı verileri çek
  const [{ data: pulseRows }, { data: anomalyRows }, { data: orderRows }, { data: stockRows }] = await Promise.all([
    sb().from('pulse_scores').select('*').order('computed_at', { ascending: false }).limit(30),
    sb().from('anomalies').select('*').eq('acknowledged', false),
    sb().from('orders').select('*').eq('status', 'ACTIVE'),
    sb().from('stock_levels').select('*, products(name)').lte('quantity', 5),
  ])

  // En güncel pulse/restoran
  const latestPulse: Record<string, any> = {}
  for (const p of (pulseRows ?? [])) {
    if (!latestPulse[p.restaurant_id]) latestPulse[p.restaurant_id] = p
  }

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

  if (violations.length === 0 && !(anomalyRows?.length)) {
    return NextResponse.json({ status: 'OK', message: 'Tüm sistemler normal', violations: 0, decisions: [] })
  }

  // GPT-4o'ya gönder
  const prompt = `TAB Gıda Mutfak Nabzı AI Karar Motoru. Anlık ihlaller:

${violations.map(v => `- ${v.restaurant_id}: ${v.type} = ${v.value} [${v.severity}]`).join('\n')}
Onaysız anomali: ${(anomalyRows ?? []).length}
Kritik stok: ${(stockRows ?? []).map((s:any)=>`${s.restaurant_id}:${s.products?.name}(${s.quantity})`).join(', ')||'Yok'}
Aktif sipariş: ${(orderRows ?? []).length}

JSON döndür:
{
  "decisions": [
    {
      "restaurant_id": "r6",
      "action_type": "PACKING_OVERLOAD",
      "action": "3 personel packing takviyesi yapıldı",
      "severity": "HIGH",
      "voice_message": "Popeyes Taksim paketleme kritik. 3 personel takviye ediyorum. Onaylıyor musunuz?",
      "expected_impact": "Packing %78'e düşer, nabız 15 puan azalır"
    }
  ],
  "summary": "kısa özet"
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
