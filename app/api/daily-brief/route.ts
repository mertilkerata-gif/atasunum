/**
 * /api/daily-brief — günde 1 kez sabah 07:00 TR çalışır
 * Vercel Cron: 0 4 * * * (UTC)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SB_URL  = 'https://exkhzmpowcoxdzzvzisv.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4a2h6bXBvd2NveGR6enZ6aXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Mzg5OTUsImV4cCI6MjEwMzQxNDk5NX0.bysVio77j6ncmzYjt3T2saDPCmV3NnqbOyWFS987YIQ'
const sb = () => createClient(SB_URL, SB_ANON)

const ALL_DISTRICTS = ['Beşiktaş','Kadıköy','Maltepe','Pendik','Ümraniye','Taksim','Bağcılar','Şişli','Bakırköy','Üsküdar']
const VENUE_MAP: Record<string,string[]> = {
  'Vodafone Park':         ['Beşiktaş','Şişli'],
  'Ülker Stadyumu':        ['Kadıköy','Maltepe'],
  'Türk Telekom Stadyumu': ['Şişli','Bağcılar'],
  'Rams Park':             ['Bağcılar','Bakırköy'],
  'Harbiye Açıkhava':      ['Şişli','Beşiktaş'],
  'Atatürk Olimpiyat':     ['Bağcılar','Bakırköy'],
}

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
    || req.nextUrl.searchParams.get('key')
    || process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key gerekli' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  // Bugün zaten çalıştıysa tekrar çalıştırma — token tasarrufu
  const { data: existing } = await sb()
    .from('audit_logs')
    .select('id')
    .eq('action', 'DAILY_BRIEF')
    .gte('created_at', today + 'T00:00:00')
    .limit(1)

  if (existing?.length) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Bugün zaten çalıştı', date: today })
  }

  const dateStr = new Date().toLocaleDateString('tr-TR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  // Kısa ve öz prompt — token tasarrufu
  const prompt = `Bugün ${dateStr}, İstanbul.

Burger King ve Popeyes restoranları için SADECE satışları doğrudan etkileyen faktörleri listele.
Gereksiz açıklama yapma, sadece JSON döndür.

{
  "weather": {
    "condition": "yağmurlu/güneşli/bulutlu/karlı",
    "temp_min": 14,
    "temp_max": 20,
    "rain": false,
    "rain_intensity": 0.0,
    "order_impact_pct": 0,
    "note": "1 cümle"
  },
  "events": [
    {
      "type": "MATCH/HOLIDAY/CONCERT/OTHER",
      "title": "Başlık",
      "venue": "Mekan veya null",
      "time": "20:00 veya null",
      "home_team": "null veya takım",
      "away_team": "null veya takım",
      "districts": ["Beşiktaş"],
      "impact": "HIGH/MEDIUM/LOW",
      "order_pct": 35,
      "note": "1 cümle"
    }
  ],
  "summary": "2 cümle özet"
}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 800,   // Kısa tut
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) return NextResponse.json({ error: `OpenAI: ${res.status}` }, { status: 500 })

  const aiData = await res.json()
  let brief: any
  try { brief = JSON.parse(aiData.choices[0].message.content) }
  catch { return NextResponse.json({ error: 'Parse hatası' }, { status: 500 }) }

  // Bugünkü önceki kayıtları temizle
  await sb().from('events').delete().eq('event_date', today)

  const saved: any[] = []

  // Hava kaydet
  if (brief.weather) {
    const w = brief.weather
    const { data } = await sb().from('events').insert({
      event_date: today, event_type: 'WEATHER',
      title: `${w.condition} · ${w.temp_min}–${w.temp_max}°C`,
      description: w.note,
      affected_districts: ALL_DISTRICTS,
      impact_level: w.rain_intensity > 0.6 ? 'HIGH' : w.rain_intensity > 0.2 ? 'MEDIUM' : 'LOW',
      expected_order_increase_pct: w.order_impact_pct || 0,
    }).select().single()
    if (data) saved.push(data)
  }

  // Etkinlikler kaydet
  for (const ev of (brief.events || [])) {
    let districts: string[] = ev.districts || []
    if (ev.venue && VENUE_MAP[ev.venue]) districts = [...new Set([...districts, ...VENUE_MAP[ev.venue]])]
    if (!districts.length) districts = ALL_DISTRICTS

    const { data } = await sb().from('events').insert({
      event_date: today, event_type: ev.type,
      title: ev.title, description: ev.note,
      venue: ev.venue || null, kickoff_time: ev.time || null,
      home_team: ev.home_team || null, away_team: ev.away_team || null,
      affected_districts: districts,
      impact_level: ev.impact || 'MEDIUM',
      expected_order_increase_pct: ev.order_pct || 0,
    }).select().single()
    if (data) saved.push(data)
  }

  // Audit log — sadece 1 kayıt/gün kontrolü için
  await sb().from('audit_logs').insert({
    user_role: 'Günlük Brifing',
    action: 'DAILY_BRIEF',
    resource: 'events',
    details: { date: today, events: saved.length, summary: brief.summary, tokens: aiData.usage?.total_tokens },
  })

  return NextResponse.json({ ok: true, date: today, summary: brief.summary, events_saved: saved.length, tokens_used: aiData.usage?.total_tokens })
}

export const POST = GET
