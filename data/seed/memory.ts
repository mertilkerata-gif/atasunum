export interface OperationMemoryEntry {
  id: string
  restaurantId: string
  restaurantName: string
  date: string
  time: string
  action: string
  actionType: 'STAFF_ADD' | 'PREP_ADJUST' | 'COURIER_PRIORITY' | 'STOCK_REFILL' | 'PROCESS_CHANGE'
  station: string
  before: { metric: string; value: string }
  after:  { metric: string; value: string }
  improvement: number // yüzde
  pulseBefore: number
  pulseAfter: number
  appliedBy: string
  aiRecommended: boolean
  learnedPattern?: string
}

export interface LearnedPattern {
  id: string
  pattern: string
  trigger: string
  recommendedAction: string
  successRate: number
  appliedCount: number
  avgImprovement: number
  restaurants: string[]
}

export const MEMORY_ENTRIES: OperationMemoryEntry[] = [
  {
    id: 'm1', restaurantId: 'r1', restaurantName: 'BK Kadıköy',
    date: '2026-08-27', time: '18:34', action: 'Packing alanına +1 personel kaydırıldı',
    actionType: 'STAFF_ADD', station: 'Packing',
    before: { metric: 'Hazırlama Süresi', value: '12.4 dk' },
    after:  { metric: 'Hazırlama Süresi', value: '7.1 dk' },
    improvement: 43, pulseBefore: 84, pulseAfter: 61,
    appliedBy: 'Ahmet Yılmaz (Müdür)', aiRecommended: true,
    learnedPattern: 'Cuma 18:00+ / yağmur / packing %90+ → +1 packing personeli',
  },
  {
    id: 'm2', restaurantId: 'r6', restaurantName: 'Popeyes Taksim',
    date: '2026-08-26', time: '19:12', action: 'Yoğun ürünlerde ön hazırlık artırıldı',
    actionType: 'PREP_ADJUST', station: 'Grill',
    before: { metric: 'Grill Yükü', value: '%94' },
    after:  { metric: 'Grill Yükü', value: '%71' },
    improvement: 25, pulseBefore: 91, pulseAfter: 74,
    appliedBy: 'Sistem AI', aiRecommended: true,
    learnedPattern: 'Hafta sonu 19:00-21:00 / grill %85+ → ön hazırlık artır',
  },
  {
    id: 'm3', restaurantId: 'r5', restaurantName: 'BK Maltepe',
    date: '2026-08-25', time: '13:22', action: 'Kurye bekleyen siparişler önceliklendirildi',
    actionType: 'COURIER_PRIORITY', station: 'Kurye',
    before: { metric: 'Kurye Bekleme', value: '8.9 dk' },
    after:  { metric: 'Kurye Bekleme', value: '4.2 dk' },
    improvement: 53, pulseBefore: 71, pulseAfter: 52,
    appliedBy: 'Mehmet Kaya (Müdür)', aiRecommended: true,
  },
  {
    id: 'm4', restaurantId: 'r2', restaurantName: 'BK Beşiktaş',
    date: '2026-08-24', time: '20:45', action: 'Online sipariş önceliği dengelendi',
    actionType: 'PROCESS_CHANGE', station: 'Genel',
    before: { metric: 'İptal Oranı', value: '%12' },
    after:  { metric: 'İptal Oranı', value: '%4' },
    improvement: 67, pulseBefore: 67, pulseAfter: 48,
    appliedBy: 'Fatma Demir (Müdür)', aiRecommended: false,
  },
  {
    id: 'm5', restaurantId: 'r1', restaurantName: 'BK Kadıköy',
    date: '2026-08-22', time: '12:11', action: 'Fryer kapasitesi artırıldı (ekstra sepet)',
    actionType: 'PREP_ADJUST', station: 'Fryer',
    before: { metric: 'Fryer Yükü', value: '%88' },
    after:  { metric: 'Fryer Yükü', value: '%64' },
    improvement: 27, pulseBefore: 79, pulseAfter: 58,
    appliedBy: 'Ahmet Yılmaz (Müdür)', aiRecommended: true,
    learnedPattern: 'Öğle saati 11:30-13:30 / fryer %85+ → ekstra sepet',
  },
  {
    id: 'm6', restaurantId: 'r9', restaurantName: 'BK Pendik',
    date: '2026-08-21', time: '19:55', action: 'Stok ikmal edildi (Whopper ekmeği)',
    actionType: 'STOCK_REFILL', station: 'Stok',
    before: { metric: 'Stok Seviyesi', value: '4 adet (kritik)' },
    after:  { metric: 'Stok Seviyesi', value: '48 adet' },
    improvement: 100, pulseBefore: 62, pulseAfter: 44,
    appliedBy: 'Kader Şahin (Müdür)', aiRecommended: true,
  },
]

export const LEARNED_PATTERNS: LearnedPattern[] = [
  {
    id: 'lp1',
    pattern: 'Cuma/Cumartesi 18:00-21:00 + Yağmur',
    trigger: 'Nabız > 75, Packing > %85, Yağmur yoğunluğu > 6',
    recommendedAction: 'Packing +1 personel, online sipariş önceliği dengele',
    successRate: 87, appliedCount: 23, avgImprovement: 38,
    restaurants: ['r1', 'r5', 'r6'],
  },
  {
    id: 'lp2',
    pattern: 'Öğle Saati Grill Baskısı',
    trigger: 'Saat 11:30-13:30, Grill > %80, Whopper talebi yüksek',
    recommendedAction: 'Ön hazırlık artır, fryer ekstra sepet',
    successRate: 79, appliedCount: 18, avgImprovement: 29,
    restaurants: ['r1', 'r2', 'r3'],
  },
  {
    id: 'lp3',
    pattern: 'Maç Sonrası Kurye Baskısı',
    trigger: 'Maç bitişinden 30 dk sonra, kurye bekleme > 7 dk',
    recommendedAction: 'Kurye bekleyenleri önceliklendir, hazır siparişleri öne al',
    successRate: 91, appliedCount: 8, avgImprovement: 52,
    restaurants: ['r1', 'r6'],
  },
]
