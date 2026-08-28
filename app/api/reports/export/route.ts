import { NextRequest } from 'next/server'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot } from '@/data/seed/mock-data'
import { getRevenueSnapshot } from '@/data/seed/revenue'
import { getComplaintSummary } from '@/data/seed/complaints'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'pulse'
  const format = searchParams.get('format') ?? 'csv'

  const rows: string[][] = []

  if (type === 'pulse') {
    rows.push(['Restoran', 'İlçe', 'Marka', 'Nabız Skoru', 'Risk Seviyesi', 'Açık Sipariş', 'Hazırlama (dk)', 'Kurye Bekleme (dk)', 'Grill', 'Fryer', 'Packing', 'Kurye', 'Tarih'])
    RESTAURANTS.forEach(r => {
      const p = getPulseScore(r.id)
      rows.push([r.name, r.district, r.brand, String(p.score), p.risk_level, String(p.open_orders), p.avg_prep_time.toFixed(1), p.courier_wait.toFixed(1), String(p.station_scores.grill), String(p.station_scores.fryer), String(p.station_scores.packing), String(p.station_scores.courier), new Date().toISOString().split('T')[0]])
    })
  } else if (type === 'revenue') {
    rows.push(['Restoran', 'Gerçekleşen Ciro (₺)', 'Kayıp Ciro (₺)', 'İptal Kayıp (₺)', 'Gecikme Kayıp (₺)', 'Fırsat Kaybı (₺)', 'Kapasite (%)', 'Büyüme (%)'])
    RESTAURANTS.forEach(r => {
      const rev = getRevenueSnapshot(r.id)
      rows.push([r.name, String(rev.actualRevenue), String(rev.totalLostRevenue), String(rev.lostRevenueCancelled), String(rev.lostRevenueDelayed), String(rev.missedRevenueOpportunity), String(rev.capacityUtilization), String(rev.revenueGrowth)])
    })
  } else if (type === 'complaints') {
    rows.push(['Restoran', 'Toplam Şikayet', 'Kayıp Ciro (₺)', 'Çözüm Oranı (%)', 'Ort. Puan', 'Şikayet Oranı'])
    RESTAURANTS.forEach(r => {
      const comp = getComplaintSummary(r.id)
      rows.push([r.name, String(comp.total), String(comp.totalLostRevenue), String(Math.round(comp.resolvedRate * 100)), String(comp.avgScore), String(comp.complaintRate)])
    })
  }

  const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  const bom = '\uFEFF' // UTF-8 BOM for Excel

  return new Response(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="mutfak-nabzi-${type}-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
