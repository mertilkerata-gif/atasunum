/**
 * POST /api/simulate
 * 
 * What-If senaryosu server-side hesaplar.
 * İleride ML modeli bağlanacak yer burası.
 */

import { NextRequest } from 'next/server'
import { verifyAPIKey, successResponse, unauthorizedResponse, errorResponse, validationErrorResponse } from '@/lib/auth'
import { calculatePulseScore, PulseInput } from '@/services/pulse'

interface SimulatePayload {
  // Mevcut snapshot
  current: PulseInput & { restaurant_id: string }
  // Senaryo değişiklikleri
  changes: {
    extra_packing_staff?: number    // +1, +2 vb.
    extra_grill_staff?: number
    extra_staff?: number            // genel
    order_increase_pct?: number     // +20, +40 vb.
    campaign_active?: boolean
    rain_intensity?: number
  }
}

function applyChanges(base: PulseInput, changes: SimulatePayload['changes']): PulseInput {
  const modified = { ...base }

  // Personel eklenmesi → istasyon yüklerini düşürür
  if (changes.extra_packing_staff) {
    const reduction = changes.extra_packing_staff * 12
    modified.packing_load = Math.max(0, base.packing_load - reduction)
    modified.avg_packing_time = Math.max(1.5, base.avg_packing_time - changes.extra_packing_staff * 1.2)
  }
  if (changes.extra_grill_staff) {
    const reduction = changes.extra_grill_staff * 10
    modified.grill_load = Math.max(0, base.grill_load - reduction)
    modified.avg_preparation_time = Math.max(3, base.avg_preparation_time - changes.extra_grill_staff * 0.9)
  }
  if (changes.extra_staff) {
    const general = changes.extra_staff * 6
    modified.packing_load = Math.max(0, modified.packing_load - general)
    modified.grill_load = Math.max(0, modified.grill_load - general * 0.7)
    modified.fryer_load = Math.max(0, modified.fryer_load - general * 0.5)
    modified.active_staff = base.active_staff + changes.extra_staff
  }

  // Sipariş artışı → yükleri artırır
  if (changes.order_increase_pct) {
    const factor = 1 + changes.order_increase_pct / 100
    modified.open_orders = Math.round(base.open_orders * factor)
    modified.orders_last_5m = Math.round(base.orders_last_5m * factor)
    modified.orders_last_15m = Math.round(base.orders_last_15m * factor)
    modified.avg_preparation_time = base.avg_preparation_time * (1 + changes.order_increase_pct * 0.004)
    modified.packing_load = Math.min(100, modified.packing_load * factor)
    modified.grill_load = Math.min(100, modified.grill_load * factor)
    modified.delay_rate = Math.min(0.5, base.delay_rate * factor)
  }

  if (changes.campaign_active !== undefined) modified.campaign_active = changes.campaign_active
  if (changes.rain_intensity !== undefined) modified.rain_intensity = changes.rain_intensity

  return modified
}

export async function POST(req: NextRequest) {
  if (!verifyAPIKey(req)) return unauthorizedResponse()

  let body: SimulatePayload
  try { body = await req.json() } catch { return validationErrorResponse('Geçersiz JSON') }
  if (!body.current || !body.changes) return validationErrorResponse('current ve changes zorunlu')

  try {
    const currentPulse = calculatePulseScore(body.current)
    const modifiedInput = applyChanges(body.current, body.changes)
    const simulatedPulse = calculatePulseScore(modifiedInput)

    const improvement = currentPulse.score - simulatedPulse.score

    return successResponse({
      restaurant_id: body.current.restaurant_id,
      current: {
        score: currentPulse.score,
        risk_level: currentPulse.risk_level,
        avg_prep_time: body.current.avg_preparation_time,
        station_scores: currentPulse.station_scores,
      },
      simulated: {
        score: simulatedPulse.score,
        risk_level: simulatedPulse.risk_level,
        avg_prep_time: modifiedInput.avg_preparation_time,
        station_scores: simulatedPulse.station_scores,
      },
      delta: {
        score: improvement,
        score_pct: Math.round(improvement / currentPulse.score * 100),
        prep_time: +(body.current.avg_preparation_time - modifiedInput.avg_preparation_time).toFixed(1),
        risk_improved: ['KRITIK', 'RISKLI', 'YOGUN', 'NORMAL'].indexOf(simulatedPulse.risk_level) >
                       ['KRITIK', 'RISKLI', 'YOGUN', 'NORMAL'].indexOf(currentPulse.risk_level),
      },
      changes_applied: body.changes,
    })
  } catch (err) {
    console.error('Simulate hatası:', err)
    return errorResponse('Simülasyon hesaplanamadı')
  }
}

export async function GET() {
  return successResponse({
    endpoint: 'POST /api/simulate',
    description: 'What-If senaryo hesaplama — server-side Pulse Engine',
    example_payload: {
      current: { restaurant_id: 'r1', open_orders: 28, orders_last_5m: 8, orders_last_15m: 22, avg_preparation_time: 11.2, avg_packing_time: 4.8, avg_courier_wait: 8.1, grill_load: 88, fryer_load: 72, packing_load: 94, courier_load: 81, active_staff: 6, restaurant_capacity: 80, rain_intensity: 7, campaign_active: true, special_event: false, delay_rate: 0.18, cancellation_rate: 0.07 },
      changes: { extra_packing_staff: 1, extra_grill_staff: 0, order_increase_pct: 0 },
    },
  })
}
