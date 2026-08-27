/**
 * POST /api/webhook/snapshot
 * 
 * n8n her 5 dakikada bir POS/KDS verisini buraya gönderir.
 * 1. Veriyi doğrula
 * 2. Nabız skoru hesapla (Pulse Engine)
 * 3. Supabase'e kaydet
 * 4. Eşik aşıldıysa alert tetikle
 * 
 * n8n HTTP Request node ayarları:
 *   URL: https://yourapp.vercel.app/api/webhook/snapshot
 *   Method: POST
 *   Headers: x-webhook-secret: {{$env.N8N_WEBHOOK_SECRET}}
 *   Body: JSON (aşağıdaki schema)
 */

import { NextRequest } from 'next/server'
import { verifyWebhookSecret, successResponse, unauthorizedResponse, errorResponse, validationErrorResponse } from '@/lib/auth'
import { calculatePulseScore, PulseInput } from '@/services/pulse'
import { savePulseScore, saveSnapshot, isDemoMode } from '@/services/supabase'

// n8n'den gelen payload schema
interface SnapshotPayload {
  restaurant_id: string
  restaurant_name?: string
  timestamp?: string

  // Sipariş verileri
  open_orders: number
  orders_last_5m: number
  orders_last_15m: number
  orders_last_30m?: number
  tiklagelsin_delivery_orders?: number
  tiklagelsin_pickup_orders?: number
  restaurant_orders?: number

  // Süreler (dakika)
  avg_preparation_time: number
  avg_packing_time: number
  avg_courier_wait: number

  // İstasyon yükleri (0-100)
  grill_load: number
  fryer_load: number
  packing_load: number
  courier_load: number

  // Personel
  active_staff: number
  grill_staff?: number
  fryer_staff?: number
  packing_staff?: number

  // Performans
  delay_rate?: number
  cancellation_rate?: number
  inventory_risk?: number

  // Dış faktörler
  temperature?: number
  weather_condition?: string
  rain_intensity?: number
  campaign_active?: boolean
  holiday?: boolean
  special_event?: boolean

  // Tarihsel baz (opsiyonel — yoksa default kullanılır)
  baseline_prep_time?: number
  baseline_open_orders?: number

  // Meta
  restaurant_capacity?: number
}

export async function POST(req: NextRequest) {
  // Auth
  if (!verifyWebhookSecret(req)) return unauthorizedResponse()

  let body: SnapshotPayload
  try {
    body = await req.json()
  } catch {
    return validationErrorResponse('Geçersiz JSON')
  }

  // Zorunlu alanlar
  const required = ['restaurant_id', 'open_orders', 'avg_preparation_time', 'avg_packing_time', 'avg_courier_wait', 'grill_load', 'fryer_load', 'packing_load', 'courier_load', 'active_staff']
  const missing = required.filter(k => body[k as keyof SnapshotPayload] === undefined)
  if (missing.length) return validationErrorResponse(`Eksik alanlar: ${missing.join(', ')}`)

  try {
    const timestamp = body.timestamp ?? new Date().toISOString()

    // Pulse Engine girişi hazırla
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

    // Nabız skoru hesapla
    const pulseResult = calculatePulseScore(pulseInput)

    // Snapshot objesi
    const snapshot = {
      restaurant_id: body.restaurant_id,
      timestamp,
      open_orders: body.open_orders,
      orders_last_5m: body.orders_last_5m,
      orders_last_15m: body.orders_last_15m,
      orders_last_30m: body.orders_last_30m ?? body.open_orders,
      tiklagelsin_delivery_orders: body.tiklagelsin_delivery_orders ?? 0,
      tiklagelsin_pickup_orders: body.tiklagelsin_pickup_orders ?? 0,
      restaurant_orders: body.restaurant_orders ?? 0,
      avg_preparation_time: body.avg_preparation_time,
      avg_packing_time: body.avg_packing_time,
      avg_courier_wait: body.avg_courier_wait,
      active_staff: body.active_staff,
      grill_staff: body.grill_staff ?? 0,
      fryer_staff: body.fryer_staff ?? 0,
      packing_staff: body.packing_staff ?? 0,
      grill_load: body.grill_load,
      fryer_load: body.fryer_load,
      packing_load: body.packing_load,
      courier_load: body.courier_load,
      temperature: body.temperature ?? 20,
      weather_condition: body.weather_condition ?? 'Bilinmiyor',
      rain_intensity: body.rain_intensity ?? 0,
      campaign_active: body.campaign_active ?? false,
      holiday: body.holiday ?? false,
      special_event: body.special_event ?? false,
      inventory_risk: body.inventory_risk ?? 0,
      delay_rate: body.delay_rate ?? 0.03,
      cancellation_rate: body.cancellation_rate ?? 0.02,
    }

    // Pulse score objesi
    const pulseScore = {
      restaurant_id: body.restaurant_id,
      score: pulseResult.score,
      risk_level: pulseResult.risk_level,
      computed_at: timestamp,
      open_orders: body.open_orders,
      avg_prep_time: body.avg_preparation_time,
      avg_packing_time: body.avg_packing_time,
      courier_wait: body.avg_courier_wait,
      station_scores: pulseResult.station_scores,
      top_signals: pulseResult.top_signals,
    }

    // Kaydet
    await Promise.all([
      savePulseScore(pulseScore),
      saveSnapshot(snapshot),
    ])

    // Alert kontrolü — eşik aşıldıysa n8n'e geri bildir
    const alertTriggered = pulseResult.score >= 80
    const alerts = alertTriggered ? [{
      type: 'KRITIK_PULSE',
      restaurant_id: body.restaurant_id,
      score: pulseResult.score,
      signals: pulseResult.top_signals,
      timestamp,
    }] : []

    return successResponse({
      restaurant_id: body.restaurant_id,
      pulse_score: pulseResult.score,
      risk_level: pulseResult.risk_level,
      station_scores: pulseResult.station_scores,
      top_signals: pulseResult.top_signals,
      component_scores: pulseResult.component_scores,
      alert_triggered: alertTriggered,
      alerts,
      demo_mode: isDemoMode,
    })

  } catch (err) {
    console.error('Snapshot webhook hatası:', err)
    return errorResponse('Snapshot işlenemedi')
  }
}

// GET — endpoint sağlık kontrolü (n8n test için)
export async function GET() {
  return successResponse({
    endpoint: 'POST /api/webhook/snapshot',
    status: 'active',
    demo_mode: isDemoMode,
    required_fields: ['restaurant_id', 'open_orders', 'avg_preparation_time', 'avg_packing_time', 'avg_courier_wait', 'grill_load', 'fryer_load', 'packing_load', 'courier_load', 'active_staff'],
    optional_fields: ['timestamp', 'rain_intensity', 'campaign_active', 'delay_rate', 'cancellation_rate'],
    auth: 'Header: x-webhook-secret',
  })
}
