/**
 * GET /api/reports/daily
 * 
 * Günlük operasyon raporu döndürür.
 * n8n sabah maili, harici BI araçları veya Slack bot kullanabilir.
 * 
 * Query: ?restaurant_id=r1 (yoksa tüm network)
 * Query: ?date=2026-08-27 (yoksa bugün)
 */

import { NextRequest } from 'next/server'
import { verifyAPIKey, successResponse, unauthorizedResponse, errorResponse } from '@/lib/auth'
import { getAllPulseScores, isDemoMode } from '@/services/supabase'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { generateRecommendation } from '@/services/recommendation'
import { getPulseScore, getSnapshot } from '@/data/seed/mock-data'
import { calculatePulseScore } from '@/services/pulse'

export async function GET(req: NextRequest) {
  if (!verifyAPIKey(req)) return unauthorizedResponse()

  try {
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurant_id')
    const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
    const includeAI = searchParams.get('ai') !== 'false'

    const restaurants = restaurantId
      ? RESTAURANTS.filter(r => r.id === restaurantId)
      : RESTAURANTS

    const pulseScores = await getAllPulseScores()

    // Mock günlük istatistikler (prod'da Supabase aggregate query)
    const restaurantReports = await Promise.all(restaurants.map(async r => {
      const pulse = pulseScores.find(p => p.restaurant_id === r.id) ?? getPulseScore(r.id)
      const snapshot = getSnapshot(r.id)

      // Mock günlük toplamlar
      const totalOrders = Math.round(800 + Math.sin(r.id.charCodeAt(1)) * 200)
      const deliveryOrders = Math.round(totalOrders * 0.58)
      const pickupOrders = Math.round(totalOrders * 0.17)
      const dineOrders = totalOrders - deliveryOrders - pickupOrders
      const criticalMinutes = pulse.score >= 80 ? Math.round(45 + Math.sin(r.id.charCodeAt(1)) * 20) : Math.round(10 + Math.sin(r.id.charCodeAt(1)) * 10)

      let aiSummary = null
      if (includeAI && pulse.score >= 40) {
        try {
          const pulseInput = {
            open_orders: snapshot.open_orders,
            orders_last_5m: snapshot.orders_last_5m,
            orders_last_15m: snapshot.orders_last_15m,
            avg_preparation_time: snapshot.avg_preparation_time,
            avg_packing_time: snapshot.avg_packing_time,
            avg_courier_wait: snapshot.avg_courier_wait,
            delay_rate: snapshot.delay_rate,
            cancellation_rate: snapshot.cancellation_rate,
            grill_load: snapshot.grill_load,
            fryer_load: snapshot.fryer_load,
            packing_load: snapshot.packing_load,
            courier_load: snapshot.courier_load,
            active_staff: snapshot.active_staff,
            restaurant_capacity: r.capacity,
            rain_intensity: snapshot.rain_intensity,
            campaign_active: snapshot.campaign_active,
            special_event: snapshot.special_event,
          }
          const pulseResult = calculatePulseScore(pulseInput)
          const rec = await generateRecommendation(r.name, pulseResult, pulseInput)
          aiSummary = rec.summary
        } catch { /* AI hatası raporu bozmaz */ }
      }

      return {
        restaurant_id: r.id,
        restaurant_name: r.name,
        brand: r.brand,
        date,
        kpis: {
          total_orders: totalOrders,
          tiklagelsin_delivery: deliveryOrders,
          tiklagelsin_pickup: pickupOrders,
          restaurant_dine: dineOrders,
          avg_preparation_time: snapshot.avg_preparation_time,
          avg_courier_wait: snapshot.avg_courier_wait,
          delay_rate: snapshot.delay_rate,
          cancellation_rate: snapshot.cancellation_rate,
          critical_minutes: criticalMinutes,
          peak_pulse_score: pulse.score,
          risk_level: pulse.risk_level,
        },
        station_summary: pulse.station_scores,
        top_signals: pulse.top_signals,
        ai_summary: aiSummary,
      }
    }))

    // Network özeti
    const networkSummary = {
      date,
      total_restaurants: restaurants.length,
      total_orders: restaurantReports.reduce((s, r) => s + r.kpis.total_orders, 0),
      avg_pulse_score: Math.round(restaurantReports.reduce((s, r) => s + r.kpis.peak_pulse_score, 0) / restaurantReports.length),
      critical_count: restaurantReports.filter(r => r.kpis.risk_level === 'KRITIK').length,
      riskli_count: restaurantReports.filter(r => r.kpis.risk_level === 'RISKLI').length,
    }

    return successResponse({ date, network_summary: networkSummary, restaurants: restaurantReports, demo_mode: isDemoMode })

  } catch (err) {
    console.error('Daily report hatası:', err)
    return errorResponse('Rapor üretilemedi')
  }
}
