/**
 * Recommendation Service
 * PulseOutput + Snapshot verisini OpenAI'ya gönderir
 * Operasyon Reçetesi üretir — JSON çıktı
 */

import { callLLMWithFallback } from './llm'
import { PulseOutput, PulseInput } from './pulse'

export interface RecommendationResult {
  summary: string
  risk_explanation: string
  actions: {
    action_text: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    station?: 'grill' | 'fryer' | 'packing' | 'courier' | 'general'
    expected_improvement?: string
    time_to_impact?: string   // "5 dk", "15 dk" vb.
  }[]
  forecast_note?: string      // "Önümüzdeki 20 dk..." gibi tahmin notu
}

const SYSTEM_PROMPT = `Sen TAB Gıda (Burger King / Popeyes) restoran operasyon uzmanısın.
Sana bir restoranın anlık operasyon verisi ve nabız skoru gelecek.
Görevin: restoran müdürüne uygulanabilir, somut operasyon reçetesi üretmek.

KURALLAR:
- Maksimum 4 aksiyon öner
- Her aksiyon tek cümle, açık ve net
- Türkçe yaz
- JSON formatında döndür
- Aksiyonlar öncelik sırasına göre olsun (HIGH önce)
- Gerçekçi süre ve iyileşme tahminleri ver

JSON FORMATI:
{
  "summary": "kısa özet (1 cümle)",
  "risk_explanation": "neden bu risk seviyesinde (1-2 cümle, rakam kullan)",
  "actions": [
    {
      "action_text": "aksiyon metni",
      "priority": "HIGH|MEDIUM|LOW",
      "station": "grill|fryer|packing|courier|general",
      "expected_improvement": "beklenen iyileşme",
      "time_to_impact": "etki süresi"
    }
  ],
  "forecast_note": "önümüzdeki 15-20 dakika için tahmin notu"
}`

export async function generateRecommendation(
  restaurantName: string,
  pulse: PulseOutput,
  input: Partial<PulseInput>,
  contextTime?: string
): Promise<RecommendationResult> {
  const time = contextTime ?? new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  const userPrompt = `
Restoran: ${restaurantName}
Saat: ${time}

NABIZ SKORU: ${pulse.score}/100 — ${pulse.risk_level}

ANLANI VERİLER:
- Açık sipariş: ${input.open_orders ?? '?'}
- Ort. hazırlama: ${input.avg_preparation_time?.toFixed(1) ?? '?'} dk
- Ort. packing: ${input.avg_packing_time?.toFixed(1) ?? '?'} dk
- Kurye bekleme: ${input.avg_courier_wait?.toFixed(1) ?? '?'} dk
- Gecikme oranı: %${Math.round((input.delay_rate ?? 0) * 100)}
- İptal oranı: %${Math.round((input.cancellation_rate ?? 0) * 100)}

İSTASYON YÜKLERİ:
- Grill: ${pulse.station_scores.grill}/100
- Fryer: ${pulse.station_scores.fryer}/100
- Packing: ${pulse.station_scores.packing}/100
- Kurye: ${pulse.station_scores.courier}/100

AKTİF SİNYALLER:
${pulse.top_signals.map(s => `- ${s}`).join('\n')}

DIŞ FAKTÖRLER:
- Yağış yoğunluğu: ${input.rain_intensity ?? 0}/10
- Kampanya: ${input.campaign_active ? 'Aktif' : 'Yok'}
- Özel gün: ${input.special_event ? 'Evet' : 'Hayır'}

Operasyon reçetesi üret (JSON).`

  const fallbackResult: RecommendationResult = {
    summary: `${restaurantName} restoranında operasyonel yoğunluk tespit edildi.`,
    risk_explanation: `Nabız skoru ${pulse.score}/100 ile ${pulse.risk_level} seviyesinde. ${pulse.top_signals[0] ?? 'İstasyon yükleri yüksek.'}`,
    actions: [
      { action_text: 'Packing alanına geçici +1 personel kaydırılsın', priority: 'HIGH', station: 'packing', expected_improvement: 'Hazırlama süresi ~3 dk düşer', time_to_impact: '5 dk' },
      { action_text: 'Yoğun ürünlerde ön hazırlık artırılsın', priority: 'HIGH', station: 'grill', expected_improvement: 'Grill yükü %15 azalır', time_to_impact: '10 dk' },
      { action_text: 'Kurye bekleyen siparişler önceliklendirilsin', priority: 'MEDIUM', station: 'courier', time_to_impact: '5 dk' },
      { action_text: 'Online sipariş hazırlama önceliği dengelensin', priority: 'MEDIUM', station: 'general', time_to_impact: '5 dk' },
    ],
    forecast_note: 'Mevcut tempo devam ederse önümüzdeki 20 dakikada gecikme riski artacak.',
  }

  const res = await callLLMWithFallback(
    [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
    JSON.stringify(fallbackResult),
    { jsonMode: true, maxTokens: 1000, temperature: 0.2 }
  )

  try {
    return JSON.parse(res.content) as RecommendationResult
  } catch {
    return fallbackResult
  }
}
