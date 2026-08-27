/**
 * POST /api/ai-analyst
 * AI Analyst chat endpoint — OpenAI üzerinden
 * API key settings'ten veya env'den alınır
 */
import { NextRequest } from 'next/server'
import { errorResponse } from '@/lib/auth'
import { RESTAURANTS } from '@/data/seed/restaurants'
import { getPulseScore, getSnapshot } from '@/data/seed/mock-data'

const SYSTEM_PROMPT = `Sen Mutfak Nabzı sisteminin AI analistisisin. TAB Gıda (Burger King ve Popeyes) restoran operasyonlarını analiz ediyorsun.

Türkçe, kısa ve net cevaplar ver. Operasyon odaklı, somut rakamlar kullan.`

function buildContext(): string {
  const all = RESTAURANTS.map(r => {
    const p = getPulseScore(r.id)
    const s = getSnapshot(r.id)
    return `${r.name}: Nabız ${p.score} (${p.risk_level}), Açık sipariş: ${p.open_orders}, Hazırlama: ${p.avg_prep_time.toFixed(1)}dk, Packing: ${p.station_scores.packing}, Kurye bekl: ${p.courier_wait.toFixed(1)}dk`
  })
  return `\nMEVCUT DURUM:\n${all.join('\n')}\n\nGenel: Yağmurlu hava, 2 kritik restoran (Kadıköy BK, Taksim Popeyes), yoğun saat 18-20 arası.`
}

export async function POST(req: NextRequest) {
  let body: { messages: { role: string; content: string }[]; api_key?: string }
  try { body = await req.json() } catch {
    return errorResponse('Geçersiz JSON')
  }

  const apiKey = body.api_key || process.env.OPENAI_API_KEY
  if (!apiKey) {
    // Fallback mock yanıt
    const lastMsg = body.messages[body.messages.length - 1]?.content?.toLowerCase() ?? ''
    const fallbacks: [string, string][] = [
      ['riskli', '🔴 En riskli: Popeyes Taksim (91), BK Kadıköy (84). Her ikisinde packing kritik seviyede.'],
      ['yağmur', '🌧️ Yağmurlu günlerde TG Paket Servis +%31, normal restoran -%22. Bugün 5 restoran etkileniyor.'],
      ['packing', '📦 En yüksek packing yükü: Popeyes Taksim (%97), BK Kadıköy (%94), BK Maltepe (%82).'],
      ['öneri', '✅ Uygulanan AI önerileri hazırlama süresini ortalama %33 düşürüyor (son 30 gün).'],
      ['cuma', '📅 Cuma 18-21 için: 17:30\'da packing takviye, 18:00\'de kurye koordinasyonu aktive edilmeli.'],
    ]
    const match = fallbacks.find(([k]) => lastMsg.includes(k))
    return Response.json({ content: match ? match[1] : 'Mevcut verilere göre en kritik nokta packing kapasitesi. Daha spesifik soru için restoran adı veya zaman aralığı belirtin.' })
  }

  try {
    const context = buildContext()
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 600,
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + context },
          ...body.messages.slice(-8), // son 8 mesaj
        ],
      }),
    })
    if (!res.ok) throw new Error(`OpenAI: ${res.status}`)
    const data = await res.json()
    return Response.json({ content: data.choices[0].message.content })
  } catch (err) {
    return errorResponse('AI yanıt üretemedi: ' + String(err))
  }
}
