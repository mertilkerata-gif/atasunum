import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SB_URL  = 'https://exkhzmpowcoxdzzvzisv.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4a2h6bXBvd2NveGR6enZ6aXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Mzg5OTUsImV4cCI6MjEwMzQxNDk5NX0.bysVio77j6ncmzYjt3T2saDPCmV3NnqbOyWFS987YIQ'
const sb = () => createClient(SB_URL, SB_ANON)

async function applyToPulse(restaurantId: string, actionType: string) {
  const { data: cur } = await sb().from('pulse_scores').select('*')
    .eq('restaurant_id', restaurantId).order('computed_at', { ascending: false }).limit(1).single()
  if (!cur) return null
  const stations = { ...(cur.station_scores || {}) } as Record<string, number>
  let score = cur.score, prep = cur.avg_prep_time || 0, courier = cur.courier_wait || 0, orders = cur.open_orders || 0
  switch (actionType) {
    case 'PACKING_OVERLOAD': stations.packing=Math.max(20,(stations.packing||80)-22); stations.grill=Math.max(20,(stations.grill||70)-10); prep=Math.max(4,prep-2.5); score=Math.max(10,score-18); break
    case 'PREP_SLOW':        stations.grill=Math.max(20,(stations.grill||80)-18); stations.fryer=Math.max(20,(stations.fryer||75)-15); prep=Math.max(4,prep-3); score=Math.max(10,score-15); break
    case 'COURIER_WAIT':     stations.courier=Math.max(20,(stations.courier||80)-20); courier=Math.max(2,courier-4); score=Math.max(10,score-10); break
    case 'ORDER_SURGE':      orders=Math.max(5,orders-12); score=Math.max(10,score-12); break
    case 'PULSE_CRITICAL':   stations.packing=Math.max(20,(stations.packing||90)-20); stations.grill=Math.max(20,(stations.grill||85)-15); stations.courier=Math.max(20,(stations.courier||80)-15); prep=Math.max(4,prep-2); courier=Math.max(2,courier-2); orders=Math.max(5,orders-8); score=Math.max(10,score-20); break
    case 'STOCK_REPLENISHMENT': score=Math.max(10,score-8); break
    case 'STAFF_ADD':    stations.packing=Math.max(20,(stations.packing||80)-18); prep=Math.max(4,prep-2); score=Math.max(10,score-12); break
    default:             score=Math.max(10,score-5); break
  }
  const risk = score>=80?'KRITIK':score>=60?'RISKLI':score>=40?'YOGUN':'NORMAL'
  const { error } = await sb().from('pulse_scores').insert({
    restaurant_id: restaurantId, score: Math.round(score), risk_level: risk,
    station_scores: stations, avg_prep_time: +prep.toFixed(1), courier_wait: +courier.toFixed(1),
    open_orders: Math.round(orders), avg_packing_time: cur.avg_packing_time || 3,
    top_signals: [`✅ Onaylanan aksiyon: ${actionType}`], computed_at: new Date().toISOString(),
  })
  return error ? null : { old_score: cur.score, new_score: Math.round(score), new_risk: risk }
}

export async function POST(req: NextRequest) {
  const { decision } = await req.json().catch(() => ({}))
  if (!decision?.restaurant_id) return NextResponse.json({ error: 'decision gerekli' }, { status: 400 })
  const pulseUpdate = await applyToPulse(decision.restaurant_id, decision.action_type)
  const { data: rec } = await sb().from('ai_recommendations').insert({
    restaurant_id: decision.restaurant_id, summary: decision.action,
    risk_explanation: `Onaylandı: ${decision.action_type}`,
    forecast_note: `Yarı Otomatik — ${new Date().toLocaleTimeString('tr-TR')}`,
  }).select().single()
  if (rec) {
    await sb().from('recommendation_actions').insert({
      recommendation_id: rec.id, action_text: decision.action,
      priority: decision.severity === 'CRITICAL' ? 'HIGH' : decision.severity,
      expected_improvement: decision.expected_impact, applied: true, applied_at: new Date().toISOString(),
    })
  }
  await sb().from('audit_logs').insert({
    user_role: 'Kullanıcı (Sesli Onay)', action: 'MANUAL_APPROVED', resource: 'restaurant',
    details: { restaurant_id: decision.restaurant_id, action_type: decision.action_type, action: decision.action, severity: decision.severity, pulse_updated: !!pulseUpdate, ...pulseUpdate },
  })
  return NextResponse.json({ ok: true, pulse_update: pulseUpdate, timestamp: new Date().toISOString() })
}
