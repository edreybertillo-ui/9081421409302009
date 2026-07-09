/*
# Water Distribution Monitoring System - Schema

1. Purpose
- Real-time monitoring of water distribution network across a multi-floor building.
- Tracks sensors, pressure readings, tank levels, alerts, and audit logs.
- Multi-user with RBAC (Administrator, Maintenance Staff, Viewer).

2. New Tables
- `sensors` — IoT sensor registry (id, type, floor, battery, network status, health, last comm)
- `pressure_readings` — time-series pressure data per sensor
- `tank_readings` — time-series tank level data per sensor
- `alerts` — system-generated alerts with severity and status
- `audit_logs` — login attempts and user actions
- `user_profiles` — extends auth.users with role and institution info
- `system_settings` — configurable thresholds and preferences (singleton-style)

3. Security
- RLS enabled on all tables.
- All tables scoped to authenticated users (sign-in required app).
- user_profiles uses auth.uid() ownership.
- sensors/readings/alerts are readable by all authenticated personnel (shared operational data).
- audit_logs and user_profiles management restricted by role check.
*/

-- User profiles extending auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('administrator', 'maintenance_staff', 'viewer')),
  department text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON user_profiles;
CREATE POLICY "select_own_profile" ON user_profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
CREATE POLICY "update_own_profile" ON user_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admins can read all profiles
DROP POLICY IF EXISTS "admin_select_all_profiles" ON user_profiles;
CREATE POLICY "admin_select_all_profiles" ON user_profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = auth.uid() AND p.role = 'administrator')
  );

-- Admins can update all profiles (role assignment, disable accounts)
DROP POLICY IF EXISTS "admin_update_all_profiles" ON user_profiles;
CREATE POLICY "admin_update_all_profiles" ON user_profiles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = auth.uid() AND p.role = 'administrator')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = auth.uid() AND p.role = 'administrator')
  );

-- Sensors table
CREATE TABLE IF NOT EXISTS sensors (
  id text PRIMARY KEY,
  sensor_type text NOT NULL CHECK (sensor_type IN ('pressure', 'tank_level', 'flow', 'temperature')),
  floor text NOT NULL,
  location text,
  battery_status text NOT NULL DEFAULT 'good' CHECK (battery_status IN ('good', 'low', 'critical')),
  battery_level integer NOT NULL DEFAULT 100,
  network_status text NOT NULL DEFAULT 'online' CHECK (network_status IN ('online', 'offline', 'degraded')),
  health_status text NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'warning', 'critical')),
  current_reading numeric,
  last_communication timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_sensors" ON sensors;
CREATE POLICY "auth_select_sensors" ON sensors FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_sensors" ON sensors;
CREATE POLICY "auth_insert_sensors" ON sensors FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_sensors" ON sensors;
CREATE POLICY "auth_update_sensors" ON sensors FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Pressure readings (time-series)
CREATE TABLE IF NOT EXISTS pressure_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id text NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  floor text NOT NULL,
  pressure_value numeric NOT NULL,
  status text NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'high', 'low', 'critical')),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pressure_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_pressure" ON pressure_readings;
CREATE POLICY "auth_select_pressure" ON pressure_readings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_pressure" ON pressure_readings;
CREATE POLICY "auth_insert_pressure" ON pressure_readings FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pressure_sensor_time ON pressure_readings(sensor_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pressure_recorded_at ON pressure_readings(recorded_at DESC);

-- Tank readings (time-series)
CREATE TABLE IF NOT EXISTS tank_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id text NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  floor text NOT NULL,
  level_percentage numeric NOT NULL CHECK (level_percentage >= 0 AND level_percentage <= 100),
  capacity_liters numeric NOT NULL,
  remaining_liters numeric NOT NULL,
  status text NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'low', 'critical', 'full')),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tank_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_tank" ON tank_readings;
CREATE POLICY "auth_select_tank" ON tank_readings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_tank" ON tank_readings;
CREATE POLICY "auth_insert_tank" ON tank_readings FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tank_sensor_time ON tank_readings(sensor_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_tank_recorded_at ON tank_readings(recorded_at DESC);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  alert_type text NOT NULL CHECK (alert_type IN ('low_pressure', 'high_pressure', 'tank_critical', 'sensor_disconnect', 'communication_failure', 'battery_low', 'system')),
  sensor_id text REFERENCES sensors(id) ON DELETE SET NULL,
  floor text,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'acknowledged')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id)
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_alerts" ON alerts;
CREATE POLICY "auth_select_alerts" ON alerts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_alerts" ON alerts;
CREATE POLICY "auth_insert_alerts" ON alerts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_alerts" ON alerts;
CREATE POLICY "auth_update_alerts" ON alerts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('login', 'logout', 'login_failed', 'role_change', 'user_disabled', 'user_enabled', 'settings_change', 'alert_resolved', 'export')),
  ip_address text,
  user_agent text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_audit_logs" ON audit_logs;
CREATE POLICY "auth_select_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_audit_logs" ON audit_logs;
CREATE POLICY "auth_insert_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);

-- System settings (singleton row)
CREATE TABLE IF NOT EXISTS system_settings (
  id integer PRIMARY KEY DEFAULT 1,
  pressure_min numeric NOT NULL DEFAULT 2.0,
  pressure_max numeric NOT NULL DEFAULT 5.0,
  pressure_critical_low numeric NOT NULL DEFAULT 1.0,
  pressure_critical_high numeric NOT NULL DEFAULT 7.0,
  tank_critical_level numeric NOT NULL DEFAULT 15.0,
  tank_low_level numeric NOT NULL DEFAULT 30.0,
  auto_refresh_interval integer NOT NULL DEFAULT 5,
  institution_name text NOT NULL DEFAULT 'Institution Water Authority',
  emergency_mode boolean NOT NULL DEFAULT false,
  quota_usage_percent numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_settings" ON system_settings;
CREATE POLICY "auth_select_settings" ON system_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_settings" ON system_settings;
CREATE POLICY "admin_update_settings" ON system_settings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = auth.uid() AND p.role = 'administrator')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = auth.uid() AND p.role = 'administrator')
  );

-- Insert default settings row
INSERT INTO system_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
