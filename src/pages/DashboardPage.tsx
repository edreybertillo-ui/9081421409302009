import { useMemo } from 'react';
import {
  Activity, Gauge, Droplets, Building2, Wifi, Clock,
  AlertTriangle, Cpu
} from 'lucide-react';
import { Card, CardHeader, StatCard, Badge, StatusDot, PageHeader } from '../components/ui';
import { LineChart, DonutChart } from '../components/charts';
import { WaterTank } from '../components/WaterTank';
import { useSensors, useAlerts, usePressureReadings, useSettings } from '../hooks/useData';
import { FLOORS, type FloorData } from '../types';

export function DashboardPage() {
  const { sensors, loading: sensorsLoading } = useSensors();
  const { alerts, loading: alertsLoading } = useAlerts();
  const { readings: pressureReadings } = usePressureReadings(undefined, 24);
  const { settings } = useSettings();

  const floorData = useMemo<FloorData[]>(() => {
    return FLOORS.map((floor) => {
      const floorSensors = sensors.filter((s) => s.floor === floor);
      const pressureSensor = floorSensors.find((s) => s.sensor_type === 'pressure');
      const tankSensor = floorSensors.find((s) => s.sensor_type === 'tank_level');

      const pressure = pressureSensor?.current_reading ?? null;
      let pressureStatus: FloorData['pressureStatus'] = 'normal';
      if (pressureSensor?.network_status === 'offline') pressureStatus = 'offline';
      else if (pressure !== null && settings) {
        if (pressure >= settings.pressure_critical_high) pressureStatus = 'critical';
        else if (pressure >= settings.pressure_max) pressureStatus = 'high';
        else if (pressure <= settings.pressure_critical_low) pressureStatus = 'critical';
        else if (pressure <= settings.pressure_min) pressureStatus = 'low';
      }

      const tankLevel = tankSensor?.current_reading ?? null;
      let tankStatus: FloorData['tankStatus'] = 'normal';
      if (tankSensor?.network_status === 'offline') tankStatus = 'offline';
      else if (tankLevel !== null && settings) {
        if (tankLevel <= settings.tank_critical_level) tankStatus = 'critical';
        else if (tankLevel <= settings.tank_low_level) tankStatus = 'low';
      }

      const sensorStatus = floorSensors.some((s) => s.network_status === 'offline') ? 'offline'
        : floorSensors.some((s) => s.network_status === 'degraded') ? 'degraded' : 'online';

      const lastUpdate = floorSensors
        .map((s) => new Date(s.last_communication).getTime())
        .sort((a, b) => b - a)[0] || Date.now();

      const activeAlerts = alerts.filter((a) => a.floor === floor && a.status === 'active').length;

      return {
        floor,
        pressure,
        pressureStatus,
        tankLevel,
        tankStatus,
        sensorStatus,
        lastUpdate: new Date(lastUpdate).toISOString(),
        sensorCount: floorSensors.length,
        activeAlerts,
      };
    });
  }, [sensors, alerts, settings]);

  const systemStats = useMemo(() => {
    const onlineSensors = sensors.filter((s) => s.network_status === 'online').length;
    const offlineSensors = sensors.filter((s) => s.network_status === 'offline').length;
    const degradedSensors = sensors.filter((s) => s.network_status === 'degraded').length;
    const activeAlerts = alerts.filter((a) => a.status === 'active').length;
    const criticalAlerts = alerts.filter((a) => a.status === 'active' && (a.severity === 'critical' || a.severity === 'high')).length;
    const lastSync = sensors
      .map((s) => new Date(s.last_communication).getTime())
      .sort((a, b) => b - a)[0] || Date.now();

    return {
      onlineSensors,
      offlineSensors,
      degradedSensors,
      totalSensors: sensors.length,
      activeAlerts,
      criticalAlerts,
      lastSync: new Date(lastSync).toISOString(),
      systemOnline: offlineSensors < sensors.length,
    };
  }, [sensors, alerts]);

  const pressureChartData = useMemo(() => {
    const grouped: Record<string, { sum: number; count: number }> = {};
    pressureReadings.forEach((r) => {
      const hour = new Date(r.recorded_at).toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }) + ':00';
      if (!grouped[hour]) grouped[hour] = { sum: 0, count: 0 };
      grouped[hour].sum += r.pressure_value;
      grouped[hour].count++;
    });
    return Object.entries(grouped)
      .map(([label, v]) => ({ label, value: v.sum / v.count }))
      .slice(-12);
  }, [pressureReadings]);

  const avgPressure = useMemo(() => {
    if (pressureReadings.length === 0) return 0;
    return pressureReadings.reduce((s, r) => s + r.pressure_value, 0) / pressureReadings.length;
  }, [pressureReadings]);

  const mainTank = useMemo(() => {
    const tankSensor = sensors.find((s) => s.id === 'SEN-7F-T01');
    if (!tankSensor) return null;
    const level = tankSensor.current_reading ?? 0;
    const capacity = 5000;
    return {
      level,
      capacity,
      remaining: (level / 100) * capacity,
    };
  }, [sensors]);

  const sensorHealthData = useMemo(() => {
    const healthy = sensors.filter((s) => s.health_status === 'healthy').length;
    const warning = sensors.filter((s) => s.health_status === 'warning').length;
    const critical = sensors.filter((s) => s.health_status === 'critical').length;
    return [
      { label: 'Healthy', value: healthy, color: '#22c55e' },
      { label: 'Warning', value: warning, color: '#f59e0b' },
      { label: 'Critical', value: critical, color: '#ef4444' },
    ];
  }, [sensors]);

  if (sensorsLoading && alertsLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-primary-600 rounded-full" /></div>;
  }

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    return `${hr}h ago`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Dashboard"
        subtitle="Real-time overview of your water distribution network"
      />

      {/* System Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={systemStats.systemOnline ? Activity : AlertTriangle}
          label="System Status"
          value={systemStats.systemOnline ? 'Online' : 'Offline'}
          color={systemStats.systemOnline ? 'success' : 'error'}
          trend={systemStats.systemOnline ? { value: 'Operational', positive: true } : { value: 'Down', positive: false }}
        />
        <StatCard
          icon={Cpu}
          label="Connected Sensors"
          value={`${systemStats.onlineSensors}/${systemStats.totalSensors}`}
          color="primary"
          trend={systemStats.offlineSensors > 0 ? { value: `${systemStats.offlineSensors} offline`, positive: false } : { value: 'All connected', positive: true }}
        />
        <StatCard
          icon={AlertTriangle}
          label="Active Alerts"
          value={systemStats.activeAlerts}
          color={systemStats.criticalAlerts > 0 ? 'error' : 'warning'}
          trend={systemStats.criticalAlerts > 0 ? { value: `${systemStats.criticalAlerts} critical`, positive: false } : { value: 'No critical', positive: true }}
        />
        <StatCard
          icon={Clock}
          label="Last Sync"
          value={timeAgo(systemStats.lastSync)}
          color="cyan"
        />
      </div>

      {/* Pressure + Tank + Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pressure Monitoring */}
        <Card className="lg:col-span-2">
          <CardHeader
            icon={Gauge}
            title="Water Pressure Monitoring"
            subtitle={`Average: ${avgPressure.toFixed(2)} bar — Normal range: ${settings?.pressure_min ?? 2.0}–${settings?.pressure_max ?? 5.0} bar`}
            action={
              <Badge variant={avgPressure < (settings?.pressure_min ?? 2) ? 'error' : avgPressure > (settings?.pressure_max ?? 5) ? 'warning' : 'success'}>
                {avgPressure < (settings?.pressure_min ?? 2) ? 'Low' : avgPressure > (settings?.pressure_max ?? 5) ? 'High' : 'Normal'}
              </Badge>
            }
          />
          <div className="px-5 pb-5">
            <LineChart
              data={pressureChartData}
              height={220}
              color="#3b82f6"
              unit=" bar"
              thresholds={{ min: settings?.pressure_min, max: settings?.pressure_max }}
            />
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-primary-500" /> Current Pressure
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-warning-500" /> Min Threshold
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-error-500" /> Max Threshold
              </div>
            </div>
          </div>
        </Card>

        {/* Tank Monitoring */}
        <Card>
          <CardHeader icon={Droplets} title="Main Tank Level" subtitle="7th Floor — Primary Storage" />
          <div className="px-5 pb-5">
            {mainTank ? (
              <>
                <WaterTank level={mainTank.level} capacity={mainTank.capacity} remaining={mainTank.remaining} />
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Est. remaining time</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">~8.5 hours</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Fill rate</span>
                    <span className="font-medium text-success-600 dark:text-success-400">+2.3 L/min</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">No tank sensor data</p>
            )}
          </div>
        </Card>
      </div>

      {/* Sensor Health + Building Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader icon={Cpu} title="Sensor Health" subtitle={`${systemStats.totalSensors} total sensors`} />
          <div className="px-5 pb-5">
            <DonutChart data={sensorHealthData} size={150} />
          </div>
        </Card>

        {/* Building Floor Cards */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader icon={Building2} title="Building Monitoring" subtitle="All floors — live sensor data" />
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {floorData.map((floor) => (
                <FloorCard key={floor.floor} floor={floor} timeAgo={timeAgo} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FloorCard({ floor, timeAgo }: { floor: FloorData; timeAgo: (iso: string) => string }) {
  const pressureVariant = floor.pressureStatus === 'critical' ? 'critical' : floor.pressureStatus === 'high' || floor.pressureStatus === 'low' ? 'warning' : 'success';

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusDot status={floor.sensorStatus} />
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{floor.floor}</span>
        </div>
        {floor.activeAlerts > 0 && (
          <Badge variant="error">{floor.activeAlerts} alert{floor.activeAlerts > 1 ? 's' : ''}</Badge>
        )}
      </div>

      <div className="space-y-2.5">
        {/* Pressure */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Pressure</span>
          </div>
          <div className="flex items-center gap-2">
            {floor.pressure !== null ? (
              <>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{floor.pressure.toFixed(1)} bar</span>
                <Badge variant={pressureVariant}>
                  {floor.pressureStatus === 'offline' ? 'Offline' : floor.pressureStatus.charAt(0).toUpperCase() + floor.pressureStatus.slice(1)}
                </Badge>
              </>
            ) : (
              <span className="text-xs text-slate-400">N/A</span>
            )}
          </div>
        </div>

        {/* Tank */}
        {floor.tankLevel !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Tank</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{floor.tankLevel.toFixed(0)}%</span>
              <Badge variant={floor.tankStatus === 'critical' ? 'critical' : floor.tankStatus === 'low' ? 'warning' : 'success'}>
                {floor.tankStatus.charAt(0).toUpperCase() + floor.tankStatus.slice(1)}
              </Badge>
            </div>
          </div>
        )}

        {/* Sensor count + last update */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Wifi className="w-3 h-3" />
            <span>{floor.sensorCount} sensor{floor.sensorCount > 1 ? 's' : ''}</span>
          </div>
          <span className="text-xs text-slate-400">{timeAgo(floor.lastUpdate)}</span>
        </div>
      </div>
    </div>
  );
}
