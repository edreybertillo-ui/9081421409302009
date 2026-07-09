import { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, Badge, StatusDot, PageHeader, LoadingSpinner } from '../components/ui';
import { WaterTank } from '../components/WaterTank';
import { useSensors, useSettings, useAutoRefresh } from '../hooks/useData';
import { FLOORS } from '../types';

export function LiveMonitoringPage() {
  const { sensors, refetch: refetchSensors, loading } = useSensors();
  const { settings } = useSettings();
  const [lastRefresh, setLastRefresh] = useState(new Date().toISOString());
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await refetchSensors();
    setLastRefresh(new Date().toISOString());
    setTimeout(() => setRefreshing(false), 500);
  }, [refetchSensors]);

  const interval = settings?.auto_refresh_interval ?? 5;
  useAutoRefresh(refresh, interval, true);

  const floorData = useMemo(() => {
    return FLOORS.map((floor) => {
      const floorSensors = sensors.filter((s) => s.floor === floor);
      return { floor, sensors: floorSensors };
    });
  }, [sensors]);

  const onlineCount = sensors.filter((s) => s.network_status === 'online').length;
  const offlineCount = sensors.filter((s) => s.network_status === 'offline').length;
  const degradedCount = sensors.filter((s) => s.network_status === 'degraded').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Monitoring"
        subtitle={`Auto-refreshing every ${interval} seconds — real-time sensor data`}
        action={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Clock className="w-4 h-4" />
              <span>Updated {timeAgo(lastRefresh)}</span>
            </div>
            <button onClick={refresh} className="btn-secondary" disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Connection status bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success-50 dark:bg-success-950 flex items-center justify-center">
            <Wifi className="w-5 h-5 text-success-600 dark:text-success-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{onlineCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Online</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning-50 dark:bg-warning-950 flex items-center justify-center">
            <Activity className="w-5 h-5 text-warning-600 dark:text-warning-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{degradedCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Degraded</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-error-50 dark:bg-error-950 flex items-center justify-center">
            <WifiOff className="w-5 h-5 text-error-600 dark:text-error-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{offlineCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Offline</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950 flex items-center justify-center">
            <Radio className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{sensors.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Sensors</p>
          </div>
        </div>
      </div>

      {/* Floor-by-floor live data */}
      <div className="space-y-4">
        {floorData.map(({ floor, sensors: floorSensors }) => (
          <Card key={floor}>
            <CardHeader
              icon={Building2Icon}
              title={floor}
              subtitle={`${floorSensors.length} sensor${floorSensors.length !== 1 ? 's' : ''} connected`}
              action={
                <div className="flex items-center gap-2">
                  {floorSensors.some((s) => s.network_status === 'offline') ? (
                    <Badge variant="error"><StatusDot status="offline" /> Offline</Badge>
                  ) : floorSensors.some((s) => s.network_status === 'degraded') ? (
                    <Badge variant="warning"><StatusDot status="degraded" /> Degraded</Badge>
                  ) : (
                    <Badge variant="success"><StatusDot status="online" /> Online</Badge>
                  )}
                </div>
              }
            />
            <div className="px-5 pb-5">
              {floorSensors.length === 0 ? (
                <p className="text-sm text-slate-400 py-4">No sensors on this floor</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {floorSensors.map((sensor) => (
                    <SensorLiveCard key={sensor.id} sensor={sensor} settings={settings} />
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {loading && sensors.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      )}
    </div>
  );
}

interface Sensor {
  id: string;
  sensor_name: string;
  network_status: string;
  water_level?: number;
  flow_rate?: number;
}

interface SensorLiveCardProps {
  sensor: Sensor;
  settings: any; // Replace 'any' with your Settings type if you have one
}

function SensorLiveCard({ sensor, settings }: SensorLiveCardProps) {

interface SensorSettings {
  unit: string;
  threshold: number;
}

function SensorLiveCard({
  sensor,
  settings,
}: {
  sensor: Sensor;
  settings: SensorSettings;
}) {
  const isOnline = sensor.network_status === 'online';
  const isDegraded = sensor.network_status === 'degraded';
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    return `${Math.floor(min / 60)}h ago`;
  };

  const pressureStatus = () => {
    if (!isOnline) return 'offline';
    const v = sensor.current_reading;
    if (v === null) return 'unknown';
    if (v >= settings?.pressure_critical_high) return 'critical';
    if (v >= settings?.pressure_max) return 'high';
    if (v <= settings?.pressure_critical_low) return 'critical';
    if (v <= settings?.pressure_min) return 'low';
    return 'normal';
  };

  return (
    <div className={`p-4 rounded-xl border transition-all duration-200 ${
      isOnline ? 'border-slate-200 dark:border-slate-800' : 'border-error-200 dark:border-error-900 bg-error-50/30 dark:bg-error-950/20'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {sensor.sensor_type === 'pressure' ? <Gauge className="w-4 h-4 text-primary-500" /> :
           sensor.sensor_type === 'tank_level' ? <Droplets className="w-4 h-4 text-cyan-500" /> :
           <Activity className="w-4 h-4 text-success-500" />}
          <span className="text-sm font-mono font-medium text-slate-700 dark:text-slate-300">{sensor.id}</span>
        </div>
        <StatusDot status={isOnline ? 'online' : isDegraded ? 'degraded' : 'offline'} />
      </div>

      <div className="mb-3">
        {sensor.sensor_type === 'tank_level' && sensor.current_reading !== null ? (
          <WaterTank
            level={sensor.current_reading}
            capacity={5000}
            remaining={(sensor.current_reading / 100) * 5000}
          />
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {sensor.current_reading !== null ? sensor.current_reading.toFixed(1) : '—'}
            </span>
            <span className="text-sm text-slate-400">
              {sensor.sensor_type === 'pressure' ? 'bar' : sensor.sensor_type === 'flow' ? 'L/min' : ''}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Type</span>
          <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{sensor.sensor_type.replace('_', ' ')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Location</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">{sensor.location || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Battery</span>
          <span className={`font-medium ${
            sensor.battery_status === 'critical' ? 'text-error-600 dark:text-error-400' :
            sensor.battery_status === 'low' ? 'text-warning-600 dark:text-warning-400' :
            'text-success-600 dark:text-success-400'
          }`}>{sensor.battery_level}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Last reading</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">{timeAgo(sensor.last_communication)}</span>
        </div>
        {sensor.sensor_type === 'pressure' && isOnline && sensor.current_reading !== null && (
          <div className="flex justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Status</span>
            <Badge variant={pressureStatus() === 'normal' ? 'success' : pressureStatus() === 'offline' ? 'neutral' : 'warning'}>
              {pressureStatus().charAt(0).toUpperCase() + pressureStatus().slice(1)}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

import { Building2 as Building2Icon } from 'lucide-react';
import { Radio, Gauge, Droplets, Wifi, WifiOff, Clock, RefreshCw, Activity } from 'lucide-react';
