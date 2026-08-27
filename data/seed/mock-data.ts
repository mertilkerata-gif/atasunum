import { PulseScore, OperationSnapshot, Prediction, AIRecommendation, WeatherSnapshot, HourlyForecast, RiskLevel, StationSnapshot } from '@/types'

// Deterministic mock based on restaurant id
const restaurantProfiles: Record<string, {
  baseScore: number
  riskLevel: RiskLevel
  openOrders: number
  prepTime: number
  packTime: number
  courierWait: number
  stations: StationSnapshot
  signals: string[]
  weather: WeatherSnapshot
  staff: number
  deliveryRatio: number
}> = {
  r1: { baseScore: 84, riskLevel: 'KRITIK', openOrders: 31, prepTime: 11.2, packTime: 4.8, courierWait: 8.1, stations: { grill: 88, fryer: 72, packing: 94, courier: 81 }, signals: ['Açık sipariş sayısı normalin %35 üzerinde', 'Packing yükü kritik seviyede', 'Kurye bekleme süresi artıyor'], weather: { condition: 'Yağmurlu', temperature: 18, rain_intensity: 7, icon: '🌧️' }, staff: 6, deliveryRatio: 0.68 },
  r2: { baseScore: 67, riskLevel: 'RISKLI', openOrders: 22, prepTime: 9.1, packTime: 3.9, courierWait: 5.4, stations: { grill: 71, fryer: 65, packing: 78, courier: 62 }, signals: ['Hazırlama süresi yükseliyor', 'Sipariş geliş hızı artıyor'], weather: { condition: 'Parçalı Bulutlu', temperature: 22, rain_intensity: 0, icon: '⛅' }, staff: 8, deliveryRatio: 0.55 },
  r3: { baseScore: 45, riskLevel: 'YOGUN', openOrders: 18, prepTime: 7.8, packTime: 3.2, courierWait: 4.1, stations: { grill: 52, fryer: 48, packing: 61, courier: 44 }, signals: ['Sipariş yoğunluğu artışta'], weather: { condition: 'Güneşli', temperature: 27, rain_intensity: 0, icon: '☀️' }, staff: 9, deliveryRatio: 0.48 },
  r4: { baseScore: 28, riskLevel: 'NORMAL', openOrders: 11, prepTime: 6.2, packTime: 2.8, courierWait: 2.9, stations: { grill: 31, fryer: 28, packing: 35, courier: 25 }, signals: [], weather: { condition: 'Güneşli', temperature: 25, rain_intensity: 0, icon: '☀️' }, staff: 7, deliveryRatio: 0.42 },
  r5: { baseScore: 71, riskLevel: 'RISKLI', openOrders: 25, prepTime: 10.1, packTime: 4.2, courierWait: 6.8, stations: { grill: 74, fryer: 68, packing: 82, courier: 71 }, signals: ['Packing darboğazı oluşuyor', 'Kurye bekleme süresi yüksek'], weather: { condition: 'Yağmurlu', temperature: 17, rain_intensity: 9, icon: '🌧️' }, staff: 5, deliveryRatio: 0.72 },
  r6: { baseScore: 91, riskLevel: 'KRITIK', openOrders: 38, prepTime: 13.4, packTime: 5.9, courierWait: 11.2, stations: { grill: 95, fryer: 88, packing: 97, courier: 89 }, signals: ['Tüm istasyonlar kritik seviyede', 'Hazırlama süresi 2x normale çıktı', 'Sipariş iptali riski yüksek'], weather: { condition: 'Yağmurlu', temperature: 16, rain_intensity: 8, icon: '🌧️' }, staff: 4, deliveryRatio: 0.81 },
  r7: { baseScore: 38, riskLevel: 'NORMAL', openOrders: 14, prepTime: 6.8, packTime: 3.1, courierWait: 3.2, stations: { grill: 41, fryer: 35, packing: 44, courier: 38 }, signals: [], weather: { condition: 'Açık', temperature: 24, rain_intensity: 0, icon: '🌤️' }, staff: 6, deliveryRatio: 0.51 },
  r8: { baseScore: 55, riskLevel: 'YOGUN', openOrders: 19, prepTime: 8.4, packTime: 3.6, courierWait: 4.8, stations: { grill: 58, fryer: 54, packing: 67, courier: 52 }, signals: ['Packing yükü yükseliyor'], weather: { condition: 'Parçalı Bulutlu', temperature: 21, rain_intensity: 2, icon: '⛅' }, staff: 7, deliveryRatio: 0.59 },
  r9: { baseScore: 62, riskLevel: 'RISKLI', openOrders: 21, prepTime: 9.4, packTime: 4.0, courierWait: 5.9, stations: { grill: 65, fryer: 61, packing: 74, courier: 63 }, signals: ['Fryer kapasitesi zorlanıyor', 'Kurye bekleme artışı'], weather: { condition: 'Güneşli', temperature: 26, rain_intensity: 0, icon: '☀️' }, staff: 6, deliveryRatio: 0.53 },
  r10: { baseScore: 22, riskLevel: 'NORMAL', openOrders: 8, prepTime: 5.8, packTime: 2.4, courierWait: 2.1, stations: { grill: 24, fryer: 21, packing: 28, courier: 19 }, signals: [], weather: { condition: 'Açık', temperature: 23, rain_intensity: 0, icon: '🌤️' }, staff: 5, deliveryRatio: 0.44 },
}

