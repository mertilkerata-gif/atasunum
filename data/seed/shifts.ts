export interface ShiftPlan {
  date: string
  restaurantId: string
  dayOfWeek: string
  predictedDemand: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
  recommendedStaff: {
    total: number
    grill: number
    fryer: number
    packing: number
    cashier: number
    manager: number
  }
  currentStaff: {
    total: number
    grill: number
    fryer: number
    packing: number
    cashier: number
    manager: number
  }
  riskFactors: string[]
  externalEvents: ExternalEvent[]
  peakHours: { start: string; end: string; intensity: number }[]
  estimatedRevenue: number
  estimatedOrders: number
  aiJustification: string
  confidence: number
}

export interface ExternalEvent {
  type: 'FOOTBALL' | 'CONCERT' | 'HOLIDAY' | 'SCHOOL_HOLIDAY' | 'RAIN' | 'SPECIAL_DAY'
  name: string
  impact: number // -1 (negatif) ile +1 (pozitif) arası, TG siparişine etkisi
  icon: string
}

export interface HistoricalShiftPerformance {
  date: string
  dayOfWeek: string
  staffCount: number
  avgPulseScore: number
  peakPulseScore: number
  totalOrders: number
  delayRate: number
  complaintCount: number
  revenue: number
}

// Gelecek 7 günün dış olayları
export const UPCOMING_EVENTS: Record<string, ExternalEvent[]> = {
  '2026-08-28': [
    { type: 'RAIN', name: 'Yağmurlu Hava', impact: 0.35, icon: '🌧️' },
    { type: 'FOOTBALL', name: 'Galatasaray - Fenerbahçe', impact: 0.45, icon: '⚽' },
  ],
  '2026-08-29': [
    { type: 'SPECIAL_DAY', name: 'Zafer Bayramı', impact: 0.25, icon: '🇹🇷' },
    { type: 'HOLIDAY', name: 'Resmi Tatil', impact: 0.2, icon: '🏖️' },
  ],
  '2026-08-30': [
    { type: 'CONCERT', name: 'Harbiye Konseri', impact: 0.3, icon: '🎵' },
  ],
  '2026-08-31': [],
  '2026-09-01': [
    { type: 'SCHOOL_HOLIDAY', name: 'Okullar Kapandı', impact: 0.15, icon: '🎒' },
  ],
  '2026-09-02': [
    { type: 'RAIN', name: 'Sağanak Yağış', impact: 0.5, icon: '⛈️' },
  ],
  '2026-09-03': [],
}

const DAYS_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

