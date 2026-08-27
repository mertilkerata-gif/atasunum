/**
 * POST /api/webhook/order-event
 * 
 * KDS veya Tıkla Gelsin entegrasyonu sipariş event'lerini buraya gönderir.
 * n8n, POS veya custom middleware kullanabilir.
 * 
 * n8n HTTP Request node:
 *   URL: https://yourapp.vercel.app/api/webhook/order-event
 *   Method: POST
 *   Headers: x-webhook-secret: {{$env.N8N_WEBHOOK_SECRET}}
 */

import { NextRequest } from 'next/server'
import { verifyWebhookSecret, successResponse, unauthorizedResponse, errorResponse, validationErrorResponse } from '@/lib/auth'
import { saveOrderEvent, isDemoMode } from '@/services/supabase'
import { OrderEventType } from '@/types'

interface OrderEventPayload {
  order_id: string
  restaurant_id: string
  event_type: OrderEventType
  timestamp?: string
  metadata?: {
    channel?: 'TIKLAGELSIN_DELIVERY' | 'TIKLAGELSIN_PICKUP' | 'RESTAURANT'
    product_ids?: string[]
    staff_id?: string
    courier_id?: string
    note?: string
  }
}

const VALID_EVENTS: OrderEventType[] = [
  'ORDER_CREATED', 'KDS_RECEIVED', 'PREPARATION_STARTED',
  'PREPARATION_COMPLETED', 'PACKING_STARTED', 'READY',
  'COURIER_ARRIVED', 'PICKED_UP', 'COMPLETED', 'CANCELLED',
]

export async function POST(req: NextRequest) {
  if (!verifyWebhookSecret(req)) return unauthorizedResponse()

  let body: OrderEventPayload
  try { body = await req.json() } catch { return validationErrorResponse('Geçersiz JSON') }

  if (!body.order_id) return validationErrorResponse('order_id zorunlu')
  if (!body.restaurant_id) return validationErrorResponse('restaurant_id zorunlu')
  if (!body.event_type || !VALID_EVENTS.includes(body.event_type)) {
    return validationErrorResponse(`Geçersiz event_type. Geçerli değerler: ${VALID_EVENTS.join(', ')}`)
  }

  try {
    const timestamp = body.timestamp ?? new Date().toISOString()

    await saveOrderEvent({
      order_id: body.order_id,
      restaurant_id: body.restaurant_id,
      event_type: body.event_type,
      timestamp,
      metadata: body.metadata,
    })

    // Terminal event'lerde özet hesapla
    let duration_minutes: number | null = null
    if (body.event_type === 'COMPLETED' || body.event_type === 'CANCELLED') {
      // Prod: Supabase'den ORDER_CREATED timestamp'i çek, farkı hesapla
      // Demo: null döndür
      duration_minutes = null
    }

    return successResponse({
      order_id: body.order_id,
      restaurant_id: body.restaurant_id,
      event_type: body.event_type,
      timestamp,
      duration_minutes,
      demo_mode: isDemoMode,
    })

  } catch (err) {
    console.error('Order event webhook hatası:', err)
    return errorResponse('Event kaydedilemedi')
  }
}

export async function GET() {
  return successResponse({
    endpoint: 'POST /api/webhook/order-event',
    status: 'active',
    valid_events: VALID_EVENTS,
    auth: 'Header: x-webhook-secret',
  })
}
