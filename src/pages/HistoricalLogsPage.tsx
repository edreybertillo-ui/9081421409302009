import { useState, useMemo } from 'react';
import {
  FileText, Search, Download, ChevronDown, Calendar,
  MapPin, Cpu, Bell, LogIn, UserCog, FileDown
} from 'lucide-react';
import { Card, Badge, PageHeader, EmptyState, LoadingSpinner } from '../components/ui';
import { useAuditLogs, useAlerts, usePressureReadings, useTankReadings } from '../hooks/useData';
import { useAuth } from '../context/AuthContext';
import { ROLE_PERMISSIONS } from '../lib/auth';
import { logAuditEvent } from '../lib/auth';
import { FLOORS } from '../types';

type LogEntry = {
  id: string;
  timestamp: string;
  type: 'alert' | 'audit' | 'pressure' | 'tank' | 'sensor';
  floor?: string;
  sensor?: string;
  description: string;
  severity?: string;
  user?: string;
};

export function HistoricalLogsPage() {
  const { profile } = useAuth();
  const perms = profile ? ROLE_PERMISSIONS[profile.role] : null;
  const { logs } = useAuditLogs(200);
  const { alerts } = useAlerts();
  const { readings: pressureReadings } = usePressureReadings(undefined, 168);
  const { readings: tankReadings } = useTankReadings(undefined, 168);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [exporting, setExporting] = useState(false);

  const allLogs = useMemo<LogEntry[]>(() => {
    const entries: LogEntry[] = [];

    alerts.forEach((a) => {
      entries.push({
        id: `alert-${a.id}`,
        timestamp: a.created_at,
        type: 'alert',
        floor: a.floor || undefined,
        sensor: a.sensor_id || undefined,
        description: a.description,
        severity: a.severity,
      });
    });

    logs.forEach((l) => {
      entries.push({
        id: `audit-${l.id}`,
        timestamp: l.created_at,
        type: 'audit',
        description: l.action,
        user: l.user_email || undefined,
      });
    });

    pressureReadings.slice(-50).forEach((r) => {
      entries.push({
        id: `pressure-${r.id}`,
        timestamp: r.recorded_at,
        type: 'pressure',
        floor: r.floor,
        sensor: r.sensor_id,
        description: `Pressure reading: ${r.pressure_value.toFixed(2)} bar (${r.status})`,
      });
    });

    tankReadings.slice(-50).forEach((r) => {
      entries.push({
        id: `tank-${r.id}`,
        timestamp: r.recorded_at,
        type: 'tank',
        floor: r.floor,
        sensor: r.sensor_id,
        description: `Tank level: ${r.level_percentage.toFixed(1)}% (${r.status})`,
      });
    });

    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [alerts, logs, pressureReadings, tankReadings]);

  const filtered = useMemo(() => {
    return allLogs.filter((log) => {
      if (search && !log.description.toLowerCase().includes(search.toLowerCase()) && !log.sensor?.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== 'all' && log.type !== typeFilter) return false;
      if (floorFilter !== 'all' && log.floor !== floorFilter) return false;
      if (dateFilter !== 'all') {
        const logDate = new Date(log.timestamp);
        const now = new Date();
        const diff = now.getTime() - logDate.getTime();
        if (dateFilter === '1h' && diff > 3600000) return false;
        if (dateFilter === '24h' && diff > 86400000) return false;
        if (dateFilter === '7d' && diff > 604800000) return false;
        if (dateFilter === '30d' && diff > 2592000000) return false;
      }
      return true;
    });
  }, [allLogs, search, typeFilter, floorFilter, dateFilter]);

  const handleExport = async () => {
    if (!perms?.canExport) return;
    setExporting(true);
    const headers = ['Timestamp', 'Type', 'Floor', 'Sensor', 'Description', 'Severity', 'User'];
    const rows = filtered.map((l) => [
      new Date(l.timestamp).toISOString(),
      l.type,
      l.floor || '',
      l.sensor || '',
      l.description,
      l.severity || '',
      l.user || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `water-monitoring-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (profile) {
      await logAuditEvent(profile.email, 'Exported historical logs', 'export', { format: 'csv', records: filtered.length });
    }
    setExporting(false);
  };

  const typeIcons: Record<string, typeof Bell> = {
    alert: Bell,
    audit: LogIn,
    pressure: Cpu,
    tank: FileText,
    sensor: Cpu,
  };

  const typeColors: Record<string, string> = {
    alert: 'text-error-500 bg-error-50 dark:bg-error-950',
    audit: 'text-primary-500 bg-primary-50 dark:bg-primary-950',
    pressure: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950',
    tank: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950',
    sensor: 'text-slate-500 bg-slate-100 dark:bg-slate-800',
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historical Data"
        subtitle={`${filtered.length} records — analyze trends, sensor readings, and system history`}
        action={
          perms?.canExport ? (
            <button onClick={handleExport} disabled={exporting} className="btn-primary text-sm">
              {exporting ? <LoadingSpinner size="sm" /> : <Download className="w-4 h-4" />}
              Export CSV
            </button>
          ) : (
            <Badge variant="neutral">
              <FileDown className="w-3.5 h-3.5" /> Export: Admin only
            </Badge>
          )
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-11"
            />
          </div>
          <SelectFilter value={typeFilter} onChange={setTypeFilter} options={[
            { value: 'all', label: 'All Types' },
            { value: 'alert', label: 'Alerts' },
            { value: 'audit', label: 'Audit Logs' },
            { value: 'pressure', label: 'Pressure' },
            { value: 'tank', label: 'Tank' },
          ]} />
          <SelectFilter value={floorFilter} onChange={setFloorFilter} options={[{ value: 'all', label: 'All Floors' }, ...FLOORS.map((f) => ({ value: f, label: f }))]} />
          <SelectFilter value={dateFilter} onChange={setDateFilter} options={[
            { value: 'all', label: 'All Time' },
            { value: '1h', label: 'Last Hour' },
            { value: '24h', label: 'Last 24 Hours' },
            { value: '7d', label: 'Last 7 Days' },
            { value: '30d', label: 'Last 30 Days' },
          ]} />
        </div>
      </Card>

      {/* Log entries */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={FileText} title="No logs found" message="No records match your current filters." />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
            {filtered.slice(0, 100).map((log) => {
              const Icon = typeIcons[log.type] || FileText;
              return (
                <div key={log.id} className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColors[log.type] || 'text-slate-500 bg-slate-100'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">{log.description}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatTime(log.timestamp)}
                      </span>
                      {log.floor && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {log.floor}
                        </span>
                      )}
                      {log.sensor && (
                        <span className="flex items-center gap-1 font-mono">
                          <Cpu className="w-3 h-3" />
                          {log.sensor}
                        </span>
                      )}
                      {log.user && (
                        <span className="flex items-center gap-1">
                          <UserCog className="w-3 h-3" />
                          {log.user}
                        </span>
                      )}
                      {log.severity && (
                        <Badge variant={log.severity === 'critical' ? 'critical' : log.severity === 'high' ? 'error' : log.severity === 'medium' ? 'warning' : 'neutral'}>
                          {log.severity}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length > 100 && (
              <div className="p-4 text-center text-sm text-slate-400">
                Showing 100 of {filtered.length} records. Use filters to narrow down.
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function SelectFilter({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="btn-secondary text-sm whitespace-nowrap">
        {current?.label || 'Select'}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-44 card p-1.5 z-20 animate-slide-up">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`nav-item w-full ${opt.value === value ? 'nav-item-active' : 'nav-item-inactive'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
