/**
 * Browser-side Supabase client
 * Tüm client component'lardan direkt Supabase'e bağlanır
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const URL  = 'https://exkhzmpowcoxdzzvzisv.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4a2h6bXBvd2NveGR6enZ6aXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Mzg5OTUsImV4cCI6MjEwMzQxNDk5NX0.bysVio77j6ncmzYjt3T2saDPCmV3NnqbOyWFS987YIQ'

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) _client = createClient(URL, ANON)
  return _client
}

// ─── Pulse Scores ───────────────────────────────────────────
export async function fetchAllPulseScores() {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('pulse_scores')
    .select('*')
    .order('computed_at', { ascending: false })
    .limit(100)
  if (error) throw error
  // Her restoran için en son skoru al
  const seen = new Set<string>()
  const latest: typeof data = []
  for (const row of (data ?? [])) {
    if (!seen.has(row.restaurant_id)) { seen.add(row.restaurant_id); latest.push(row) }
  }
  return latest
}

export async function fetchPulseScore(restaurantId: string) {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('pulse_scores')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .single()
  if (error) return null
  return data
}

// ─── Restaurants ─────────────────────────────────────────────
export async function fetchRestaurants() {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('restaurants')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data ?? []
}

// ─── Operation Snapshots ─────────────────────────────────────
export async function fetchLatestSnapshots() {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('operation_snapshots')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100)
  if (error) throw error
  const seen = new Set<string>()
  const latest: typeof data = []
  for (const row of (data ?? [])) {
    if (!seen.has(row.restaurant_id)) { seen.add(row.restaurant_id); latest.push(row) }
  }
  return latest
}

export async function fetchSnapshot(restaurantId: string) {
  const sb = getSupabase()
  const { data } = await sb
    .from('operation_snapshots')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single()
  return data
}

// ─── Orders ──────────────────────────────────────────────────
export async function fetchActiveOrders(restaurantId?: string) {
  const sb = getSupabase()
  let q = sb.from('orders').select('*').eq('status', 'ACTIVE').order('created_at', { ascending: false })
  if (restaurantId) q = q.eq('restaurant_id', restaurantId)
  const { data, error } = await q.limit(200)
  if (error) throw error
  return data ?? []
}

export async function fetchRecentOrders(restaurantId?: string, limit = 50) {
  const sb = getSupabase()
  let q = sb.from('orders').select('*').order('created_at', { ascending: false }).limit(limit)
  if (restaurantId) q = q.eq('restaurant_id', restaurantId)
  const { data } = await q
  return data ?? []
}

// ─── AI Recommendations ──────────────────────────────────────
export async function fetchRecommendations(restaurantId?: string) {
  const sb = getSupabase()
  let q = sb
    .from('ai_recommendations')
    .select('*, recommendation_actions(*)')
    .order('created_at', { ascending: false })
    .limit(20)
  if (restaurantId) q = q.eq('restaurant_id', restaurantId)
  const { data, error } = await q
  if (error) return []
  return data ?? []
}

// ─── KPI Results ─────────────────────────────────────────────
export async function fetchKpiResults(restaurantId?: string) {
  const sb = getSupabase()
  let q = sb.from('kpi_results').select('*').order('measured_at', { ascending: false }).limit(100)
  if (restaurantId) q = q.eq('restaurant_id', restaurantId)
  const { data } = await q
  return data ?? []
}

// ─── Realtime subscription ────────────────────────────────────
export function subscribeToPulseScores(cb: (payload: unknown) => void) {
  const sb = getSupabase()
  return sb
    .channel('pulse_scores_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pulse_scores' }, cb)
    .subscribe()
}

export function subscribeToOrders(cb: (payload: unknown) => void) {
  const sb = getSupabase()
  return sb
    .channel('orders_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, cb)
    .subscribe()
}
