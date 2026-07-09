import { useMemo } from 'react';
import { Wifi, WifiOff, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { useSensors, useAlerts } from '../hooks/useData';
import { Card, StatCard, Badge, StatusDot, EmptyState } from '../components/ui';
import { SensorBarChart } from '../components/charts';

export function DashboardPage() {
  const { sensors, loading: sensorsLoading } = useSensors();
  const { alerts, loading: alertsLoading } = useAlerts();

  const stats = useMemo(() => {
    const online = sensors.filter(s => s.network_status === 'online').length;
    const offline = sensors.filter(s => s.network_status === 'offline').length;
    const activeAlerts = alerts.filter(a => a.status === 'active').length;

    const pressureSensors = sensors.filter(s => s.sensor_type === 'pressure');
    const avgPressure = pressureSensors
      .filter(s => s.current_reading !== null)
      .reduce((sum, s) => sum + (s.current_reading || 0), 0) /
      pressureSensors.filter(s => s.current_reading !== null).length || 0;

    return { online, offline, activeAlerts, avgPressure: avgPressure.toFixed(1) };
  }, [sensors, alerts]);

  const floorData = useMemo(() => {
    const floors = ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Floor 5', 'Basement', 'Rooftop'];
    return floors.map(floor => {
      const floorSensors = sensors.filter(s => s.floor === floor);
      const online = floorSensors.filter(s => s.network_status === 'online').length;
      return { name: floor.replace('Floor ', 'F'), value: online, color: online > 0 ? '#22c55e' : '#ef4444' };
    });
  }, [sensors]);

  if (sensorsLoading || alertsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400">System overview and key metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Online Sensors"
          value={stats.online}
          subtitle={`${sensors.length} total sensors`}
          icon={<Wifi className="w-5 h-5" />}
          trend="up"
          trendValue={sensors.length > 0 ? `${Math.round((stats.online / sensors.length) * 100)}%` : '0%'}
        />
        <StatCard
          title="Offline Sensors"
          value={stats.offline}
          icon={<WifiOff className="w-5 h-5" />}
          className={stats.offline > 0 ? 'border-warning-200 dark:border-warning-900' : ''}
        />
        <StatCard
          title="Active Alerts"
          value={stats.activeAlerts}
          icon={<AlertTriangle className="w-5 h-5" />}
          className={stats.activeAlerts > 0 ? 'border-error-200 dark:border-error-900' : ''}
        />
        <StatCard
          title="Average Pressure"
          value={`${stats.avgPressure} PSI`}
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Sensors by Floor</h2>
          {sensors.length > 0 ? (
            <SensorBarChart data={floorData} height={250} />
          ) : (
            <EmptyState title="No Sensors" icon={<Activity className="w-12 h-12" />} />
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Sensor Status by Floor</h2>
          <div className="space-y-3">
            {['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Floor 5', 'Basement', 'Rooftop'].map(floor => {
              const floorSensors = sensors.filter(s => s.floor === floor);
              const online = floorSensors.filter(s => s.network_status === 'online').length;
              const offline = floorSensors.filter(s => s.network_status === 'offline').length;
              const floorAlerts = alerts.filter(a => a.floor === floor && a.status === 'active').length;

              return (
                <div key={floor} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <StatusDot status={offline > 0 ? 'offline' : 'online'} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{floor}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {floorAlerts > 0 && (
                      <Badge variant="error">{floorAlerts} alerts</Badge>
                    )}
                    <span className="text-xs text-slate-500">{online}/{floorSensors.length} online</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Recent Alerts</h2>
        {alerts.slice(0, 5).length > 0 ? (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <StatusDot status={alert.status === 'active' ? 'critical' : 'online'} />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{alert.alert_type.replace('_', ' ').toUpperCase()}</p>
                    <p className="text-xs text-slate-500">{alert.floor || 'System'} - {alert.description}</p>
                  </div>
                </div>
                <Badge variant={alert.status === 'active' ? 'error' : 'success'}>
                  {alert.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No Alerts" description="System is operating normally" />
        )}
      </Card>
    </div>
  );
}
