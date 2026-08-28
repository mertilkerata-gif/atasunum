import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/auth'

interface WhatsAppAlertPayload {
  restaurant_name: string
  restaurant_id: string
  pulse_score: number
  risk_level: string
  top_signal: string
  manager_phone?: string
}

function buildMessage(p: WhatsAppAlertPayload): string {
  const e = p.risk_level === 'KRITIK' ? '🔴' : '🟠'
  return `${e} *MUTFAK NABZI UYARISI*\n\n*${p.restaurant_name}*\nNabız: *${p.pulse_score}/100 — ${p.risk_level}*\n\n⚡ ${p.top_signal}\n\nReçete için uygulamayı açın.\n_${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}_`
}

export async function POST(req: NextRequest) {
  let body: WhatsAppAlertPayload
  try { body = await req.json() } catch { return errorResponse('Geçersiz JSON') }
  const message = buildMessage(body)
  const waToken = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const toNumber = body.manager_phone ?? process.env.WHATSAPP_DEFAULT_NUMBER
  if (!waToken || !phoneNumberId || !toNumber) {
    return successResponse({ sent: false, demo: true, message_preview: message })
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${waToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: toNumber, type: 'text', text: { body: message } }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(JSON.stringify(data))
    return successResponse({ sent: true, message_preview: message })
  } catch (err) { return errorResponse('WhatsApp gönderilemedi: ' + String(err)) }
}

export async function GET() {
  return successResponse({ endpoint: 'POST /api/webhook/whatsapp-alert', demo_mode: !process.env.WHATSAPP_TOKEN })
}
