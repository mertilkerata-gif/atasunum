/**
 * GET /api/pulse/all
 * 
 * Tüm restoranların nabız skorlarını döndürür.
 * HQ dashboard, harici BI araçları, n8n aggregation node kullanabilir.
 * 
 * Query params:
 *   ?risk=KRITIK  — sadece belirli risk seviyesini filtrele
 *   ?brand=BURGER_KING  — markaya göre filtrele
 *   ?region=Anadolu Yakası
 */

import { NextRequest } from 'next/server'
import { verifyAPIKey, successResponse, unauthorizedResponse, errorResponse } from '@/lib/auth'
import { getAllPulseScores, isDemoMode } from '@/services/supabase'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { RiskLevel } from '@/types'

export async function GET(req: NextRequest) {
  if (!verifyAPIKey(req)) return unauthorizedResponse()

  try {
    const { searchParams } = new URL(req.url)
    const riskFilter = searchParams.get('risk') as RiskLevel | null
    const brandFilter = searchParams.get('brand')
    const regionFilter = searchParams.get('region')

    const pulseScores = await getAllPulseScores()

    let results = RESTAURANTS.map(restaurant => {
      const pulse = pulseScores.find(p => p.restaurant_id === restaurant.id)
      return { restaurant, pulse }
    }).filter(r => r.pulse)

    // Filtreler
    if (riskFilter) results = results.filter(r => r.pulse?.risk_level === riskFilter)
    if (brandFilter) results = results.filter(r => r.restaurant.brand === brandFilter)
    if (regionFilter) results = results.filter(r => r.restaurant.region === regionFilter)

    // Risk seviyesine göre sırala (kritik önce)
    const riskOrder: Record<RiskLevel, number> = { KRITIK: 0, RISKLI: 1, YOGUN: 2, NORMAL: 3 }
    results.sort((a, b) => riskOrder[a.pulse!.risk_level] - riskOrder[b.pulse!.risk_level])

    // Özet istatistikler
    const summary = {
      total: results.length,
      by_risk: {
        KRITIK: results.filter(r => r.pulse?.risk_level === 'KRITIK').length,
        RISKLI: results.filter(r => r.pulse?.risk_level === 'RISKLI').length,
        YOGUN: results.filter(r => r.pulse?.risk_level === 'YOGUN').length,
        NORMAL: results.filter(r => r.pulse?.risk_level === 'NORMAL').length,
      },
      avg_score: Math.round(results.reduce((s, r) => s + (r.pulse?.score ?? 0), 0) / results.length),
      critical_restaurants: results.filter(r => r.pulse?.risk_level === 'KRITIK').map(r => r.restaurant.name),
    }

    return successResponse({
      summary,
      restaurants: results.map(({ restaurant, pulse }) => ({
        id: restaurant.id,
        name: restaurant.name,
        brand: restaurant.brand,
        district: restaurant.district,
        region: restaurant.region,
        score: pulse!.score,
        risk_level: pulse!.risk_level,
        computed_at: pulse!.computed_at,
        open_orders: pulse!.open_orders,
        top_signals: pulse!.top_signals,
      })),
      demo_mode: isDemoMode,
    })
  } catch (err) {
    console.error('Pulse all API hatası:', err)
    return errorResponse('Veriler alınamadı')
  }
}
