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
  battery_level?: number;
  network_status: NetworkStatus;
  health_status: HealthStatus;
  current_reading: number | null;
  last_communication: string;
  created_at: string;
}

export interface Alert {
  id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  description: string;
  floor: string | null;
  sensor_id: string | null;
  status: AlertStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface SensorReading {
  id: string;
  sensor_id: string;
  value: number;
  recorded_at: string;
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
  tank_capacity_liters: number;
  tank_height_meters: number;
  tank_min_level: number;
  tank_max_level: number;
  tank_warning_level: number;
  measurement_unit: string;
  timezone: string;
  date_format: string;
  time_format: string;
  default_dashboard_view: string;
  session_timeout_minutes: number;
  two_factor_enabled: boolean;
  theme_color: string;
}

export interface AuditLog {
  id: string;
  event_type: EventType;
  user_id: string | null;
  user_email: string | null;
  action: string;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  administrator: 'Administrator',
  maintenance_staff: 'Maintenance Staff',
  viewer: 'Viewer',
};

export const FLOORS = ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Floor 5', 'Basement', 'Rooftop'];

export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  critical: 'error',
  high: 'warning',
  medium: 'warning',
  low: 'info',
  info: 'info',
};
