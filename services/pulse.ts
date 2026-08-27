/**
 * Pulse Score Engine — Rule-based nabız skoru hesaplama
 * İleride: ML modeli ile değiştirilebilir, interface aynı kalır
 */

import { RiskLevel, StationSnapshot } from '@/types'

export interface PulseInput {
  // Sipariş verileri
  open_orders: number
  orders_last_5m: number
  orders_last_15m: number
  avg_preparation_time: number   // dakika
  avg_packing_time: number       // dakika
  avg_courier_wait: number       // dakika
  delay_rate: number             // 0-1
  cancellation_rate: number      // 0-1
  // İstasyon yükleri (0-100)
  grill_load: number
  fryer_load: number
  packing_load: number
  courier_load: number
  // Kapasite
  active_staff: number
  restaurant_capacity: number
  // Dış faktörler
  rain_intensity: number         // 0-10
  campaign_active: boolean
  special_event: boolean
  // Tarihsel baz (opsiyonel)
  baseline_prep_time?: number
  baseline_open_orders?: number
}

export interface PulseOutput {
  score: number                  // 0-100
  risk_level: RiskLevel
  station_scores: StationSnapshot
  top_signals: string[]
  component_scores: {
    order_pressure: number
    prep_performance: number
    station_load: number
    courier_load: number
    delay_risk: number
  }
}

// Ağırlıklar — toplam 100
const WEIGHTS = {
  order_pressure: 25,   // Açık sipariş yoğunluğu
  prep_performance: 20, // Hazırlama süresi performansı
  station_load: 25,     // İstasyon yükleri
  courier_load: 15,     // Kurye baskısı
  delay_risk: 15,       // Gecikme / iptal sinyali
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v))
}

function scoreOrderPressure(input: PulseInput): number {
  const baseline = input.baseline_open_orders ?? 15
  const ratio = input.open_orders / baseline
  // 1.0 = normal (50), 2.0 = kritik (100)
  const raw = (ratio - 0.5) * 66.7
  // Hız faktörü: son 5 dakika trendi
  const speedBonus = input.orders_last_5m > 8 ? 10 : input.orders_last_5m > 5 ? 5 : 0
  return clamp(raw + speedBonus)
}

function scorePrepPerformance(input: PulseInput): number {
  const baseline = input.baseline_prep_time ?? 7
  const ratio = input.avg_preparation_time / baseline
  // 1.0 = normal (30), 2.0 = kritik (100)
  const raw = (ratio - 0.5) * 70
  const packingBonus = input.avg_packing_time > 5 ? 15 : input.avg_packing_time > 3.5 ? 7 : 0
  return clamp(raw + packingBonus)
}

function scoreStationLoad(input: PulseInput): { score: number; stations: StationSnapshot } {
  const stations: StationSnapshot = {
    grill: clamp(input.grill_load),
    fryer: clamp(input.fryer_load),
    packing: clamp(input.packing_load),
    courier: clamp(input.courier_load),
  }
  // En yüksek 2 istasyonun ağırlıklı ortalaması
  const sorted = Object.values(stations).sort((a, b) => b - a)
  const score = sorted[0] * 0.5 + sorted[1] * 0.3 + sorted[2] * 0.2
  return { score: clamp(score), stations }
}

function scoreCourierLoad(input: PulseInput): number {
  const waitScore = input.avg_courier_wait > 10 ? 100
    : input.avg_courier_wait > 7 ? 75
    : input.avg_courier_wait > 5 ? 50
    : input.avg_courier_wait > 3 ? 25 : 10
  const loadScore = input.courier_load
  return clamp(waitScore * 0.6 + loadScore * 0.4)
}

function scoreDelayRisk(input: PulseInput): number {
  const delayScore = clamp(input.delay_rate * 500)  // 0.2 → 100
  const cancelScore = clamp(input.cancellation_rate * 1000) // 0.1 → 100
  return clamp(delayScore * 0.7 + cancelScore * 0.3)
}

// Dış faktör çarpanı
function externalMultiplier(input: PulseInput): number {
  let mult = 1.0
  if (input.rain_intensity >= 7) mult += 0.12
  else if (input.rain_intensity >= 4) mult += 0.06
  if (input.campaign_active) mult += 0.08
  if (input.special_event) mult += 0.10
  return mult
}

function buildSignals(input: PulseInput, components: PulseOutput['component_scores']): string[] {
  const signals: string[] = []
  const baseline = input.baseline_open_orders ?? 15
  if (input.open_orders > baseline * 1.3) signals.push(`Açık sipariş sayısı normalin %${Math.round((input.open_orders / baseline - 1) * 100)} üzerinde`)
  if (input.avg_preparation_time > (input.baseline_prep_time ?? 7) * 1.4) signals.push(`Hazırlama süresi ${input.avg_preparation_time.toFixed(1)} dk — hedef üzerinde`)
  if (input.packing_load > 80) signals.push(`Packing istasyonu kritik seviyede (%${input.packing_load})`)
  if (input.grill_load > 80) signals.push(`Grill istasyonu kritik seviyede (%${input.grill_load})`)
  if (input.avg_courier_wait > 7) signals.push(`Kurye bekleme süresi yüksek: ${input.avg_courier_wait.toFixed(1)} dk`)
  if (input.delay_rate > 0.12) signals.push(`Gecikme oranı %${Math.round(input.delay_rate * 100)} — kritik eşikte`)
  if (input.rain_intensity >= 7) signals.push('Yoğun yağış — paket sipariş artışı bekleniyor')
  if (input.campaign_active) signals.push('Aktif kampanya — sipariş artışı olası')
  return signals.slice(0, 4) // max 4 sinyal
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'KRITIK'
  if (score >= 60) return 'RISKLI'
  if (score >= 40) return 'YOGUN'
  return 'NORMAL'
}

export function calculatePulseScore(input: PulseInput): PulseOutput {
  const orderPressure = scoreOrderPressure(input)
  const prepPerformance = scorePrepPerformance(input)
  const { score: stationLoad, stations } = scoreStationLoad(input)
  const courierLoad = scoreCourierLoad(input)
  const delayRisk = scoreDelayRisk(input)

  const components = { order_pressure: orderPressure, prep_performance: prepPerformance, station_load: stationLoad, courier_load: courierLoad, delay_risk: delayRisk }

  const rawScore =
    orderPressure * (WEIGHTS.order_pressure / 100) +
    prepPerformance * (WEIGHTS.prep_performance / 100) +
    stationLoad * (WEIGHTS.station_load / 100) +
    courierLoad * (WEIGHTS.courier_load / 100) +
    delayRisk * (WEIGHTS.delay_risk / 100)

  const score = clamp(Math.round(rawScore * externalMultiplier(input)))
  const risk_level = getRiskLevel(score)
  const top_signals = buildSignals(input, components)

  return { score, risk_level, station_scores: stations, top_signals, component_scores: components }
}
