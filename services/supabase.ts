/**
 * Supabase Service
 * Server-side only — tüm env değişkenleri NEXT_PUBLIC_ prefix'siz
 * Vercel Dashboard > Settings > Environment Variables'dan ekle:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { PulseScore, OperationSnapshot } from '@/types'
import { getPulseScore, getSnapshot } from '@/data/seed/mock-data'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const isDemoMode = !SUPABASE_URL || SUPABASE_URL === 'your_supabase_project_url' || !SUPABASE_KEY

// Lazy-load Supabase client (sadece prod'da bağlanır)
async function getClient() {
  if (isDemoMode) return null
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(SUPABASE_URL!, SUPABASE_KEY!)
}

export async function savePulseScore(pulse: Omit<PulseScore, 'id'>): Promise<void> {
  const client = await getClient()
  if (!client) { console.log('[DEMO] savePulseScore:', pulse.restaurant_id, pulse.score); return }
  await client.from('pulse_scores').insert(pulse)
}

export async function saveSnapshot(snapshot: Omit<OperationSnapshot, 'id'>): Promise<void> {
  const client = await getClient()
  if (!client) { console.log('[DEMO] saveSnapshot:', snapshot.restaurant_id); return }
  await client.from('operation_snapshots').insert(snapshot)
}

export async function getPulseScoreDB(restaurantId: string): Promise<PulseScore> {
  const client = await getClient()
  if (!client) return getPulseScore(restaurantId)
  const { data } = await client
    .from('pulse_scores')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .single()
  return data ?? getPulseScore(restaurantId)
}

export async function getAllPulseScores(): Promise<PulseScore[]> {
  const client = await getClient()
  if (!client) {
    const { RESTAURANTS } = await import('@/data/seed/restaurants')
    return RESTAURANTS.map(r => getPulseScore(r.id))
  }
  const { data } = await client
    .from('pulse_scores')
    .select('*')
    .order('computed_at', { ascending: false })
    .limit(100)
  const seen = new Set<string>()
  const latest: PulseScore[] = []
  for (const row of (data ?? [])) {
    if (!seen.has(row.restaurant_id)) { seen.add(row.restaurant_id); latest.push(row) }
  }
  return latest
}

export async function saveOrderEvent(event: {
  order_id: string
  restaurant_id: string
  event_type: string
  timestamp: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const client = await getClient()
  if (!client) { console.log('[DEMO] saveOrderEvent:', event.event_type, event.order_id); return }
  await client.from('order_events').insert(event)
}

export async function saveRecommendation(rec: {
  restaurant_id: string
  pulse_score_id: string
  summary: string
  risk_explanation: string
  actions: unknown[]
  forecast_note?: string
}): Promise<string> {
  const client = await getClient()
  if (!client) { console.log('[DEMO] saveRecommendation:', rec.restaurant_id); return 'demo-rec-id' }
  const { data } = await client.from('ai_recommendations').insert(rec).select('id').single()
  return data?.id ?? 'unknown'
}

export async function updateActionStatus(actionId: string, applied: boolean): Promise<void> {
  const client = await getClient()
  if (!client) { console.log('[DEMO] updateAction:', actionId, applied); return }
  await client.from('recommendation_actions').update({
    applied,
    applied_at: applied ? new Date().toISOString() : null,
  }).eq('id', actionId)
}

export { isDemoMode }
