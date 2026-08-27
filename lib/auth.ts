/**
 * Webhook ve API güvenlik yardımcıları
 */

import { NextRequest, NextResponse } from 'next/server'

// n8n webhook secret doğrulaması
export function verifyWebhookSecret(req: NextRequest): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) return true // demo modda bypass
  const incoming = req.headers.get('x-webhook-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  return incoming === secret
}

// API key doğrulaması (harici sistemler için)
export function verifyAPIKey(req: NextRequest): boolean {
  const apiKey = process.env.MUTFAK_NABZI_API_KEY
  if (!apiKey) return true // demo modda bypass
  const incoming = req.headers.get('x-api-key') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  return incoming === apiKey
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function validationErrorResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() }, { status })
}

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message, timestamp: new Date().toISOString() }, { status })
}