export function generateShiftPlan(restaurantId: string, dateStr: string): ShiftPlan {
  const date = new Date(dateStr)
  const dayOfWeek = DAYS_TR[date.getDay()]
  const events = UPCOMING_EVENTS[dateStr] ?? []
  const seed = restaurantId.charCodeAt(1) + date.getDate()

  // Temel talep — gün bazlı
  const dayMultiplier: Record<string, number> = {
    'Pazartesi': 0.85, 'Salı': 0.80, 'Çarşamba': 0.90,
    'Perşembe': 1.00, 'Cuma': 1.35, 'Cumartesi': 1.55, 'Pazar': 1.40,
  }
  let demandMult = dayMultiplier[dayOfWeek] ?? 1.0
  events.forEach(e => { demandMult += e.impact * 0.4 })

  const predictedDemand: ShiftPlan['predictedDemand'] =
    demandMult >= 1.5 ? 'VERY_HIGH' : demandMult >= 1.2 ? 'HIGH' : demandMult >= 0.9 ? 'MEDIUM' : 'LOW'

  const baseStaff = { LOW: 4, MEDIUM: 6, HIGH: 8, VERY_HIGH: 10 }[predictedDemand]
  const recommended = {
    total: baseStaff,
    grill: Math.round(baseStaff * 0.28),
    fryer: Math.round(baseStaff * 0.22),
    packing: Math.round(baseStaff * 0.28),
    cashier: Math.round(baseStaff * 0.14),
    manager: 1,
  }

  const currentStaff = {
    total: Math.max(3, recommended.total - Math.round(Math.sin(seed) * 2)),
    grill: Math.max(1, recommended.grill - (Math.sin(seed) > 0 ? 1 : 0)),
    fryer: Math.max(1, recommended.fryer),
    packing: Math.max(1, recommended.packing - (Math.sin(seed * 1.3) > 0.3 ? 1 : 0)),
    cashier: Math.max(1, recommended.cashier),
    manager: 1,
  }

  const riskFactors: string[] = []
  if (events.some(e => e.type === 'FOOTBALL')) riskFactors.push('Maç sonrası sipariş dalgası bekleniyor')
  if (events.some(e => e.type === 'RAIN')) riskFactors.push('Yağmur — Tıkla Gelsin talebi %35+ artış')
  if (events.some(e => e.type === 'HOLIDAY')) riskFactors.push('Tatil günü — normal vardiya planı geçersiz')
  if (currentStaff.total < recommended.total) riskFactors.push(`${recommended.total - currentStaff.total} kişi eksik — acil takviye gerekli`)
  if (dayOfWeek === 'Cuma' || dayOfWeek === 'Cumartesi') riskFactors.push('Hafta sonu — peak saat 19:00–21:00 kritik')

  const peakHours = [
    { start: '12:00', end: '13:30', intensity: 0.75 },
    { start: '18:30', end: '20:30', intensity: demandMult > 1.3 ? 1.0 : 0.85 },
    { start: '21:00', end: '22:00', intensity: 0.6 },
  ]

  const baseRevenue = 35000 + (restaurantId.charCodeAt(1) - 49) * 3000
  const estimatedRevenue = Math.round(baseRevenue * demandMult)

  const justifications: Record<string, string> = {
    VERY_HIGH: `${dayOfWeek} + ${events.map(e => e.name).join(' + ')} kombinasyonu — geçmiş benzer günlerde %${Math.round(demandMult * 60)} üzeri yoğunluk yaşandı. Maksimum kadro şart.`,
    HIGH: `${dayOfWeek} günü tarihsel yoğunluk yüksek${events.length > 0 ? `, ayrıca ${events[0].name} etkisi bekleniyor` : ''}. Güçlendirilmiş kadro öneriliyor.`,
    MEDIUM: `Normal ${dayOfWeek} profili. Standart kadro yeterli, ancak packing takviyesi hazırda beklemeli.`,
    LOW: `Düşük talep bekleniyor. Minimum kadro ile verimli çalışılabilir.`,
  }

  return {
    date: dateStr, restaurantId, dayOfWeek, predictedDemand,
    recommendedStaff: recommended, currentStaff,
    riskFactors, externalEvents: events, peakHours,
    estimatedRevenue, estimatedOrders: Math.round(estimatedRevenue / 190),
    aiJustification: justifications[predictedDemand],
    confidence: 0.78 + Math.sin(seed) * 0.12,
  }
}

export function getWeeklyShiftPlans(restaurantId: string): ShiftPlan[] {
  return Object.keys(UPCOMING_EVENTS).map(date => generateShiftPlan(restaurantId, date))
}

export const HISTORICAL_PERFORMANCE: HistoricalShiftPerformance[] = [
  { date: '2026-08-21', dayOfWeek: 'Cuma',     staffCount: 7, avgPulseScore: 71, peakPulseScore: 91, totalOrders: 312, delayRate: 0.14, complaintCount: 9,  revenue: 58400 },
  { date: '2026-08-22', dayOfWeek: 'Cumartesi', staffCount: 9, avgPulseScore: 64, peakPulseScore: 82, totalOrders: 389, delayRate: 0.09, complaintCount: 6,  revenue: 71200 },
  { date: '2026-08-23', dayOfWeek: 'Pazar',     staffCount: 8, avgPulseScore: 59, peakPulseScore: 76, totalOrders: 341, delayRate: 0.08, complaintCount: 5,  revenue: 63800 },
  { date: '2026-08-24', dayOfWeek: 'Pazartesi', staffCount: 5, avgPulseScore: 38, peakPulseScore: 55, totalOrders: 198, delayRate: 0.03, complaintCount: 2,  revenue: 37200 },
  { date: '2026-08-25', dayOfWeek: 'Salı',      staffCount: 5, avgPulseScore: 34, peakPulseScore: 51, totalOrders: 187, delayRate: 0.02, complaintCount: 1,  revenue: 34900 },
  { date: '2026-08-26', dayOfWeek: 'Çarşamba',  staffCount: 6, avgPulseScore: 44, peakPulseScore: 63, totalOrders: 234, delayRate: 0.05, complaintCount: 3,  revenue: 43600 },
  { date: '2026-08-27', dayOfWeek: 'Perşembe',  staffCount: 6, avgPulseScore: 51, peakPulseScore: 72, totalOrders: 267, delayRate: 0.07, complaintCount: 4,  revenue: 49800 },
]
