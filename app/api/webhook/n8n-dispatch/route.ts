/**
 * POST /api/webhook/n8n-dispatch
 * AI HIGH priority aksiyonları n8n webhook'a iletir.
 * Body: { recommendations: [...], pulse_map: {...}, snap_map: {...} }
 * Env: N8N_WEBHOOK_URL
 */
import { NextRequest, NextResponse } from 'next/server'

const MANAGER_PHONE = '905392993103' // 05392993103 → uluslararası format

export interface N8nPayload {
  alert_type: 'PACKING_YUKLU' | 'PERSONEL_EKSIK' | 'KRITIK_RISK' | 'GENEL'
  restaurant_id: string
  restaurant_name: string
  risk_level: string
  pulse_score: number
  // Packing
  packing_yuzu: number        // % 0-100
  open_orders: number
  avg_prep_time: number
  // Personel
  active_staff: number
  delay_rate: number          // 0-1
  // Aksiyon
  priority: string
  issue: string
  actions: { text: string; expected_impact: string; time_to_impact: string }[]
  // İletişim
  manager_phone: string
  timestamp: string
  dashboard_url: string
}

function buildPayloads(
  recommendations: any[],
  pulseMap: Record<string, any>,
  snapMap: Record<string, any>,
  restaurantMap: Record<string, any>,
): N8nPayload[] {
  const payloads: N8nPayload[] = []

  for (const rec of recommendations) {
    if (rec.priority !== 'HIGH') continue

    const pulse = pulseMap[rec.restaurant_id]
    const snap  = snapMap[rec.restaurant_id]
    const rest  = restaurantMap[rec.restaurant_id]
    if (!pulse) continue

    const packingScore = pulse.station_scores?.packing ?? 0
    const openOrders   = pulse.open_orders ?? 0
    const activeStaff  = snap?.active_staff ?? 0
    const delayRate    = snap?.delay_rate ?? 0

    // Packing yükü: packing skoru düşükse veya açık sipariş fazlaysa
    const isPackingYuklu = packingScore < 50 || openOrders > 20

    // Personel eksik: active_staff az veya delay_rate yüksek
    const isPersonelEksik = activeStaff < 3 || delayRate > 0.3

    let alertType: N8nPayload['alert_type'] = 'GENEL'
    if (isPackingYuklu && isPersonelEksik) alertType = 'KRITIK_RISK'
    else if (isPackingYuklu)              alertType = 'PACKING_YUKLU'
    else if (isPersonelEksik)             alertType = 'PERSONEL_EKSIK'

    payloads.push({
      alert_type:     alertType,
      restaurant_id:  rec.restaurant_id,
      restaurant_name: rec.restaurant_name || rest?.name || rec.restaurant_id,
      risk_level:     pulse.risk_level,
      pulse_score:    pulse.score,
      packing_yuzu:   packingScore,
      open_orders:    openOrders,
      avg_prep_time:  pulse.avg_prep_time ?? 0,
      active_staff:   activeStaff,
      delay_rate:     Math.round(delayRate * 100), // % olarak
      priority:       rec.priority,
      issue:          rec.issue,
      actions:        rec.actions ?? [],
      manager_phone:  MANAGER_PHONE,
      timestamp:      new Date().toISOString(),
      dashboard_url:  `https://atasunum.vercel.app/restaurants/${rec.restaurant_id}`,
    })
  }

  return payloads
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { recommendations = [], pulse_map = {}, snap_map = {}, restaurant_map = {}, n8n_url } = body

  const webhookUrl = n8n_url || process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({ error: 'N8N_WEBHOOK_URL env veya n8n_url body parametresi gerekli' }, { status: 400 })
  }

  const payloads = buildPayloads(recommendations, pulse_map, snap_map, restaurant_map)

  if (payloads.length === 0) {
    return NextResponse.json({ ok: true, dispatched: 0, message: 'HIGH priority aksiyon yok' })
  }

  const results: { restaurant: string; alert_type: string; status: string; error?: string }[] = []

  for (const payload of payloads) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      results.push({
        restaurant: payload.restaurant_name,
        alert_type: payload.alert_type,
        status: res.ok ? 'sent' : `error_${res.status}`,
      })
    } catch (err) {
      results.push({
        restaurant: payload.restaurant_name,
        alert_type: payload.alert_type,
        status: 'failed',
        error: String(err),
      })
    }
  }

  return NextResponse.json({
    ok: true,
    dispatched: results.filter(r => r.status === 'sent').length,
    total: payloads.length,
    results,
    timestamp: new Date().toISOString(),
  })
}
