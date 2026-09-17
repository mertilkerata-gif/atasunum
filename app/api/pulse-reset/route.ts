import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SB_URL  = 'https://exkhzmpowcoxdzzvzisv.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4a2h6bXBvd2NveGR6enZ6aXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Mzg5OTUsImV4cCI6MjEwMzQxNDk5NX0.bysVio77j6ncmzYjt3T2saDPCmV3NnqbOyWFS987YIQ'
const sb = () => createClient(SB_URL, SB_ANON)

const PROFILES: Record<string, any> = {
  r1:  { score:84, risk:'KRITIK', open_orders:31, avg_prep:11.2, avg_packing:4.8, courier:8.1,  stations:{grill:88,fryer:72,packing:94,courier:81}, signals:['Açık sipariş sayısı normalin %35 üzerinde','Packing yükü kritik seviyede','Kurye bekleme süresi artıyor'] },
  r2:  { score:67, risk:'RISKLI', open_orders:22, avg_prep:9.1,  avg_packing:3.9, courier:5.4,  stations:{grill:71,fryer:65,packing:78,courier:62}, signals:['Hazırlama süresi yükseliyor','Sipariş geliş hızı artıyor'] },
  r3:  { score:45, risk:'YOGUN',  open_orders:18, avg_prep:7.8,  avg_packing:3.2, courier:4.1,  stations:{grill:52,fryer:48,packing:61,courier:44}, signals:['Sipariş yoğunluğu artışta'] },
  r4:  { score:28, risk:'NORMAL', open_orders:11, avg_prep:6.2,  avg_packing:2.8, courier:2.9,  stations:{grill:31,fryer:28,packing:35,courier:25}, signals:[] },
  r5:  { score:71, risk:'RISKLI', open_orders:25, avg_prep:10.1, avg_packing:4.2, courier:6.8,  stations:{grill:74,fryer:68,packing:82,courier:71}, signals:['Packing darboğazı oluşuyor','Kurye bekleme süresi yüksek'] },
  r6:  { score:91, risk:'KRITIK', open_orders:38, avg_prep:13.4, avg_packing:5.9, courier:11.2, stations:{grill:95,fryer:88,packing:97,courier:89}, signals:['Tüm istasyonlar kritik seviyede','Hazırlama süresi 2x normale çıktı','Sipariş iptali riski yüksek'] },
  r7:  { score:38, risk:'NORMAL', open_orders:14, avg_prep:6.8,  avg_packing:3.1, courier:3.2,  stations:{grill:41,fryer:35,packing:44,courier:38}, signals:[] },
  r8:  { score:55, risk:'YOGUN',  open_orders:19, avg_prep:8.4,  avg_packing:3.6, courier:4.8,  stations:{grill:58,fryer:54,packing:67,courier:52}, signals:['Packing yükü yükseliyor'] },
  r9:  { score:62, risk:'RISKLI', open_orders:21, avg_prep:9.4,  avg_packing:4.0, courier:5.9,  stations:{grill:65,fryer:61,packing:74,courier:63}, signals:['Fryer kapasitesi zorlanıyor','Kurye bekleme artışı'] },
  r10: { score:22, risk:'NORMAL', open_orders:8,  avg_prep:5.8,  avg_packing:2.4, courier:2.1,  stations:{grill:24,fryer:21,packing:28,courier:19}, signals:[] },
}

async function reset() {
  const now = new Date().toISOString()
  const rows = Object.entries(PROFILES).map(([id, p]) => ({
    restaurant_id: id, score: p.score, risk_level: p.risk,
    open_orders: p.open_orders, avg_prep_time: p.avg_prep,
    avg_packing_time: p.avg_packing, courier_wait: p.courier,
    station_scores: p.stations, top_signals: p.signals,
    component_scores: {}, computed_at: now,
  }))
  const { error } = await sb().from('pulse_scores').insert(rows)
  if (error) return { ok: false, error: error.message }
  return { ok: true, reset_count: rows.length, timestamp: now }
}

export async function POST() {
  const r = await reset()
  return r.ok ? NextResponse.json(r) : NextResponse.json(r, { status: 500 })
}
export async function GET() {
  const r = await reset()
  return r.ok ? NextResponse.json(r) : NextResponse.json(r, { status: 500 })
}
