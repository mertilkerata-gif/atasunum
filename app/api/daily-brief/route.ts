/**
 * GET /api/daily-brief
 * Günlük otomatik brifing:
 * 1. OpenAI web search ile bugünkü İstanbul hava + maç + özel gün çeker
 * 2. District→restoran eşleştirir
 * 3. events tablosuna yazar
 * 4. Pulse tahminlerini günceller
 * 
 * Vercel Cron ile her sabah 06:00'da çalışır
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

// Stadyum → bölge eşleşmesi
const VENUE_DISTRICT: Record<string, string[]> = {
  'Vodafone Park':          ['Beşiktaş', 'Şişli'],
  'Ülker Stadyum':          ['Kadıköy', 'Maltepe'],
  'Türk Telekom Stadyumu':  ['Şişli', 'Bağcılar'],
  'Rams Park':              ['Bağcılar', 'Bakırköy'],
  'Atatürk Olimpiyat':      ['Bağcılar', 'Şişli', 'Bakırköy'],
  'Sinan Erdem':            ['Bakırköy', 'Bağcılar'],
  'Volkswagen Arena':       ['Beşiktaş', 'Şişli'],
}

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') || process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key gerekli' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]
  const todayFormatted = new Date().toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric', weekday:'long' })

  // GPT-4o web search ile günlük brifing çek
  const prompt = `Bugün ${todayFormatted} için İstanbul'daki restoran operasyonlarını etkileyen TÜM olayları bul ve JSON olarak döndür.

ARAŞTIR:
1. İstanbul hava durumu bugün (yağmur var mı, şiddet, sıcaklık)
2. Bugün İstanbul'da oynanan futbol maçları (Süper Lig, UEFA, Türkiye Kupası)
3. Bugün İstanbul'da konser/festival/büyük etkinlik var mı
4. Bugün resmi tatil veya özel gün var mı (dini bayram, milli bayram, anneler günü vb.)
5. Yarın veya bu hafta sonu önemli etkinlik var mı

Her etkinlik için:
- Hangi İstanbul ilçelerini etkiler: Beşiktaş, Kadıköy, Maltepe, Pendik, Ümraniye, Taksim, Bağcılar, Şişli, Bakırköy, Üsküdar
- Fast food restoranlarına tahmini sipariş etkisi (% artış veya azalış)
- Stadyum/mekan adı (futbol maçı ise)
- Başlangıç saati

JSON SADECE şu formatta döndür:
{
  "date": "${today}",
  "weather": {
    "condition": "yağmurlu/güneşli/bulutlu/karlı",
    "rain_intensity": 0.0,
    "temperature": 18,
    "wind_speed": 20,
    "description": "Kısa hava açıklaması",
    "affected_districts": ["tüm İstanbul ilçeleri"],
    "order_impact_pct": 15,
    "courier_impact": "kurye gecikmesi bekleniyor / normal"
  },
  "events": [
    {
      "type": "MATCH/CONCERT/HOLIDAY/CAMPAIGN/OTHER",
      "title": "Etkinlik adı",
      "description": "Kısa açıklama",
      "venue": "Mekan adı veya null",
      "kickoff_time": "20:00 veya null",
      "home_team": "Takım adı veya null",
      "away_team": "Takım adı veya null",
      "affected_districts": ["Beşiktaş", "Şişli"],
      "impact_level": "LOW/MEDIUM/HIGH/CRITICAL",
      "expected_order_increase_pct": 35,
      "notes": "Operasyon notu"
    }
  ],
  "tomorrow_preview": "Yarın için kısa uyarı veya boş string",
  "summary": "Bugün için 1-2 cümle operasyon özeti"
}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
      // Web search tool
      tools: [{
        type: 'function',
        function: {
          name: 'web_search',
          description: 'Search the web for current information',
          parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
        }
      }]
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `OpenAI: ${res.status}`, detail: err.slice(0,200) }, { status: 500 })
  }

  const aiData = await res.json()
  let brief: any
  try {
    const content = aiData.choices[0].message.content
    brief = JSON.parse(content)
  } catch {
    return NextResponse.json({ error: 'Parse hatası', raw: aiData.choices[0]?.message?.content?.slice(0,200) }, { status: 500 })
  }

  // Önce bugünkü otomatik kayıtları temizle
  await sb().from('events').delete().eq('event_date', today).eq('event_type', 'WEATHER')

  const saved: any[] = []

  // 1. Hava durumu kaydet
  if (brief.weather) {
    const w = brief.weather
    const allDistricts = Object.keys(DISTRICT_MAP)
    const { data: weatherEvent } = await sb().from('events').insert({
      event_date: today,
      event_type: 'WEATHER',
      title: `Hava: ${w.condition} · ${w.temperature}°C`,
      description: `${w.description} · Kurye: ${w.courier_impact}`,
      affected_districts: w.rain_intensity > 0.3 ? allDistricts : (w.affected_districts || []),
      impact_level: w.rain_intensity > 0.7 ? 'HIGH' : w.rain_intensity > 0.3 ? 'MEDIUM' : 'LOW',
      expected_order_increase_pct: w.order_impact_pct || 0,
    }).select().single()
    if (weatherEvent) saved.push(weatherEvent)

    // Snapshot'lara yağmur bilgisi yaz
    if (w.rain_intensity > 0.3) {
      const { data: rests } = await sb().from('restaurants').select('id')
      for (const r of (rests ?? [])) {
        const { data: cur } = await sb().from('operation_snapshots')
          .select('*').eq('restaurant_id', r.id).order('timestamp', { ascending: false }).limit(1).single()
        if (cur) {
          await sb().from('operation_snapshots').insert({
            ...cur, id: undefined,
            rain_intensity: Math.round(w.rain_intensity * 10),
            timestamp: new Date().toISOString(),
          })
        }
      }
    }
  }

  // 2. Etkinlikleri kaydet
  for (const ev of (brief.events || [])) {
    // Venue'dan district bul
    let districts = ev.affected_districts || []
    if (ev.venue && VENUE_DISTRICT[ev.venue]) {
      districts = [...new Set([...districts, ...VENUE_DISTRICT[ev.venue]])]
    }

    // Bugünkü aynı etkinlik varsa atla
    const { data: exists } = await sb().from('events')
      .select('id').eq('event_date', today).eq('title', ev.title).limit(1)
    if (exists?.length) continue

    const { data: newEv } = await sb().from('events').insert({
      event_date: today,
      event_type: ev.type,
      title: ev.title,
      description: ev.description,
      venue: ev.venue || null,
      kickoff_time: ev.kickoff_time || null,
      home_team: ev.home_team || null,
      away_team: ev.away_team || null,
      affected_districts: districts,
      impact_level: ev.impact_level,
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
      weather: brief.weather?.condition,
      events_found: brief.events?.length || 0,
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
  })
}

// Vercel Cron için POST de destekle
export const POST = GET
