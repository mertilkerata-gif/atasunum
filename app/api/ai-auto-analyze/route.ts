/**
 * POST /api/ai-auto-analyze
 * Supabase'den canlı veri çeker → GPT-4o ile analiz eder
 * → Aksiyonları ai_recommendations'a yazar
 * → Anomalileri acknowledge eder
 * → audit_logs'a kaydeder
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPA_URL  = 'https://exkhzmpowcoxdzzvzisv.supabase.co'
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4a2h6bXBvd2NveGR6enZ6aXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Mzg5OTUsImV4cCI6MjEwMzQxNDk5NX0.bysVio77j6ncmzYjt3T2saDPCmV3NnqbOyWFS987YIQ'

const sb = () => createClient(SUPA_URL, SUPA_ANON)

export async function POST(req: NextRequest) {
  const { api_key, dry_run = false } = await req.json().catch(() => ({}))
  const apiKey = api_key || process.env.OPENAI_API_KEY 

  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key gerekli. Ayarlar sayfasından girin.' }, { status: 400 })
  }

  // ── 1. Supabase'den canlı veri çek ──────────────────────────────
  const [
    { data: restaurants },
    { data: pulseScores },
    { data: snapshots },
    { data: anomalies },
    { data: complaints },
    { data: revenue },
    { data: shifts },
    { data: stockLevels },
  ] = await Promise.all([
    sb().from('restaurants').select('*').eq('is_active', true),
    sb().from('pulse_scores').select('*').order('computed_at', { ascending: false }).limit(30),
    sb().from('operation_snapshots').select('*').order('timestamp', { ascending: false }).limit(20),
    sb().from('anomalies').select('*').eq('acknowledged', false).order('detected_at', { ascending: false }),
    sb().from('complaints').select('*').eq('status', 'OPEN').order('created_at', { ascending: false }).limit(20),
    sb().from('daily_revenue').select('*').eq('date', new Date().toISOString().split('T')[0]),
    sb().from('shifts').select('*')
      .gte('shift_start', new Date().toISOString().split('T')[0] + 'T00:00:00')
      .lte('shift_start', new Date().toISOString().split('T')[0] + 'T23:59:59'),
    sb().from('stock_levels').select('*, products(name, category)').lte('quantity', 10),
  ])

  // ── 2. Bağlam oluştur ───────────────────────────────────────────
  const pulseMap: Record<string, any> = {}
  const seen = new Set<string>()
  for (const p of (pulseScores ?? [])) {
    if (!seen.has(p.restaurant_id)) { seen.add(p.restaurant_id); pulseMap[p.restaurant_id] = p }
  }

  const snapMap: Record<string, any> = {}
  const seen2 = new Set<string>()
  for (const s of (snapshots ?? [])) {
    if (!seen2.has(s.restaurant_id)) { seen2.add(s.restaurant_id); snapMap[s.restaurant_id] = s }
  }

  const restLines = (restaurants ?? []).map(r => {
    const p = pulseMap[r.id]
    const s = snapMap[r.id]
    if (!p) return null
    return [
      `### ${r.name} (${r.id}) — ${p.risk_level} — Nabız: ${p.score}/100`,
      `  Açık sipariş: ${p.open_orders}, Hazırlama: ${(p.avg_prep_time||0).toFixed(1)}dk, Kurye bekl: ${(p.courier_wait||0).toFixed(1)}dk`,
      `  Grill: ${p.station_scores?.grill||0}%, Fryer: ${p.station_scores?.fryer||0}%, Packing: ${p.station_scores?.packing||0}%, Kurye: ${p.station_scores?.courier||0}%`,
      s ? `  Gecikme oranı: %${Math.round((s.delay_rate||0)*100)}, İptal: %${Math.round((s.cancellation_rate||0)*100)}, Personel: ${s.active_staff}` : '',
    ].filter(Boolean).join('\n')
  }).filter(Boolean)

  const anomalyLines = (anomalies ?? []).slice(0, 6).map(a =>
    `- [${a.severity}] ${a.restaurant_id}: ${a.title} — ${a.description}`
  )

  const complaintLines = (complaints ?? []).slice(0, 10).map(c =>
    `- ${c.restaurant_id}: ${c.reason} (${c.lost_revenue} ₺ kayıp)`
  )

  const criticalStockLines = (stockLevels ?? []).slice(0, 8).map((s: any) =>
    `- ${s.restaurant_id}: ${s.products?.name} — ${s.quantity} adet kaldı`
  )

  const absents = (shifts ?? []).filter((s: any) => s.status === 'ABSENT')

  const context = `
Tarih/Saat: ${new Date().toLocaleString('tr-TR')}
Toplam restoran: ${restaurants?.length || 0}
Kritik: ${Object.values(pulseMap).filter((p:any)=>p.risk_level==='KRITIK').length}
Riskli: ${Object.values(pulseMap).filter((p:any)=>p.risk_level==='RISKLI').length}
Yoğun: ${Object.values(pulseMap).filter((p:any)=>p.risk_level==='YOGUN').length}
Açık şikayet: ${complaints?.length || 0}
Kritik stok: ${stockLevels?.length || 0} ürün
Gelmemiş personel: ${absents.length}

## RESTORAN DURUMLARI
${restLines.join('\n\n')}

## ONAYLANMAMIŞ ANOMALİLER
${anomalyLines.length ? anomalyLines.join('\n') : 'Yok'}

## AÇIK ŞİKAYETLER (son 10)
${complaintLines.length ? complaintLines.join('\n') : 'Yok'}

## KRİTİK STOK
${criticalStockLines.length ? criticalStockLines.join('\n') : 'Yok'}
  `.trim()

  // ── 3. GPT-4o'ya gönder ─────────────────────────────────────────
  const systemPrompt = `Sen Mutfak Nabzı AI Karar Motorusun. TAB Gıda (Burger King & Popeyes) restoran ağının operasyon analistisisin.

Görevin:
1. Verilen canlı operasyon verisini analiz et
2. En kritik sorunları tespit et (nabız skoru, anomaliler, şikayetler, stok)
3. Her kritik restoran için somut, uygulanabilir aksiyonlar belirle
4. Net bir yönetici raporu yaz

Yanıtını MUTLAKA aşağıdaki JSON formatında ver, başka hiçbir şey yazma:

{
  "summary": "1-2 cümle genel durum özeti",
  "overall_risk": "KRITIK|RISKLI|NORMAL",
  "critical_count": 2,
  "key_findings": [
    "Tespit 1",
    "Tespit 2"
  ],
  "recommendations": [
    {
      "restaurant_id": "r6",
      "restaurant_name": "Popeyes Taksim",
      "priority": "HIGH|MEDIUM|LOW",
      "issue": "Sorunun kısa tanımı",
      "actions": [
        {
          "text": "Yapılacak aksiyon (somut, uygulanabilir)",
          "expected_impact": "Beklenen etki",
          "time_to_impact": "5 dk"
        }
      ]
    }
  ],
  "auto_actions_taken": [
    "Otomatik olarak alınan aksiyon 1"
  ],
  "report_text": "Yönetici için tam rapor metni (Türkçe, profesyonel, 3-5 paragraf)"
}`

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 2000,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context },
      ],
    }),
  })

  if (!openaiRes.ok) {
    const err = await openaiRes.text()
    return NextResponse.json({ error: `OpenAI hatası: ${openaiRes.status} — ${err.slice(0, 200)}` }, { status: 500 })
  }

  const openaiData = await openaiRes.json()
  const rawContent = openaiData.choices[0].message.content

  let analysis: any
  try { analysis = JSON.parse(rawContent) }
  catch { return NextResponse.json({ error: 'AI yanıtı parse edilemedi', raw: rawContent }, { status: 500 }) }

  if (dry_run) {
    return NextResponse.json({ analysis, context_sent: context, dry_run: true })
  }

  // ── 4. Aksiyonları Supabase'e kaydet ───────────────────────────
  const savedRecs: any[] = []

  for (const rec of (analysis.recommendations ?? [])) {
    // ai_recommendations'a ekle
    const { data: newRec } = await sb().from('ai_recommendations').insert({
      restaurant_id: rec.restaurant_id,
      summary: rec.issue,
      risk_explanation: `Öncelik: ${rec.priority}`,
      forecast_note: `AI Karar Motoru — ${new Date().toLocaleTimeString('tr-TR')}`,
    }).select().single()

    if (newRec) {
      // Aksiyonları recommendation_actions'a ekle
      for (const action of (rec.actions ?? [])) {
        await sb().from('recommendation_actions').insert({
          recommendation_id: newRec.id,
          action_text: action.text,
          priority: rec.priority,
          expected_improvement: action.expected_impact,
          time_to_impact: action.time_to_impact,
          applied: false,
        })
      }
      savedRecs.push(newRec)
    }
  }

  // ── 5. Anomalileri otomatik onayla (CRITICAL olmayanları) ───────
  const autoAcked: string[] = []
  for (const anomaly of (anomalies ?? [])) {
    if (anomaly.severity !== 'CRITICAL') {
      await sb().from('anomalies')
        .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq('id', anomaly.id)
      autoAcked.push(anomaly.id)
    }
  }

  // ── 6. Audit log ─────────────────────────────────────────────────
  await sb().from('audit_logs').insert({
    user_role: 'AI Karar Motoru',
    action: 'AUTO_ANALYZE',
    resource: 'system',
    details: {
      overall_risk: analysis.overall_risk,
      critical_count: analysis.critical_count,
      recommendations_saved: savedRecs.length,
      anomalies_auto_acked: autoAcked.length,
      key_findings_count: (analysis.key_findings ?? []).length,
    },
  })

  // ── 7. n8n webhook dispatch (HIGH priority varsa) ───────────────
  let n8nResult: any = null
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  const highPriority = (analysis.recommendations ?? []).filter((r: any) => r.priority === 'HIGH')

  if (webhookUrl && highPriority.length > 0) {
    // pulse ve snapshot map'lerini yeniden oluştur
    const pulseMap2: Record<string, any> = {}
    const seen3 = new Set<string>()
    for (const p of (pulseScores ?? [])) {
      if (!seen3.has(p.restaurant_id)) { seen3.add(p.restaurant_id); pulseMap2[p.restaurant_id] = p }
    }
    const snapMap2: Record<string, any> = {}
    const seen4 = new Set<string>()
    for (const s of (snapshots ?? [])) {
      if (!seen4.has(s.restaurant_id)) { seen4.add(s.restaurant_id); snapMap2[s.restaurant_id] = s }
    }
    const restMap2: Record<string, any> = {}
    for (const r of (restaurants ?? [])) { restMap2[r.id] = r }

    try {
      const dispatchRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://atasunum.vercel.app'}/api/webhook/n8n-dispatch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recommendations: highPriority,
            pulse_map: pulseMap2,
            snap_map: snapMap2,
            restaurant_map: restMap2,
          }),
        }
      )
      n8nResult = await dispatchRes.json()
    } catch (err) {
      n8nResult = { error: String(err) }
    }
  }

  return NextResponse.json({
    ok: true,
    analysis,
    saved_recommendations: savedRecs.length,
    auto_acked_anomalies: autoAcked.length,
    n8n_dispatch: n8nResult ?? (webhookUrl ? 'no_high_priority' : 'webhook_url_not_set'),
    timestamp: new Date().toISOString(),
  })
}

// GET — son analizi getir
export async function GET() {
  const { data } = await sb().from('audit_logs')
    .select('*')
    .eq('action', 'AUTO_ANALYZE')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return NextResponse.json({ last_run: data })
}
