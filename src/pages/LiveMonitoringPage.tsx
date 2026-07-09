import { useState, useMemo } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { useSensors } from '../hooks/useData';
import { Card, Badge, StatusDot, Select, EmptyState, Button } from '../components/ui';
import type { Sensor, SensorType } from '../types';

export function LiveMonitoringPage() {
  const { sensors, loading, refetch } = useSensors();
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');

  const filteredSensors = useMemo(() => {
    return sensors.filter(s => {
      if (selectedFloor && s.floor !== selectedFloor) return false;
      if (selectedType && s.sensor_type !== selectedType) return false;
      return true;
    });
  }, [sensors, selectedFloor, selectedType]);

  const floors = useMemo(() => {
    return [...new Set(sensors.map(s => s.floor))].sort();
  }, [sensors]);

  const sensorTypes: { value: SensorType; label: string }[] = [
    { value: 'pressure', label: 'Pressure' },
    { value: 'tank_level', label: 'Tank Level' },
    { value: 'flow', label: 'Flow' },
    { value: 'temperature', label: 'Temperature' },
  ];

  const handleRefresh = () => {
    refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Real-Time Monitoring</h1>
          <p className="text-slate-500 dark:text-slate-400">Live sensor data and status</p>
        </div>
        <Button variant="secondary" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="w-48">
          <Select
            value={selectedFloor}
            onChange={setSelectedFloor}
            options={floors.map(f => ({ value: f, label: f }))}
            placeholder="All Floors"
          />
        </div>
        <div className="w-48">
          <Select
            value={selectedType}
            onChange={setSelectedType}
            options={sensorTypes}
            placeholder="All Types"
          />
        </div>
      </div>

      {filteredSensors.length === 0 ? (
        <EmptyState
          title="No Sensors Found"
          description="Try adjusting your filters"
          icon={<Activity className="w-12 h-12" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSensors.map((sensor) => (
            <SensorCard key={sensor.id} sensor={sensor} />
          ))}
        </div>
      )}
    </div>
  );
}

function SensorCard({ sensor }: { sensor: Sensor }) {
  const statusColor = {
    online: 'success',
    offline: 'error',
    degraded: 'warning',
  } as const;

  const batteryColor = {
    good: 'success',
    low: 'warning',
    critical: 'error',
  } as const;

  const typeLabels: Record<SensorType, string> = {
    pressure: 'Pressure',
    tank_level: 'Tank Level',
    flow: 'Flow Rate',
    temperature: 'Temperature',
  };

  const unitLabels: Record<SensorType, string> = {
    pressure: 'PSI',
    tank_level: '%',
    flow: 'GPM',
    temperature: 'F',
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {typeLabels[sensor.sensor_type]}
          </p>
          <p className="text-xs text-slate-500">{sensor.floor}</p>
          {sensor.location && <p className="text-xs text-slate-400">{sensor.location}</p>}
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status={sensor.network_status === 'degraded' ? 'warning' : sensor.network_status} />
          <Badge variant={statusColor[sensor.network_status] || 'info'}>
            {sensor.network_status}
          </Badge>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {sensor.current_reading !== null ? sensor.current_reading.toFixed(1) : '--'}
          </p>
          <p className="text-sm text-slate-500">{unitLabels[sensor.sensor_type]}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <Badge variant={batteryColor[sensor.battery_status] || 'info'}>
              {sensor.battery_status}
            </Badge>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Updated {new Date(sensor.last_communication).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </Card>
  );
}