export function getPulseScore(restaurantId: string): PulseScore {
  const p = restaurantProfiles[restaurantId]
  const now = new Date().toISOString()
  return {
    id: `ps-${restaurantId}`,
    restaurant_id: restaurantId,
    score: p.baseScore,
    risk_level: p.riskLevel,
    computed_at: now,
    open_orders: p.openOrders,
    avg_prep_time: p.prepTime,
    avg_packing_time: p.packTime,
    courier_wait: p.courierWait,
    station_scores: p.stations,
    top_signals: p.signals,
  }
}

export function getSnapshot(restaurantId: string): OperationSnapshot {
  const p = restaurantProfiles[restaurantId]
  const now = new Date().toISOString()
  const total = p.openOrders
  const delivery = Math.round(total * p.deliveryRatio)
  const pickup = Math.round(total * 0.15)
  const restaurant = total - delivery - pickup
  return {
    id: `snap-${restaurantId}`,
    restaurant_id: restaurantId,
    timestamp: now,
    open_orders: total,
    orders_last_5m: Math.round(total * 0.3),
    orders_last_15m: Math.round(total * 0.65),
    orders_last_30m: total,
    tiklagelsin_delivery_orders: delivery,
    tiklagelsin_pickup_orders: pickup,
    restaurant_orders: restaurant,
    avg_preparation_time: p.prepTime,
    avg_packing_time: p.packTime,
    avg_courier_wait: p.courierWait,
    active_staff: p.staff,
    grill_staff: Math.floor(p.staff * 0.35),
    fryer_staff: Math.floor(p.staff * 0.25),
    packing_staff: Math.floor(p.staff * 0.25),
    temperature: p.weather.temperature,
    weather_condition: p.weather.condition,
    rain_intensity: p.weather.rain_intensity,
    campaign_active: restaurantId === 'r1' || restaurantId === 'r6',
    holiday: false,
    special_event: false,
    inventory_risk: p.baseScore > 70 ? 45 : 10,
    delay_rate: p.baseScore > 80 ? 0.18 : p.baseScore > 60 ? 0.09 : 0.03,
    cancellation_rate: p.baseScore > 80 ? 0.07 : 0.02,
    grill_load: p.stations.grill,
    fryer_load: p.stations.fryer,
    packing_load: p.stations.packing,
    courier_load: p.stations.courier,
  }
}

