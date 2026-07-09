/*
# Extended Settings Schema

Adds comprehensive configuration options:
1. Extended system_settings with tank config, display preferences, security settings
2. user_notification_settings for per-user notification preferences
*/

-- Extend system_settings with additional columns
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS tank_capacity_liters numeric NOT NULL DEFAULT 5000;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS tank_height_meters numeric NOT NULL DEFAULT 2.5;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS tank_min_level numeric NOT NULL DEFAULT 10;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS tank_max_level numeric NOT NULL DEFAULT 95;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS tank_warning_level numeric NOT NULL DEFAULT 30;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS measurement_unit text NOT NULL DEFAULT 'liters' CHECK (measurement_unit IN ('liters', 'cubic_meters', 'gallons'));
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS date_format text NOT NULL DEFAULT 'MM/DD/YYYY' CHECK (date_format IN ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'));
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS time_format text NOT NULL DEFAULT '12h' CHECK (time_format IN ('12h', '24h'));
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS default_dashboard_view text NOT NULL DEFAULT 'overview' CHECK (default_dashboard_view IN ('overview', 'detailed', 'compact'));
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS session_timeout_minutes integer NOT NULL DEFAULT 30;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS theme_color text NOT NULL DEFAULT 'primary' CHECK (theme_color IN ('primary', 'cyan', 'emerald', 'amber'));

-- User notification settings
CREATE TABLE IF NOT EXISTS user_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_alerts_enabled boolean NOT NULL DEFAULT true,
  sms_alerts_enabled boolean NOT NULL DEFAULT false,
  push_alerts_enabled boolean NOT NULL DEFAULT true,
  critical_alerts_only boolean NOT NULL DEFAULT false,
  notification_frequency text NOT NULL DEFAULT 'immediate' CHECK (notification_frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
  quiet_hours_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start text DEFAULT '22:00',
  quiet_hours_end text DEFAULT '07:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notification_settings" ON user_notification_settings;
CREATE POLICY "select_own_notification_settings" ON user_notification_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notification_settings" ON user_notification_settings;
CREATE POLICY "insert_own_notification_settings" ON user_notification_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notification_settings" ON user_notification_settings;
CREATE POLICY "update_own_notification_settings" ON user_notification_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Insert default notification settings for existing users (handled in app)

-- Sensor calibration settings
CREATE TABLE IF NOT EXISTS sensor_calibration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id text NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  calibration_date timestamptz NOT NULL DEFAULT now(),
  calibration_offset numeric DEFAULT 0,
  calibration_scale numeric DEFAULT 1,
  calibrated_by uuid REFERENCES auth.users(id),
  notes text,
  next_calibration_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sensor_calibration ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_calibration" ON sensor_calibration;
CREATE POLICY "auth_select_calibration" ON sensor_calibration FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_calibration" ON sensor_calibration;
CREATE POLICY "auth_insert_calibration" ON sensor_calibration FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_calibration" ON sensor_calibration;
CREATE POLICY "auth_update_calibration" ON sensor_calibration FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sensor_calibration_sensor ON sensor_calibration(sensor_id, calibration_date DESC);

-- Login activity tracking
CREATE TABLE IF NOT EXISTS login_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_time timestamptz NOT NULL DEFAULT now(),
  logout_time timestamptz,
  ip_address text,
  user_agent text,
  device_type text,
  location text,
  session_duration_seconds integer
);

ALTER TABLE login_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_login_activity" ON login_activity;
CREATE POLICY "select_own_login_activity" ON login_activity FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_login_activity" ON login_activity;
CREATE POLICY "insert_own_login_activity" ON login_activity FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_login_activity" ON login_activity;
CREATE POLICY "update_own_login_activity" ON login_activity FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

-- Admin can see all login activity
DROP POLICY IF EXISTS "admin_select_all_login_activity" ON login_activity;
CREATE POLICY "admin_select_all_login_activity" ON login_activity FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = auth.uid() AND p.role = 'administrator')
  );

CREATE INDEX IF NOT EXISTS idx_login_activity_user ON login_activity(user_id, login_time DESC);