import { createClient, SupabaseClient } from '@supabase/supabase-js'

const URL  = 'https://exkhzmpowcoxdzzvzisv.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4a2h6bXBvd2NveGR6enZ6aXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Mzg5OTUsImV4cCI6MjEwMzQxNDk5NX0.bysVio77j6ncmzYjt3T2saDPCmV3NnqbOyWFS987YIQ'
let _sb: SupabaseClient | null = null
export const getSupabase = () => { if (!_sb) _sb = createClient(URL, ANON); return _sb }

const sb = () => getSupabase()
const rows = async (p: Promise<{data:any,error:any}>) => { const {data,error} = await p; if(error) throw error; return data ?? [] }
const row  = async (p: Promise<{data:any,error:any}>) => { const {data,error} = await p; if(error) throw error; return data }

// Restaurants
export const fetchRestaurants = () => rows(sb().from('restaurants').select('*').eq('is_active',true).order('name') as any)

// Pulse Scores
export async function fetchAllPulseScores() {
  const data = await rows(sb().from('pulse_scores').select('*').order('computed_at',{ascending:false}).limit(200) as any)
  const seen = new Set<string>(); const latest: any[] = []
  for (const r of data) { if(!seen.has(r.restaurant_id)){seen.add(r.restaurant_id);latest.push(r)} }
  return latest
}
export const fetchPulseScore = (id:string) => row(sb().from('pulse_scores').select('*').eq('restaurant_id',id).order('computed_at',{ascending:false}).limit(1).single() as any)

// Snapshots
export async function fetchLatestSnapshots() {
  const data = await rows(sb().from('operation_snapshots').select('*').order('timestamp',{ascending:false}).limit(200) as any)
  const seen = new Set<string>(); const latest: any[] = []
  for (const r of data) { if(!seen.has(r.restaurant_id)){seen.add(r.restaurant_id);latest.push(r)} }
  return latest
}
export const fetchSnapshot = (id:string) => row(sb().from('operation_snapshots').select('*').eq('restaurant_id',id).order('timestamp',{ascending:false}).limit(1).single() as any)

// Orders
export async function fetchActiveOrders(restaurantId?:string) {
  let q = sb().from('orders').select('*').eq('status','ACTIVE').order('created_at',{ascending:false}).limit(200)
  if(restaurantId) q = q.eq('restaurant_id',restaurantId) as any
  return rows(q as any)
}
export async function fetchRecentOrders(restaurantId?:string, limit=50) {
  let q = sb().from('orders').select('*').order('created_at',{ascending:false}).limit(limit)
  if(restaurantId) q = q.eq('restaurant_id',restaurantId) as any
  return rows(q as any)
}
export const insertOrder = (o:any) => row(sb().from('orders').insert(o).select().single() as any)

// Recommendations
export async function fetchRecommendations(restaurantId?:string) {
  let q = sb().from('ai_recommendations').select('*,recommendation_actions(*)').order('created_at',{ascending:false}).limit(20)
  if(restaurantId) q = q.eq('restaurant_id',restaurantId) as any
  return rows(q as any)
}
export const applyRecommendationAction = (id:string) => row(sb().from('recommendation_actions').update({applied:true,applied_at:new Date().toISOString()}).eq('id',id).select().single() as any)

// Anomalies
export const fetchAnomalies = () => rows(sb().from('anomalies').select('*').order('detected_at',{ascending:false}).limit(50) as any)
export const acknowledgeAnomaly = (id:string) => row(sb().from('anomalies').update({acknowledged:true,acknowledged_at:new Date().toISOString()}).eq('id',id).select().single() as any)

