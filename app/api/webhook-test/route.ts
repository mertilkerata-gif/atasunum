import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { url, payload } = await req.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL gerekli' }, { status: 400 })
    }

    // URL güvenlik kontrolü
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Geçersiz protokol' }, { status: 400 })
    }

    const start = Date.now()

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MutfakNabzi-WebhookTest/1.0',
        'X-Webhook-Source': 'mutfak-nabzi',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10 sn timeout
    })

    const latency = Date.now() - start
    let body = ''
    try { body = await res.text() } catch {}

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      latency,
      body: body.slice(0, 1000),
      headers: Object.fromEntries(res.headers.entries()),
    })
  } catch (err: any) {
    const msg = err?.name === 'TimeoutError'
      ? 'İstek zaman aşımına uğradı (10sn)'
      : err?.message ?? 'Bağlantı hatası'
    return NextResponse.json({ ok: false, status: 0, statusText: msg, latency: 0, body: msg }, { status: 200 })
  }
}
