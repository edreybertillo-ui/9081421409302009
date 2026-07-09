import { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, Filter } from 'lucide-react';
import { useAlerts } from '../hooks/useData';
import { Card, Badge, Button, Select, EmptyState } from '../components/ui';
import type { AlertStatus, AlertSeverity } from '../types';

export function AlertsPage() {
  const { alerts, loading, acknowledgeAlert, resolveAlert } = useAlerts();
  const [statusFilter, setStatusFilter] = useState<AlertStatus | ''>('');

  const filteredAlerts = useMemo(() => {
    if (!statusFilter) return alerts;
    return alerts.filter(a => a.status === statusFilter);
  }, [alerts, statusFilter]);

  const activeCount = alerts.filter(a => a.status === 'active').length;
  const acknowledgedCount = alerts.filter(a => a.status === 'acknowledged').length;

  const severityColors: Record<AlertSeverity, 'error' | 'warning' | 'info'> = {
    critical: 'error',
    high: 'error',
    medium: 'warning',
    low: 'warning',
    info: 'info',
  };

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'acknowledged', label: 'Acknowledged' },
    { value: 'resolved', label: 'Resolved' },
  ];

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Alerts</h1>
          <p className="text-slate-500 dark:text-slate-400">Monitor and manage system alerts</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={activeCount > 0 ? 'error' : 'success'}>{activeCount} Active</Badge>
          <Badge variant="warning">{acknowledgedCount} Acknowledged</Badge>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as AlertStatus | '')}
              options={statusOptions}
              placeholder="All Statuses"
            />
          </div>
        </div>
      </Card>

      {filteredAlerts.length === 0 ? (
        <EmptyState
          title="No Alerts"
          description="All systems operating normally"
          icon={<CheckCircle className="w-12 h-12" />}
        />
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <Card key={alert.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${
                    alert.severity === 'critical' ? 'bg-error-100 dark:bg-error-950' :
                    alert.severity === 'high' ? 'bg-warning-100 dark:bg-warning-950' :
                    'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    <AlertTriangle className={`w-5 h-5 ${
                      alert.severity === 'critical' ? 'text-error-500' :
                      alert.severity === 'high' ? 'text-warning-500' :
                      'text-slate-500'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {alert.alert_type.replace('_', ' ').toUpperCase()}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{alert.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant={severityColors[alert.severity]}>
                        {alert.severity}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                      {alert.floor && <span className="text-xs text-slate-400">{alert.floor}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {alert.status === 'active' && (
                    <Button size="sm" variant="secondary" onClick={() => acknowledgeAlert(alert.id)}>
                      Acknowledge
                    </Button>
                  )}
                  {alert.status !== 'resolved' && (
                    <Button size="sm" variant="primary" onClick={() => resolveAlert(alert.id)}>
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