export function getPredictions(restaurantId: string): Prediction[] {
  const p = restaurantProfiles[restaurantId]
  const now = new Date().toISOString()
  const horizons: (15 | 30 | 60)[] = [15, 30, 60]
  return horizons.map(h => ({
    id: `pred-${restaurantId}-${h}`,
    restaurant_id: restaurantId,
    predicted_at: now,
    horizon_minutes: h,
    predicted_orders: p.openOrders + Math.round(h * 0.8 * (p.deliveryRatio + 0.2)),
    predicted_pulse_score: Math.min(100, p.baseScore + (h === 15 ? 4 : h === 30 ? 2 : -3)),
    delay_probability: p.baseScore > 70 ? 0.72 : p.baseScore > 50 ? 0.41 : 0.12,
    cancellation_probability: p.baseScore > 70 ? 0.18 : 0.05,
    station_overload: {
      grill: Math.min(100, p.stations.grill + (h === 15 ? 5 : 2)),
      fryer: Math.min(100, p.stations.fryer + (h === 15 ? 4 : 2)),
      packing: Math.min(100, p.stations.packing + (h === 15 ? 6 : 3)),
      courier: Math.min(100, p.stations.courier + (h === 15 ? 4 : 2)),
    },
    confidence_score: h === 15 ? 0.89 : h === 30 ? 0.81 : 0.71,
  }))
}

export function getWeather(restaurantId: string): WeatherSnapshot {
  return restaurantProfiles[restaurantId].weather
}

export function getHourlyForecast(restaurantId: string): HourlyForecast[] {
  const p = restaurantProfiles[restaurantId]
  const hours = ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00']
  const now = new Date().getHours()
  return hours.map((h, i) => {
    const hourNum = 14 + i
    const isPeak = hourNum >= 18 && hourNum <= 20
    const base = isPeak ? Math.round(p.openOrders * 2.1) : Math.round(p.openOrders * 1.2)
    const jitter = Math.round((Math.sin(i * 1.3) * base * 0.12))
    return {
      hour: h,
      actual: hourNum < now ? base + jitter : undefined,
      predicted: base + jitter + Math.round(base * 0.08),
      pulse_score: isPeak ? Math.min(100, p.baseScore + 8) : p.baseScore - 5,
    }
  })
}

export function getRecommendation(restaurantId: string): AIRecommendation | undefined {
  const p = restaurantProfiles[restaurantId]
  if (p.baseScore < 40) return undefined
  const now = new Date().toISOString()
  const actions = []
  if (p.stations.packing > 80) actions.push({ id: `a1-${restaurantId}`, recommendation_id: `rec-${restaurantId}`, action_text: 'Packing alanına geçici +1 çalışan kaydırılsın', priority: 'HIGH' as const, station: 'packing' as const, applied: false, expected_improvement: 'Hazırlama süresi ~3 dk düşebilir' })
  if (p.stations.grill > 75) actions.push({ id: `a2-${restaurantId}`, recommendation_id: `rec-${restaurantId}`, action_text: 'Yoğun ürünlerde ön hazırlık artırılsın', priority: 'HIGH' as const, station: 'grill' as const, applied: false, expected_improvement: 'Grill yükü %15 azalabilir' })
  if (p.stations.courier > 70) actions.push({ id: `a3-${restaurantId}`, recommendation_id: `rec-${restaurantId}`, action_text: 'Kurye bekleyen siparişler önceliklendirilsin', priority: 'MEDIUM' as const, station: 'courier' as const, applied: false })
  actions.push({ id: `a4-${restaurantId}`, recommendation_id: `rec-${restaurantId}`, action_text: 'Online sipariş hazırlama önceliği dengelensin', priority: 'MEDIUM' as const, applied: false })
  return {
    id: `rec-${restaurantId}`,
    restaurant_id: restaurantId,
    pulse_score_id: `ps-${restaurantId}`,
    created_at: now,
    summary: p.baseScore > 80 ? 'Kritik operasyonel yoğunluk tespit edildi. Acil aksiyon gerekli.' : 'Operasyonel yoğunluk artışı gözlemleniyor. Önleyici aksiyonlar öneriliyor.',
    risk_explanation: `Mevcut tempo devam ederse önümüzdeki 20 dakika içinde gecikme riski %${Math.round(p.baseScore * 0.85)} olarak tahmin ediliyor.`,
    actions,
  }
}

export { restaurantProfiles }