// Products & Stock
export const fetchProducts = () => rows(sb().from('products').select('*').eq('is_active',true).order('category').order('name') as any)
export async function fetchStockLevels(restaurantId?:string) {
  let q = sb().from('stock_levels').select('*,products(*)').order('quantity',{ascending:true})
  if(restaurantId) q = q.eq('restaurant_id',restaurantId) as any
  return rows(q as any)
}
export const updateStockLevel = (id:string, qty:number) => row(sb().from('stock_levels').update({quantity:qty,updated_at:new Date().toISOString()}).eq('id',id).select().single() as any)

// Revenue
export async function fetchDailyRevenue(restaurantId?:string, days=7) {
  const since = new Date(Date.now()-days*86400000).toISOString().split('T')[0]
  let q = sb().from('daily_revenue').select('*').gte('date',since).order('date',{ascending:false})
  if(restaurantId) q = q.eq('restaurant_id',restaurantId) as any
  return rows(q as any)
}

// Complaints
export async function fetchComplaints(restaurantId?:string) {
  let q = sb().from('complaints').select('*').order('created_at',{ascending:false}).limit(200)
  if(restaurantId) q = q.eq('restaurant_id',restaurantId) as any
  return rows(q as any)
}
export const resolveComplaint = (id:string) => row(sb().from('complaints').update({status:'RESOLVED',resolved_at:new Date().toISOString()}).eq('id',id).select().single() as any)

// Shifts
export async function fetchShifts(restaurantId?:string, date?:string) {
  const d = date ?? new Date().toISOString().split('T')[0]
  let q = sb().from('shifts').select('*').gte('shift_start',d+'T00:00:00').lte('shift_start',d+'T23:59:59').order('shift_start')
  if(restaurantId) q = q.eq('restaurant_id',restaurantId) as any
  return rows(q as any)
}
export const updateShiftStatus = (id:string, status:string) => row(sb().from('shifts').update({status}).eq('id',id).select().single() as any)
export const insertShift = (shift:any) => row(sb().from('shifts').insert(shift).select().single() as any)

// Forecasts
export async function fetchForecasts(restaurantId?:string, date?:string) {
  const d = date ?? new Date().toISOString().split('T')[0]
  let q = sb().from('forecasts').select('*').eq('forecast_date',d).order('hour')
  if(restaurantId) q = q.eq('restaurant_id',restaurantId) as any
  return rows(q as any)
}

// Audit
export const fetchAuditLogs = (limit=100) => rows(sb().from('audit_logs').select('*').order('created_at',{ascending:false}).limit(limit) as any)
export async function insertAuditLog(entry:{user_role?:string;action:string;resource?:string;details?:Record<string,unknown>}) {
  let user: any = {}
  if(typeof window!=='undefined') { try { user=JSON.parse(localStorage.getItem('mn_user')||'{}') } catch {} }
  await sb().from('audit_logs').insert({...entry,user_role:user.role??entry.user_role??'system'})
}

// Webhook
export const fetchWebhookEvents = (limit=50) => rows(sb().from('webhook_events').select('*').order('created_at',{ascending:false}).limit(limit) as any)
export const insertWebhookEvent = (event:any) => row(sb().from('webhook_events').insert({...event,processed_at:new Date().toISOString()}).select().single() as any)

// KPI
export async function fetchKpiResults(restaurantId?:string) {
  let q = sb().from('kpi_results').select('*').order('measured_at',{ascending:false}).limit(100)
  if(restaurantId) q = q.eq('restaurant_id',restaurantId) as any
  return rows(q as any)
}

// Realtime
export const subscribeToPulseScores = (cb:()=>void) => sb().channel('pulse_rt').on('postgres_changes',{event:'*',schema:'public',table:'pulse_scores'},cb).subscribe()
export const subscribeToOrders = (cb:()=>void) => sb().channel('orders_rt').on('postgres_changes',{event:'*',schema:'public',table:'orders'},cb).subscribe()
export const subscribeToAnomalies = (cb:()=>void) => sb().channel('anomalies_rt').on('postgres_changes',{event:'*',schema:'public',table:'anomalies'},cb).subscribe()
