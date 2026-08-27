/**
 * POST /api/recommendations/generate
 * 
 * Snapshot verisi alır → Pulse hesaplar → OpenAI Operasyon Reçetesi üretir → Kaydeder
 * 
 * n8n'den tetiklenebilir: nabız skoru > 60 olduğunda otomatik çalışır
 * Frontend'den de manuel tetiklenebilir (restoran detay sayfası)
 */

import { NextRequest } from 'next/server'
import { verifyWebhookSecret, successResponse, unauthorizedResponse, errorResponse, validationErrorResponse } from '@/lib/auth'
import { calculatePulseScore, PulseInput } from '@/services/pulse'
import { generateRecommendation } from '@/services/recommendation'
import { saveRecommendation, isDemoMode } from '@/services/supabase'
import { RESTAURANTS } from '@/data/seed/restaurants'

interface GeneratePayload {
  restaurant_id: string
  // Pulse input verileri (snapshot ile aynı)
  open_orders: number
  orders_last_5m: number
  orders_last_15m: number
  avg_preparation_time: number
  avg_packing_time: number
  avg_courier_wait: number
  grill_load: number
  fryer_load: number
  packing_load: number
  courier_load: number
  active_staff: number
  delay_rate?: number
  cancellation_rate?: number
  rain_intensity?: number
  campaign_active?: boolean
  special_event?: boolean
  restaurant_capacity?: number
  baseline_prep_time?: number
  baseline_open_orders?: number
  // Opsiyonel: mevcut pulse_score_id (snapshot'tan geliyorsa)
  pulse_score_id?: string
}

export async function POST(req: NextRequest) {
  // Hem n8n (webhook secret) hem frontend (API key) çağırabilir
  const authOk = verifyWebhookSecret(req)
  if (!authOk) return unauthorizedResponse()

  let body: GeneratePayload
  try { body = await req.json() } catch { return validationErrorResponse('Geçersiz JSON') }
  if (!body.restaurant_id) return validationErrorResponse('restaurant_id zorunlu')

  const restaurant = RESTAURANTS.find(r => r.id === body.restaurant_id)
  if (!restaurant) return validationErrorResponse('Restoran bulunamadı')

  try {
    const pulseInput: PulseInput = {
      open_orders: body.open_orders,
      orders_last_5m: body.orders_last_5m,
      orders_last_15m: body.orders_last_15m,
      avg_preparation_time: body.avg_preparation_time,
      avg_packing_time: body.avg_packing_time,
      avg_courier_wait: body.avg_courier_wait,
      delay_rate: body.delay_rate ?? 0.03,
      cancellation_rate: body.cancellation_rate ?? 0.02,
      grill_load: body.grill_load,
      fryer_load: body.fryer_load,
      packing_load: body.packing_load,
      courier_load: body.courier_load,
      active_staff: body.active_staff,
      restaurant_capacity: body.restaurant_capacity ?? 80,
      rain_intensity: body.rain_intensity ?? 0,
      campaign_active: body.campaign_active ?? false,
      special_event: body.special_event ?? false,
      baseline_prep_time: body.baseline_prep_time,
      baseline_open_orders: body.baseline_open_orders,
    }

    const pulse = calculatePulseScore(pulseInput)

    // Düşük risk seviyelerinde öneri üretme (NORMAL ise gerek yok)
    if (pulse.score < 35) {
      return successResponse({ message: 'Nabız skoru düşük, öneri gerekmiyor', score: pulse.score, risk_level: pulse.risk_level })
    }

    const recommendation = await generateRecommendation(restaurant.name, pulse, pulseInput)

    const recId = await saveRecommendation({
      restaurant_id: body.restaurant_id,
      pulse_score_id: body.pulse_score_id ?? `ps-${Date.now()}`,
      summary: recommendation.summary,
      risk_explanation: recommendation.risk_explanation,
      actions: recommendation.actions,
      forecast_note: recommendation.forecast_note,
    })

    return successResponse({
      recommendation_id: recId,
      restaurant_id: body.restaurant_id,
      pulse_score: pulse.score,
      risk_level: pulse.risk_level,
      recommendation,
      demo_mode: isDemoMode,
    })

  } catch (err) {
    console.error('Recommendation generate hatası:', err)
    return errorResponse('Öneri üretilemedi')
  }
}

export async function GET() {
  return successResponse({
    endpoint: 'POST /api/recommendations/generate',
    description: 'Snapshot verisi alır, nabız hesaplar, OpenAI reçetesi üretir',
    auth: 'Header: x-webhook-secret veya x-api-key',
    trigger: 'n8n: nabız > 60 olduğunda otomatik',
  })
}
