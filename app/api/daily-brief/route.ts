/**
 * GET/POST /api/daily-brief
 * GPT-4o'ya bugünü sor → hava + maç + haber + özel gün → events tablosuna yaz
 * Vercel Cron: her sabah 04:00 UTC (07:00 TR)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SB_URL  = 'https://exkhzmpowcoxdzzvzisv.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4a2h6bXBvd2NveGR6enZ6aXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Mzg5OTUsImV4cCI6MjEwMzQxNDk5NX0.bysVio77j6ncmzYjt3T2saDPCmV3NnqbOyWFS987YIQ'
const sb = () => createClient(SB_URL, SB_ANON)

const DISTRICT_MAP: Record<string, string[]> = {
  'Beşiktaş':['r1'], 'Kadıköy':['r2'], 'Maltepe':['r3'], 'Pendik':['r4'],
  'Ümraniye':['r5'], 'Taksim':['r6'], 'Bağcılar':['r7'], 'Şişli':['r8'],
  'Bakırköy':['r9'], 'Üsküdar':['r10'],
}

const VENUE_MAP: Record<string, string[]> = {
  'Vodafone Park':        ['Beşiktaş','Şişli'],
  'Ülker Stadyumu':       ['Kadıköy','Maltepe'],
  'Türk Telekom Stadyumu':['Şişli','Bağcılar'],
  'Rams Park':            ['Bağcılar','Bakırköy'],
  'Atatürk Olimpiyat':    ['Bağcılar','Şişli','Bakırköy'],
  'Sinan Erdem':          ['Bakırköy','Bağcılar'],
  'Taksim Meydanı':       ['Taksim','Şişli','Beşiktaş'],
  'Harbiye Açıkhava':     ['Şişli','Beşiktaş'],
}

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
    || req.nextUrl.searchParams.get('key')
    || process.env.OPENAI_API_KEY

  if (!apiKey) return NextResponse.json({ error: 'API key gerekli' }, { status: 401 })

  const today     = new Date().toISOString().split('T')[0]
  const now       = new Date()
  const dayName   = now.toLocaleDateString('tr-TR', { weekday:'long' })
  const dateStr   = now.toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' })
  const timeStr   = now.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' })

  // GPT-4o'ya sor — kendi güncel bilgisi + web search
  const prompt = `Bugün ${dayName}, ${dateStr}, saat ${timeStr} (Türkiye saati).

Sen bir İstanbul operasyon analistisin. Burger King ve Popeyes restoranlarının satışlarını etkileyen TÜM faktörleri araştır ve JSON olarak döndür.

ARAŞTIR:
1. **Hava durumu**: Bugün İstanbul'da hava nasıl? Yağmur, kar, sıcaklık, rüzgar. Fast food teslimat siparişlerini nasıl etkiler?

2. **Futbol maçları**: Bugün İstanbul'da oynanan Süper Lig, UEFA, Türkiye Kupası maçları? Hangi stadyumda, saat kaçta? Beşiktaş/Fenerbahçe/Galatasaray/Başakşehir maçı var mı?

3. **Özel günler**: Bugün resmi tatil, dini bayram, anneler günü, sevgililer günü, milli bayram, öğrenci sınavı (YKS/LGS/KPSS) gibi özel bir gün var mı?

4. **Etkinlikler**: İstanbul'da büyük konser, festival, fuar, maraton, gösteri var mı? Nerede?

5. **Gündem haberleri**: İstanbul'da bugün satışları doğrudan etkileyecek büyük bir olay var mı? (Ulaşım grevi, büyük spor organizasyonu, turizm yoğunluğu, tatil dönüşü trafiği vb.)

6. **Yarın/Bu hafta sonu**: Yarın veya bu hafta sonu için önemli bir uyarı var mı?

SADECE JSON döndür, başka bir şey yazma:
{
  "date": "${today}",
  "generated_at": "${now.toISOString()}",
  "summary": "Bugün için 2-3 cümle operasyon özeti. Satışları etkileyecek ana faktörleri belirt.",
  "tomorrow_preview": "Yarın için kısa uyarı veya boş string",
  "weather": {
    "condition": "yağmurlu/güneşli/bulutlu/karlı/fırtınalı",
    "temperature_min": 12,
    "temperature_max": 18,
    "rain_intensity": 0.6,
    "description": "Öğleden sonra sağanak yağış bekleniyor",
    "order_impact": "TG siparişleri %25 artar, kurye gecikmesi olabilir",
    "order_impact_pct": 25
  },
  "events": [
    {
      "type": "MATCH",
      "title": "Beşiktaş - Galatasaray",
      "description": "Süper Lig 28. hafta derbisi",
      "venue": "Vodafone Park",
      "kickoff_time": "20:00",
      "home_team": "Beşiktaş",
      "away_team": "Galatasaray",
      "affected_districts": ["Beşiktaş", "Şişli"],
      "impact_level": "CRITICAL",
      "expected_order_increase_pct": 45,
      "impact_window": "18:00-23:30",
      "notes": "Maçtan 2 saat önce ve sonra pik bekleniyor"
    },
    {
      "type": "HOLIDAY",
      "title": "23 Nisan Ulusal Egemenlik Günü",
      "description": "Resmi tatil — okullar kapalı, aileler evde",
      "venue": null,
      "kickoff_time": null,
      "home_team": null,
      "away_team": null,
      "affected_districts": ["Beşiktaş","Kadıköy","Maltepe","Pendik","Ümraniye","Taksim","Bağcılar","Şişli","Bakırköy","Üsküdar"],
      "impact_level": "HIGH",
      "expected_order_increase_pct": 30,
      "impact_window": "11:00-22:00",
      "notes": "Tüm gün yüksek sipariş bekleniyor"
    }
  ]
}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 2500,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `OpenAI: ${res.status}`, detail: err.slice(0,300) }, { status: 500 })
  }

  const aiData = await res.json()
  let brief: any
  try {
    brief = JSON.parse(aiData.choices[0].message.content)
  } catch {
    return NextResponse.json({ error: 'Parse hatası', raw: aiData.choices[0]?.message?.content?.slice(0,300) }, { status: 500 })
  }

  // Bugünkü otomatik kayıtları temizle (güncelleme için)
  await sb().from('events')
    .delete()
    .eq('event_date', today)
    .in('event_type', ['WEATHER','MATCH','CONCERT','HOLIDAY','OTHER'])

  const saved: any[] = []
  const allDistricts = Object.keys(DISTRICT_MAP)

  // 1. Hava kaydet
  if (brief.weather) {
    const w = brief.weather
    const { data: wEv } = await sb().from('events').insert({
      event_date: today,
      event_type: 'WEATHER',
      title: `Hava: ${w.condition} · ${w.temperature_min}–${w.temperature_max}°C`,
      description: `${w.description} · ${w.order_impact}`,
      affected_districts: allDistricts,
      impact_level: w.rain_intensity > 0.6 ? 'HIGH' : w.rain_intensity > 0.3 ? 'MEDIUM' : 'LOW',
      expected_order_increase_pct: w.order_impact_pct || 0,
    }).select().single()
    if (wEv) saved.push(wEv)
  }

  // 2. Etkinlikleri kaydet
  for (const ev of (brief.events || [])) {
    // Venue'dan otomatik district ekle
    let districts: string[] = ev.affected_districts || []
    if (ev.venue && VENUE_MAP[ev.venue]) {
      districts = [...new Set([...districts, ...VENUE_MAP[ev.venue]])]
    }
    // Hiç district yoksa tüm ağ
    if (!districts.length) districts = allDistricts

    const { data: newEv } = await sb().from('events').insert({
      event_date: today,
      event_type: ev.type || 'OTHER',
      title: ev.title,
      description: ev.description,
      venue: ev.venue || null,
      kickoff_time: ev.kickoff_time || null,
      home_team: ev.home_team || null,
      away_team: ev.away_team || null,
      affected_districts: districts,
      impact_level: ev.impact_level || 'MEDIUM',
      expected_order_increase_pct: ev.expected_order_increase_pct || 0,
    }).select().single()
    if (newEv) saved.push(newEv)
  }

  // 3. Audit log
  await sb().from('audit_logs').insert({
    user_role: 'Günlük Brifing Motoru',
    action: 'DAILY_BRIEF',
    resource: 'events',
    details: {
      date: today,
      generated_at: brief.generated_at,
      weather: brief.weather?.condition,
      events_found: (brief.events || []).length,
      events_saved: saved.length,
      summary: brief.summary,
      tomorrow_preview: brief.tomorrow_preview,
    },
  })

  return NextResponse.json({
    ok: true,
    date: today,
    summary: brief.summary,
    tomorrow_preview: brief.tomorrow_preview,
    weather: brief.weather,
    events_saved: saved.length,
    events: saved,
    raw_events: brief.events,
  })
}

export const POST = GET
