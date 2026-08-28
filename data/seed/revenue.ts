export interface RevenueSnapshot {
  restaurantId: string
  // Gerçek
  actualRevenue: number          // bugün TL
  actualOrders: number
  avgOrderValue: number
  // Kaybedilen
  lostRevenueCancelled: number   // iptal nedeniyle
  lostRevenueDelayed: number     // gecikme → terk
  lostRevenueComplaints: number  // şikayet iadesi
  totalLostRevenue: number
  // Fırsat
  capacityUtilization: number    // %0-100
  missedRevenueOpportunity: number // kapasite dolsaydı
  // KPI
  revenuePerHour: number
  peakHourRevenue: number
  peakHour: string
  // Trend (bu hafta vs geçen hafta)
  revenueGrowth: number // yüzde
}

const BASE_REVENUE: Record<string, number> = {
  r1: 42000, r2: 51000, r3: 38000, r4: 29000, r5: 35000,
  r6: 31000, r7: 27000, r8: 36000, r9: 44000, r10: 22000,
}

export function getRevenueSnapshot(restaurantId: string): RevenueSnapshot {
  const base = BASE_REVENUE[restaurantId] ?? 30000
  const seed = restaurantId.charCodeAt(1)

  // Yüksek nabız = yüksek kayıp
  const lossMultiplier: Record<string, number> = {
    r1: 0.12, r2: 0.08, r3: 0.04, r4: 0.02, r5: 0.09,
    r6: 0.17, r7: 0.02, r8: 0.06, r9: 0.07, r10: 0.01,
  }
  const lossRate = lossMultiplier[restaurantId] ?? 0.05

  const lostCancelled = Math.round(base * lossRate * 0.5)
  const lostDelayed   = Math.round(base * lossRate * 0.3)
  const lostComplaints= Math.round(base * lossRate * 0.2)
  const totalLost     = lostCancelled + lostDelayed + lostComplaints

  const actualRevenue = base - totalLost
  const actualOrders  = Math.round(actualRevenue / 185) // ort sipariş değeri ~185 TL
  const capacityUtil  = 0.55 + (lossRate * 2) + Math.sin(seed) * 0.1
  const missed        = Math.round(base * Math.max(0, 1 - Math.min(capacityUtil, 0.95)))

  return {
    restaurantId,
    actualRevenue,
    actualOrders,
    avgOrderValue: 185 + Math.round(Math.sin(seed) * 20),
    lostRevenueCancelled: lostCancelled,
    lostRevenueDelayed:   lostDelayed,
    lostRevenueComplaints: lostComplaints,
    totalLostRevenue: totalLost,
    capacityUtilization: Math.min(95, Math.round(capacityUtil * 100)),
    missedRevenueOpportunity: missed,
    revenuePerHour: Math.round(actualRevenue / 13),
    peakHourRevenue: Math.round(actualRevenue * 0.22),
    peakHour: '18:30–20:00',
    revenueGrowth: +((Math.sin(seed * 1.4) * 8 - 2).toFixed(1)),
  }
}

export function getNetworkRevenueSummary() {
  const ids = ['r1','r2','r3','r4','r5','r6','r7','r8','r9','r10']
  const all = ids.map(id => getRevenueSnapshot(id))
  return {
    totalActual:   all.reduce((s, r) => s + r.actualRevenue, 0),
    totalLost:     all.reduce((s, r) => s + r.totalLostRevenue, 0),
    totalMissed:   all.reduce((s, r) => s + r.missedRevenueOpportunity, 0),
    totalOrders:   all.reduce((s, r) => s + r.actualOrders, 0),
    avgOrderValue: Math.round(all.reduce((s, r) => s + r.avgOrderValue, 0) / all.length),
    restaurantBreakdown: all,
  }
}
