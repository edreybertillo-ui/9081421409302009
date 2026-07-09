import { useState, useMemo } from 'react';
import {
  Bell, AlertTriangle, AlertCircle, Info, CheckCircle2,
  Clock, MapPin, Cpu, Filter, Check, ChevronDown
} from 'lucide-react';
import { Card, Badge, PageHeader, EmptyState, LoadingSpinner } from '../components/ui';
import { useAlerts, useAutoRefresh } from '../hooks/useData';
import { useAuth } from '../context/AuthContext';
import { ROLE_PERMISSIONS, logAuditEvent } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { ALERT_TYPE_LABELS, type Alert, type AlertSeverity, type AlertStatus } from '../types';

const SEVERITY_CONFIG: Record<AlertSeverity, { icon: typeof AlertTriangle; color: string; bg: string; border: string; text: string }> = {
  critical: { icon: AlertCircle, color: 'error', bg: 'bg-error-50 dark:bg-error-950/30', border: 'border-error-200 dark:border-error-900', text: 'text-error-700 dark:text-error-400' },
  high: { icon: AlertTriangle, color: 'error', bg: 'bg-error-50/50 dark:bg-error-950/20', border: 'border-error-100 dark:border-error-900/50', text: 'text-error-600 dark:text-error-400' },
  medium: { icon: AlertTriangle, color: 'warning', bg: 'bg-warning-50 dark:bg-warning-950/30', border: 'border-warning-200 dark:border-warning-900', text: 'text-warning-700 dark:text-warning-400' },
  low: { icon: Info, color: 'info', bg: 'bg-primary-50 dark:bg-primary-950/30', border: 'border-primary-200 dark:border-primary-900', text: 'text-primary-700 dark:text-primary-400' },
  info: { icon: Info, color: 'info', bg: 'bg-slate-50 dark:bg-slate-800/30', border: 'border-slate-200 dark:border-slate-800', text: 'text-slate-600 dark:text-slate-400' },
};

export function AlertsPage() {
  const { alerts, loading, refetch } = useAlerts();
  const { profile } = useAuth();
  const perms = profile ? ROLE_PERMISSIONS[profile.role] : null;
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [resolving, setResolving] = useState<string | null>(null);

  useAutoRefresh(refetch, 10, true);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
      return true;
    });
  }, [alerts, statusFilter, severityFilter]);

  const stats = useMemo(() => ({
    active: alerts.filter((a) => a.status === 'active').length,
    critical: alerts.filter((a) => a.status === 'active' && a.severity === 'critical').length,
    high: alerts.filter((a) => a.status === 'active' && a.severity === 'high').length,
    resolved: alerts.filter((a) => a.status === 'resolved').length,
  }), [alerts]);

  const resolveAlert = async (alert: Alert) => {
    if (!perms?.canResolveAlerts) return;
    setResolving(alert.id);
    await supabase
      .from('alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: profile?.id })
      .eq('id', alert.id);
    if (profile) {
      await logAuditEvent(profile.email, `Resolved alert: ${alert.description.substring(0, 50)}`, 'alert_resolved', { alert_id: alert.id, alert_type: alert.alert_type });
    }
    await refetch();
    setResolving(null);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading && alerts.length === 0) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        subtitle="System-generated alerts for abnormal conditions and sensor events"
        action={
          <div className="flex items-center gap-2">
            <FilterDropdown label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v as any)} options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'acknowledged', label: 'Acknowledged' },
              { value: 'resolved', label: 'Resolved' },
            ]} />
            <FilterDropdown label="Severity" value={severityFilter} onChange={(v) => setSeverityFilter(v as any)} options={[
              { value: 'all', label: 'All Severity' },
              { value: 'critical', label: 'Critical' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
              { value: 'info', label: 'Info' },
            ]} />
          </div>
        }
      />

      {/* Alert stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-primary-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Active</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.active}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-error-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Critical</span>
          </div>
          <p className="text-2xl font-bold text-error-600 dark:text-error-400">{stats.critical}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-warning-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">High Priority</span>
          </div>
          <p className="text-2xl font-bold text-warning-600 dark:text-warning-400">{stats.high}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-success-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Resolved</span>
          </div>
          <p className="text-2xl font-bold text-success-600 dark:text-success-400">{stats.resolved}</p>
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <EmptyState icon={Bell} title="No alerts found" message="No alerts match your current filters." />
          </Card>
        ) : (
          filtered.map((alert) => {
            const config = SEVERITY_CONFIG[alert.severity];
            const Icon = config.icon;
            return (
              <Card key={alert.id} className={`p-4 ${config.border} border-l-4`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${config.text}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant={alert.severity === 'critical' ? 'critical' : alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : alert.severity === 'low' ? 'info' : 'neutral'}>
                        {alert.severity}
                      </Badge>
                      <Badge variant="neutral">{ALERT_TYPE_LABELS[alert.alert_type]}</Badge>
                      <Badge variant={alert.status === 'active' ? 'error' : alert.status === 'acknowledged' ? 'warning' : 'success'}>
                        {alert.status}
                      </Badge>
                    </div>

                    <p className="text-sm text-slate-900 dark:text-slate-100 font-medium mb-2">{alert.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(alert.created_at)}
                      </span>
                      {alert.floor && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {alert.floor}
                        </span>
                      )}
                      {alert.sensor_id && (
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3.5 h-3.5" />
                          {alert.sensor_id}
                        </span>
                      )}
                      {alert.resolved_at && (
                        <span className="flex items-center gap-1 text-success-600 dark:text-success-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resolved {formatTime(alert.resolved_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  {alert.status === 'active' && perms?.canResolveAlerts && (
                    <button
                      onClick={() => resolveAlert(alert)}
                      disabled={resolving === alert.id}
                      className="btn-secondary text-sm flex-shrink-0"
                    >
                      {resolving === alert.id ? <LoadingSpinner size="sm" /> : <Check className="w-4 h-4" />}
                      Resolve
                    </button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function FilterDropdown({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="btn-secondary text-sm">
        <Filter className="w-3.5 h-3.5" />
        {current?.label || label}
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
                {opt.value === value && <Check className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
