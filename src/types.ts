export type UserRole = 'administrator' | 'maintenance_staff' | 'viewer';

export type SensorType = 'pressure' | 'tank_level' | 'flow' | 'temperature';
export type BatteryStatus = 'good' | 'low' | 'critical';
export type NetworkStatus = 'online' | 'offline' | 'degraded';
export type HealthStatus = 'healthy' | 'warning' | 'critical';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertType =
  | 'low_pressure'
  | 'high_pressure'
  | 'tank_critical'
  | 'sensor_disconnect'
  | 'communication_failure'
  | 'battery_low'
  | 'system';
export type AlertStatus = 'active' | 'resolved' | 'acknowledged';

export type EventType =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'role_change'
  | 'user_disabled'
  | 'user_enabled'
  | 'settings_change'
  | 'alert_resolved'
  | 'export';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface Sensor {
  id: string;
  sensor_type: SensorType;
  floor: string;
  location: string | null;
  battery_status: BatteryStatus;
  battery_level: number;
  network_status: NetworkStatus;
  health_status: HealthStatus;
  current_reading: number | null;
  last_communication: string;
  created_at: string;
}

export interface PressureReading {
  id: string;
  sensor_id: string;
  floor: string;
  pressure_value: number;
  status: 'normal' | 'high' | 'low' | 'critical';
  recorded_at: string;
}

export interface TankReading {
  id: string;
  sensor_id: string;
  floor: string;
  level_percentage: number;
  capacity_liters: number;
  remaining_liters: number;
  status: 'normal' | 'low' | 'critical' | 'full';
  recorded_at: string;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  alert_type: AlertType;
  sensor_id: string | null;
  floor: string | null;
  description: string;
  status: AlertStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  event_type: EventType;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface SystemSettings {
  id: number;
  pressure_min: number;
  pressure_max: number;
  pressure_critical_low: number;
  pressure_critical_high: number;
  tank_critical_level: number;
  tank_low_level: number;
  auto_refresh_interval: number;
  institution_name: string;
  emergency_mode: boolean;
  quota_usage_percent: number;
  updated_at: string;
  // Tank configuration
  tank_capacity_liters: number;
  tank_height_meters: number;
  tank_min_level: number;
  tank_max_level: number;
  tank_warning_level: number;
  measurement_unit: 'liters' | 'cubic_meters' | 'gallons';
  // Display preferences
  timezone: string;
  date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  time_format: '12h' | '24h';
  default_dashboard_view: 'overview' | 'detailed' | 'compact';
  // Security
  session_timeout_minutes: number;
  two_factor_enabled: boolean;
  // Theme
  theme_color: 'primary' | 'cyan' | 'emerald' | 'amber';
}

export interface UserNotificationSettings {
  id: string;
  user_id: string;
  email_alerts_enabled: boolean;
  sms_alerts_enabled: boolean;
  push_alerts_enabled: boolean;
  critical_alerts_only: boolean;
  notification_frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
}

export interface SensorCalibration {
  id: string;
  sensor_id: string;
  calibration_date: string;
  calibration_offset: number;
  calibration_scale: number;
  calibrated_by: string | null;
  notes: string | null;
  next_calibration_date: string | null;
  created_at: string;
}

export interface LoginActivity {
  id: string;
  user_id: string;
  login_time: string;
  logout_time: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  location: string | null;
  session_duration_seconds: number | null;
}

export interface FloorData {
  floor: string;
  pressure: number | null;
  pressureStatus: 'normal' | 'high' | 'low' | 'critical' | 'offline';
  tankLevel: number | null;
  tankStatus: 'normal' | 'low' | 'critical' | 'full' | 'offline';
  sensorStatus: 'online' | 'offline' | 'degraded';
  lastUpdate: string;
  sensorCount: number;
  activeAlerts: number;
}

export const FLOORS = [
  '1st Floor',
  '2nd Floor',
  '3rd Floor',
  '4th Floor',
  '5th Floor',
  '6th Floor',
  '7th Floor',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  administrator: 'Administrator',
  maintenance_staff: 'Maintenance Staff',
  viewer: 'Viewer',
};

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  low_pressure: 'Low Pressure',
  high_pressure: 'High Pressure',
  tank_critical: 'Tank Critical',
  sensor_disconnect: 'Sensor Disconnect',
  communication_failure: 'Communication Failure',
  battery_low: 'Battery Low',
  system: 'System',
};
