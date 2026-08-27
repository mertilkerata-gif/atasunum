/**
 * POST /api/recommendations/[id]/action
 * 
 * Müdür bir aksiyonu "Uyguladım / Uygulamadım" işaretlediğinde çağrılır.
 * KPI takibi için applied_at timestamp'i kaydedilir.
 */

import { NextRequest } from 'next/server'
import { verifyAPIKey, successResponse, unauthorizedResponse, errorResponse, validationErrorResponse } from '@/lib/auth'
import { updateActionStatus, isDemoMode } from '@/services/supabase'

interface ActionPayload {
  action_id: string
  applied: boolean
  note?: string
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAPIKey(req)) return unauthorizedResponse()

  let body: ActionPayload
  try { body = await req.json() } catch { return validationErrorResponse('Geçersiz JSON') }
  if (!body.action_id) return validationErrorResponse('action_id zorunlu')
  if (typeof body.applied !== 'boolean') return validationErrorResponse('applied boolean olmalı')

  try {
    const { id: recommendationId } = await params
    await updateActionStatus(body.action_id, body.applied)

    return successResponse({
      recommendation_id: recommendationId,
      action_id: body.action_id,
      applied: body.applied,
      applied_at: body.applied ? new Date().toISOString() : null,
      demo_mode: isDemoMode,
    })
  } catch (err) {
    console.error('Action update hatası:', err)
    return errorResponse('Aksiyon güncellenemedi')
  }
}
