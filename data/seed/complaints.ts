export type ComplaintReason =
  | 'GEC_TESLIMAT' | 'EKSIK_URUN' | 'SOGUK_YEMEK' | 'YANLIS_SIPARIS'
  | 'AMBALAJ_HASARI' | 'KALITE' | 'KURYE' | 'DIGER'

export interface Complaint {
  id: string
  restaurantId: string
  orderId: string
  channel: 'DELIVERY' | 'PICKUP' | 'DINE_IN'
  reason: ComplaintReason
  score: number // 1-5 müşteri puanı
  resolvedAt?: string
  createdAt: string
  lostRevenue: number // TL — kaybedilen/iade edilen tutar
}

export interface ComplaintSummary {
  restaurantId: string
  total: number
  byReason: Record<ComplaintReason, number>
  avgScore: number
  resolvedRate: number
  totalLostRevenue: number
  complaintRate: number // şikayet / toplam sipariş
  trend: 'up' | 'down' | 'stable'
  weeklyTrend: { day: string; count: number; lostRevenue: number }[]
}

const REASON_LABELS: Record<ComplaintReason, string> = {
  GEC_TESLIMAT: 'Geç Teslimat',
  EKSIK_URUN: 'Eksik Ürün',
  SOGUK_YEMEK: 'Soğuk Yemek',
  YANLIS_SIPARIS: 'Yanlış Sipariş',
  AMBALAJ_HASARI: 'Ambalaj Hasarı',
  KALITE: 'Kalite Sorunu',
  KURYE: 'Kurye Davranışı',
  DIGER: 'Diğer',
}
export { REASON_LABELS }

// Restoran bazlı şikayet profili — nabız skoruyla orantılı
const complaintProfiles: Record<string, { total: number; topReason: ComplaintReason; lostRevenue: number }> = {
  r1: { total: 18, topReason: 'GEC_TESLIMAT',  lostRevenue: 2840 },
  r2: { total: 11, topReason: 'GEC_TESLIMAT',  lostRevenue: 1650 },
  r3: { total: 6,  topReason: 'EKSIK_URUN',    lostRevenue: 820  },
  r4: { total: 3,  topReason: 'DIGER',          lostRevenue: 340  },
  r5: { total: 14, topReason: 'SOGUK_YEMEK',   lostRevenue: 2100 },
  r6: { total: 24, topReason: 'GEC_TESLIMAT',  lostRevenue: 4200 },
  r7: { total: 4,  topReason: 'YANLIS_SIPARIS', lostRevenue: 480  },
  r8: { total: 8,  topReason: 'GEC_TESLIMAT',  lostRevenue: 1100 },
  r9: { total: 10, topReason: 'SOGUK_YEMEK',   lostRevenue: 1480 },
  r10:{ total: 2,  topReason: 'DIGER',          lostRevenue: 220  },
}

export function getComplaintSummary(restaurantId: string): ComplaintSummary {
  const profile = complaintProfiles[restaurantId] ?? { total: 5, topReason: 'DIGER' as ComplaintReason, lostRevenue: 600 }
  const seed = restaurantId.charCodeAt(1)

  const byReason: Record<ComplaintReason, number> = {
    GEC_TESLIMAT: 0, EKSIK_URUN: 0, SOGUK_YEMEK: 0, YANLIS_SIPARIS: 0,
    AMBALAJ_HASARI: 0, KALITE: 0, KURYE: 0, DIGER: 0,
  }

  // Top reason = majority
  byReason[profile.topReason] = Math.round(profile.total * 0.5)
  const secondary: ComplaintReason[] = ['EKSIK_URUN', 'SOGUK_YEMEK', 'DIGER']
  secondary.forEach((r, i) => {
    if (r !== profile.topReason) byReason[r] = Math.round(profile.total * (0.2 - i * 0.05))
  })

  const weeklyTrend = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, i) => ({
    day,
    count: Math.max(0, Math.round((profile.total / 7) * (1 + Math.sin(seed + i) * 0.4))),
    lostRevenue: Math.round((profile.lostRevenue / 7) * (1 + Math.sin(seed + i) * 0.3)),
  }))

  return {
    restaurantId,
    total: profile.total,
    byReason,
    avgScore: +(2.8 + Math.sin(seed) * 0.8).toFixed(1),
    resolvedRate: 0.72 + Math.sin(seed) * 0.15,
    totalLostRevenue: profile.lostRevenue,
    complaintRate: +(profile.total / 200).toFixed(3),
    trend: profile.total > 15 ? 'up' : profile.total < 5 ? 'down' : 'stable',
    weeklyTrend,
  }
}

export function getAllComplaintSummaries() {
  return Object.keys(complaintProfiles).map(id => getComplaintSummary(id))
}
