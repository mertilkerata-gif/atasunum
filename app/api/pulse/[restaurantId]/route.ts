/**
 * GET /api/pulse/[restaurantId]
 * 
 * Tek restoran nabız skoru döndürür.
 * Tablet, müdür uygulaması, n8n decision node kullanabilir.
 * 
 * Örnek: GET /api/pulse/r1
 * Auth: x-api-key header (demo'da bypass)
 */

import { NextRequest } from 'next/server'
import { verifyAPIKey, successResponse, unauthorizedResponse, errorResponse } from '@/lib/auth'
import { getPulseScoreDB, isDemoMode } from '@/services/supabase'
import { RESTAURANTS } from '@/data/seed/restaurants'

export async function GET(req: NextRequest, { params }: { params: Promise<{ restaurantId: string }> }) {
  if (!verifyAPIKey(req)) return unauthorizedResponse()

  try {
    const { restaurantId } = await params
    const restaurant = RESTAURANTS.find(r => r.id === restaurantId)
    if (!restaurant) {
      return successResponse(null, 404)
    }

    const pulse = await getPulseScoreDB(restaurantId)

    return successResponse({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        brand: restaurant.brand,
        district: restaurant.district,
      },
      pulse: {
        score: pulse.score,
        risk_level: pulse.risk_level,
        computed_at: pulse.computed_at,
        open_orders: pulse.open_orders,
        avg_prep_time: pulse.avg_prep_time,
        avg_packing_time: pulse.avg_packing_time,
        courier_wait: pulse.courier_wait,
        station_scores: pulse.station_scores,
        top_signals: pulse.top_signals,
      },
      demo_mode: isDemoMode,
    })
  } catch (err) {
    console.error('Pulse API hatası:', err)
    return errorResponse('Veri alınamadı')
  }
}
