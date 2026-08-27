-- ============================================================
-- Mutfak Nabzı — Supabase Initial Migration
-- ============================================================

-- Enums
CREATE TYPE risk_level AS ENUM ('NORMAL', 'YOGUN', 'RISKLI', 'KRITIK');
CREATE TYPE order_source AS ENUM ('TIKLAGELSIN', 'RESTAURANT');
CREATE TYPE fulfillment_type AS ENUM ('DELIVERY', 'PICKUP', 'DINE_IN', 'TAKEAWAY');
CREATE TYPE order_event_type AS ENUM (
  'ORDER_CREATED','KDS_RECEIVED','PREPARATION_STARTED','PREPARATION_COMPLETED',
  'PACKING_STARTED','READY','COURIER_ARRIVED','PICKED_UP','COMPLETED','CANCELLED'
);
CREATE TYPE user_role AS ENUM ('RESTAURANT_MANAGER','REGIONAL_MANAGER','HQ','ADMIN');

-- Restaurants
CREATE TABLE restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  address TEXT,
  region TEXT,
  capacity INT DEFAULT 80,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  order_source order_source NOT NULL,
  fulfillment_type fulfillment_type NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  total_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- Order Events
CREATE TABLE order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  event_type order_event_type NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_events_order ON order_events(order_id);
CREATE INDEX idx_events_restaurant ON order_events(restaurant_id, timestamp DESC);

-- Pulse Scores
CREATE TABLE pulse_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  risk_level risk_level NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  open_orders INT DEFAULT 0,
  avg_prep_time DECIMAL(6,2),
  avg_packing_time DECIMAL(6,2),
  courier_wait DECIMAL(6,2),
  station_scores JSONB DEFAULT '{}',
  top_signals TEXT[] DEFAULT '{}',
  component_scores JSONB DEFAULT '{}'
);
CREATE INDEX idx_pulse_restaurant ON pulse_scores(restaurant_id, computed_at DESC);

-- Operation Snapshots
CREATE TABLE operation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  open_orders INT DEFAULT 0,
  orders_last_5m INT DEFAULT 0,
  orders_last_15m INT DEFAULT 0,
  orders_last_30m INT DEFAULT 0,
  tiklagelsin_delivery_orders INT DEFAULT 0,
  tiklagelsin_pickup_orders INT DEFAULT 0,
  restaurant_orders INT DEFAULT 0,
  avg_preparation_time DECIMAL(6,2),
  avg_packing_time DECIMAL(6,2),
  avg_courier_wait DECIMAL(6,2),
  active_staff INT DEFAULT 0,
  grill_staff INT DEFAULT 0,
  fryer_staff INT DEFAULT 0,
  packing_staff INT DEFAULT 0,
  grill_load INT DEFAULT 0,
  fryer_load INT DEFAULT 0,
  packing_load INT DEFAULT 0,
  courier_load INT DEFAULT 0,
  temperature DECIMAL(4,1),
  weather_condition TEXT,
  rain_intensity INT DEFAULT 0,
  campaign_active BOOLEAN DEFAULT false,
  holiday BOOLEAN DEFAULT false,
  special_event BOOLEAN DEFAULT false,
  inventory_risk INT DEFAULT 0,
  delay_rate DECIMAL(5,4) DEFAULT 0,
  cancellation_rate DECIMAL(5,4) DEFAULT 0
);
CREATE INDEX idx_snapshots_restaurant ON operation_snapshots(restaurant_id, timestamp DESC);

-- AI Recommendations
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  pulse_score_id UUID REFERENCES pulse_scores(id),
  summary TEXT NOT NULL,
  risk_explanation TEXT,
  actions JSONB DEFAULT '[]',
  forecast_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_recs_restaurant ON ai_recommendations(restaurant_id, created_at DESC);

-- Recommendation Actions (KPI tracking)
CREATE TABLE recommendation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES ai_recommendations(id),
  action_text TEXT NOT NULL,
  priority TEXT DEFAULT 'MEDIUM',
  station TEXT,
  expected_improvement TEXT,
  time_to_impact TEXT,
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KPI Results
CREATE TABLE kpi_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_action_id UUID REFERENCES recommendation_actions(id),
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  metric TEXT NOT NULL,
  predicted_value DECIMAL(10,2),
  actual_value DECIMAL(10,2),
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

-- Service role full access (n8n, API routes)
CREATE POLICY "Service role full access" ON restaurants FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON pulse_scores FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON operation_snapshots FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON ai_recommendations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON order_events FOR ALL USING (auth.role() = 'service_role');

-- Authenticated read (dashboard kullanıcıları)
CREATE POLICY "Authenticated read" ON restaurants FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read" ON pulse_scores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read" ON ai_recommendations FOR SELECT USING (auth.role() = 'authenticated');
