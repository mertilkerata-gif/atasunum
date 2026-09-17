/**
 * POST /api/webhook/n8n-test
 * n8n webhook bağlantısını test eder — dummy payload gönderir
 */
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { n8n_url } = await req.json().catch(() => ({}))
  const webhookUrl = n8n_url || process.env.N8N_WEBHOOK_URL

  if (!webhookUrl) {
    return NextResponse.json({ ok: false, error: 'Webhook URL girilmedi' }, { status: 400 })
  }

  const testPayload = {
    alert_type: 'TEST',
    restaurant_id: 'r1',
    restaurant_name: 'Test Restoran — Burger King Levent',
    risk_level: 'KRITIK',
    pulse_score: 91,
    packing_yuzu: 35,
    open_orders: 28,
    avg_prep_time: 8.4,
    active_staff: 2,
    delay_rate: 45,
    priority: 'HIGH',
    issue: '🔴 TEST — Sistem bağlantı testi',
    actions: [
      { text: 'Bu bir test mesajıdır — n8n bağlantısı başarılı', expected_impact: 'Bağlantı doğrulandı', time_to_impact: 'Anında' }
    ],
    manager_phone: '905392993103',
    timestamp: new Date().toISOString(),
    dashboard_url: 'https://atasunum.vercel.app',
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    })
    const text = await res.text().catch(() => '')
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      response: text.slice(0, 200),
      payload_sent: testPayload,
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
