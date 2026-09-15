/**
 * POST /api/ai-watch
 * Sürekli izleme döngüsü — her çağrıda Supabase'i tarar,
 * eşik aşılırsa GPT-4o karar verir ve otomatik uygular.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SB_URL  = 'https://exkhzmpowcoxdzzvzisv.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4a2h6bXBvd2NveGR6enZ6aXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Mzg5OTUsImV4cCI6MjEwMzQxNDk5NX0.bysVio77j6ncmzYjt3T2saDPCmV3NnqbOyWFS987YIQ'
const sb = () => createClient(SB_URL, SB_ANON)

// Eşik değerleri
const THRESHOLDS = {
  packing_critical: 85,    // packing yükü %
  prep_critical: 10,       // dk
  courier_critical: 8,     // dk
  open_orders_critical: 30,// adet
  pulse_critical: 80,      // nabız skoru
}

export async function POST(req: NextRequest) {
  const { api_key, auto_apply = true } = await req.json().catch(() => ({}))
  const apiKey = api_key || process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'OpenAI API key gerekli' }, { status: 400 })

  // 1. Canlı verileri çek
  const [{ data: pulseRows }, { data: anomalyRows }, { data: orderRows }, { data: stockRows }] = await Promise.all([
    sb().from('pulse_scores').select('*').order('computed_at', { ascending: false }).limit(30),
    sb().from('anomalies').select('*').eq('acknowledged', false),
    sb().from('orders').select('*').eq('status', 'ACTIVE'),
    sb().from('stock_levels').select('*, products(name)').lte('quantity', 5),
  ])

  // En güncel pulse (restoran başına 1)
  const latestPulse: Record<string, any> = {}
  for (const p of (pulseRows ?? [])) {
    if (!latestPulse[p.restaurant_id]) latestPulse[p.restaurant_id] = p
  }

  // Eşik ihlallerini tespit et
  const violations: { restaurant_id: string; type: string; value: number; threshold: number; severity: string }[] = []
  for (const [rid, p] of Object.entries(latestPulse)) {
    const stations = (p.station_scores as Record<string, number>) ?? {}
    if ((stations.packing ?? 0) >= THRESHOLDS.packing_critical)
      violations.push({ restaurant_id: rid, type: 'PACKING_OVERLOAD', value: stations.packing, threshold: THRESHOLDS.packing_critical, severity: 'HIGH' })
    if ((p.avg_prep_time ?? 0) >= THRESHOLDS.prep_critical)
      violations.push({ restaurant_id: rid, type: 'PREP_SLOW', value: p.avg_prep_time, threshold: THRESHOLDS.prep_critical, severity: 'HIGH' })
    if ((p.courier_wait ?? 0) >= THRESHOLDS.courier_critical)
      violations.push({ restaurant_id: rid, type: 'COURIER_WAIT', value: p.courier_wait, threshold: THRESHOLDS.courier_critical, severity: 'MEDIUM' })
    if ((p.open_orders ?? 0) >= THRESHOLDS.open_orders_critical)
      violations.push({ restaurant_id: rid, type: 'ORDER_SURGE', value: p.open_orders, threshold: THRESHOLDS.open_orders_critical, severity: 'HIGH' })
    if ((p.score ?? 0) >= THRESHOLDS.pulse_critical)
      violations.push({ restaurant_id: rid, type: 'PULSE_CRITICAL', value: p.score, threshold: THRESHOLDS.pulse_critical, severity: 'CRITICAL' })
  }

  // İhlal yoksa çık
  if (violations.length === 0 && (anomalyRows ?? []).length === 0 && (stockRows ?? []).length === 0) {
    return NextResponse.json({ status: 'OK', message: 'Tüm sistemler normal', violations: 0, decisions: [] })
  }

  // 2. GPT-4o'ya gönder
  const prompt = `Sen TAB Gıda Mutfak Nabzı AI Karar Motorusun. Anlık operasyon verisine bakarak HEMEN karar ver.

TESPİT EDİLEN İHLALLER:
${violations.map(v => `- ${v.restaurant_id}: ${v.type} = ${v.value} (eşik: ${v.threshold}) [${v.severity}]`).join('\n')}

ONAYSIZANOMALİLER: ${(anomalyRows ?? []).length} adet
KRİTİK STOK: ${(stockRows ?? []).map((s: any) => `${s.restaurant_id}: ${s.products?.name} (${s.quantity} adet)`).join(', ') || 'Yok'}
AKTİF SİPARİŞ: ${(orderRows ?? []).length} adet

JSON yanıtı:
{
  "decisions": [
    {
      "restaurant_id": "r6",
      "trigger": "PACKING_OVERLOAD",
      "action": "3 personel packing istasyonuna takviye edildi",
      "action_type": "STAFF_ADD",
      "severity": "HIGH",
      "voice_message": "Popeyes Taksim'de paketleme yavaşlıyor. 3 personel takviye ediyorum. Onaylıyor musunuz?",
      "auto_applied": true,
      "expected_impact": "Packing yükü 15 dk içinde %60'a düşer"
    }
  ],
  "summary": "Kısa özet",
  "total_actions": 2
}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1200,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) return NextResponse.json({ error: `OpenAI: ${res.status}` }, { status: 500 })
  const aiData = await res.json()
  let result: any
  try { result = JSON.parse(aiData.choices[0].message.content) } catch { return NextResponse.json({ error: 'Parse hatası' }, { status: 500 }) }

  // 3. Kararları Supabase'e kaydet + uygula
  const applied: any[] = []
  for (const decision of (result.decisions ?? [])) {
    // ai_recommendations'a kaydet
    const { data: rec } = await sb().from('ai_recommendations').insert({
      restaurant_id: decision.restaurant_id,
      summary: decision.action,
      risk_explanation: `Otomatik: ${decision.trigger} — ${decision.severity}`,
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

    // Audit log
    await sb().from('audit_logs').insert({
      user_role: 'AI Watch Motor',
      action: 'AUTO_DECISION',
      resource: 'restaurant',
      details: {
        restaurant_id: decision.restaurant_id,
        trigger: decision.trigger,
        action: decision.action,
        severity: decision.severity,
        auto_applied: auto_apply,
      },
    })

    applied.push({ ...decision, saved: !!rec })
  }

  // 4. Anomalileri onayla (WARNING ve INFO)
  for (const a of (anomalyRows ?? [])) {
    if (a.severity !== 'CRITICAL') {
      await sb().from('anomalies').update({ acknowledged: true, acknowledged_at: new Date().toISOString() }).eq('id', a.id)
    }
  }

  return NextResponse.json({
    status: 'DECISIONS_MADE',
    violations: violations.length,
    decisions: applied,
    summary: result.summary,
    total_actions: result.total_actions ?? applied.length,
    auto_applied: auto_apply,
    timestamp: new Date().toISOString(),
  })
}
