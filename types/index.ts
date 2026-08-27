// Enums
export type OrderSource = 'TIKLAGELSIN' | 'RESTAURANT'
export type FulfillmentType = 'DELIVERY' | 'PICKUP' | 'DINE_IN' | 'TAKEAWAY'
export type OrderStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DELAYED'
export type RiskLevel = 'NORMAL' | 'YOGUN' | 'RISKLI' | 'KRITIK'
export type UserRole = 'RESTAURANT_MANAGER' | 'REGIONAL_MANAGER' | 'HQ' | 'ADMIN'

export type OrderEventType =
  | 'ORDER_CREATED'
  | 'KDS_RECEIVED'
  | 'PREPARATION_STARTED'
  | 'PREPARATION_COMPLETED'
  | 'PACKING_STARTED'
  | 'READY'
  | 'COURIER_ARRIVED'
  | 'PICKED_UP'
  | 'COMPLETED'
  | 'CANCELLED'

// Core entities
export interface Restaurant {
  id: string
  name: string
  brand: 'BURGER_KING' | 'POPEYES'
  city: string
  district: string
  address: string
  region: string
  capacity: number
  lat: number
  lng: number
  is_active: boolean
}

export interface Order {
  id: string
  restaurant_id: string
  order_source: OrderSource
  fulfillment_type: FulfillmentType
  status: OrderStatus
  product_category?: string
  total_amount?: number
  created_at: string
  completed_at?: string
  cancelled_at?: string
}

export interface OrderEvent {
  id: string
  order_id: string
  event_type: OrderEventType
  timestamp: string
  note?: string
}

export interface StationSnapshot {
  grill: number
  fryer: number
  packing: number
  courier: number
}

export interface OperationSnapshot {
  id: string
  restaurant_id: string
  timestamp: string
  open_orders: number
  orders_last_5m: number
  orders_last_15m: number
  orders_last_30m: number
  tiklagelsin_delivery_orders: number
  tiklagelsin_pickup_orders: number
  restaurant_orders: number
  avg_preparation_time: number
  avg_packing_time: number
  avg_courier_wait: number
  active_staff: number
  grill_staff: number
  fryer_staff: number
  packing_staff: number
  grill_load: number
  fryer_load: number
  packing_load: number
  courier_load: number
  temperature: number
  weather_condition: string
  rain_intensity: number
  campaign_active: boolean
  holiday: boolean
  special_event: boolean
  inventory_risk: number
  delay_rate: number
  cancellation_rate: number
}

export interface PulseScore {
  id: string
  restaurant_id: string
  score: number
  risk_level: RiskLevel
  computed_at: string
  open_orders: number
  avg_prep_time: number
  avg_packing_time: number
  courier_wait: number
  station_scores: StationSnapshot
  top_signals: string[]
}

export interface Prediction {
  id: string
  restaurant_id: string
  predicted_at: string
  horizon_minutes: 15 | 30 | 60
  predicted_orders: number
  predicted_pulse_score: number
  delay_probability: number
  cancellation_probability: number
  station_overload: StationSnapshot
  confidence_score: number
}

export interface AIRecommendation {
  id: string
  restaurant_id: string
  pulse_score_id: string
  created_at: string
  summary: string
  risk_explanation: string
  actions: RecommendationAction[]
}

export interface RecommendationAction {
  id: string
  recommendation_id: string
  action_text: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  station?: 'grill' | 'fryer' | 'packing' | 'courier'
  applied: boolean
  applied_at?: string
  expected_improvement?: string
}

export interface KPIResult {
  id: string
  recommendation_action_id: string
  metric: string
  predicted_value: number
  actual_value: number
  measured_at: string
}

export interface WeatherSnapshot {
  condition: string
  temperature: number
  rain_intensity: number
  icon: string
}

export interface SimilarDay {
  date: string
  similarity_score: number
  total_orders: number
  peak_hour: string
  peak_orders: number
}

export interface HourlyForecast {
  hour: string
  actual?: number
  predicted: number
  pulse_score?: number
}

// Dashboard composite types
export interface RestaurantDashboard {
  restaurant: Restaurant
  pulse: PulseScore
  snapshot: OperationSnapshot
  predictions: Prediction[]
  latest_recommendation?: AIRecommendation
  weather: WeatherSnapshot
  hourly_forecast: HourlyForecast[]
}

export interface HQSummary {
  total_restaurants: number
  by_risk: Record<RiskLevel, number>
  critical_soon: Restaurant[]
  restaurants: RestaurantDashboard[]
}
