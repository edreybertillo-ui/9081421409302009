import { useState, useMemo } from 'react';
import { Calendar, Download, Filter } from 'lucide-react';
import { useAuditLogs } from '../hooks/useData';
import { Card, Select, EmptyState, Button, Badge } from '../components/ui';
import type { EventType } from '../types';

export function HistoricalLogsPage() {
  const { logs, loading } = useAuditLogs(200);
  const [eventType, setEventType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const eventTypes: { value: EventType; label: string }[] = [
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'login_failed', label: 'Login Failed' },
    { value: 'role_change', label: 'Role Change' },
    { value: 'user_disabled', label: 'User Disabled' },
    { value: 'user_enabled', label: 'User Enabled' },
    { value: 'settings_change', label: 'Settings Change' },
    { value: 'alert_resolved', label: 'Alert Resolved' },
    { value: 'export', label: 'Export' },
  ];

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (eventType && log.event_type !== eventType) return false;
      if (startDate && new Date(log.created_at) < new Date(startDate)) return false;
      if (endDate && new Date(log.created_at) > new Date(endDate + 'T23:59:59')) return false;
      return true;
    });
  }, [logs, eventType, startDate, endDate]);

  const eventTypeLabels: Record<EventType, string> = {
    login: 'Login',
    logout: 'Logout',
    login_failed: 'Login Failed',
    role_change: 'Role Change',
    user_disabled: 'User Disabled',
    user_enabled: 'User Enabled',
    settings_change: 'Settings Change',
    alert_resolved: 'Alert Resolved',
    export: 'Export',
  };

  const eventBadgeVariant: Record<EventType, 'success' | 'error' | 'warning' | 'info'> = {
    login: 'success',
    logout: 'info',
    login_failed: 'error',
    role_change: 'warning',
    user_disabled: 'error',
    user_enabled: 'success',
    settings_change: 'warning',
    alert_resolved: 'success',
    export: 'info',
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportName = `audit_logs_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Historical Logs</h1>
          <p className="text-slate-500 dark:text-slate-400">Audit trail and system events</p>
        </div>
        <Button variant="secondary" onClick={handleExport}>
          <Download className="w-4 h-4" /> Export
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="w-48">
            <Select
              value={eventType}
              onChange={setEventType}
              options={eventTypes}
              placeholder="All Events"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </Card>

      {filteredLogs.length === 0 ? (
        <EmptyState
          title="No Logs Found"
          description="Try adjusting your filters"
          icon={<Calendar className="w-12 h-12" />}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event</th>
                <th>User</th>
                <th>Action</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td>
                    <Badge variant={eventBadgeVariant[log.event_type]}>
                      {eventTypeLabels[log.event_type]}
                    </Badge>
                  </td>
                  <td>{log.user_email || 'System'}</td>
                  <td className="max-w-xs truncate">{log.action}</td>
                  <td className="font-mono text-xs">{log.ip_address || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
