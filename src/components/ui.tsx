import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

export function Card({ children, className = '', hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return <div className={`card ${hover ? 'card-hover' : ''} ${className}`}>{children}</div>;
}

export function CardHeader({ icon: Icon, title, subtitle, action }: { icon?: LucideIcon; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between p-5 pb-3">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
        )}
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, variant = 'neutral', className = '' }: { children: ReactNode; variant?: 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'critical'; className?: string }) {
  const variants = {
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    success: 'bg-success-100 text-success-700 dark:bg-success-950 dark:text-success-400',
    warning: 'bg-warning-100 text-warning-700 dark:bg-warning-950 dark:text-warning-400',
    error: 'bg-error-100 text-error-700 dark:bg-error-950 dark:text-error-400',
    info: 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300',
    critical: 'bg-error-100 text-error-700 dark:bg-error-950 dark:text-error-400 ring-1 ring-error-200 dark:ring-error-900',
  };
  return <span className={`badge ${variants[variant]} ${className}`}>{children}</span>;
}

export function StatusDot({ status }: { status: 'online' | 'offline' | 'degraded' | 'healthy' | 'warning' | 'critical' }) {
  const colors: Record<string, string> = {
    online: 'bg-success-500',
    healthy: 'bg-success-500',
    offline: 'bg-error-500',
    degraded: 'bg-warning-500',
    warning: 'bg-warning-500',
    critical: 'bg-error-500',
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      {(status === 'online' || status === 'healthy') && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-60" />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors[status] || 'bg-slate-400'}`} />
    </span>
  );
}

export function ProgressBar({ value, max = 100, color = 'primary' }: { value: number; max?: number; color?: 'primary' | 'success' | 'warning' | 'error' | 'cyan' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const colors: Record<string, string> = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    cyan: 'bg-cyan-500',
  };
  return (
    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${colors[color]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, unit, trend, color = 'primary' }: { icon: LucideIcon; label: string; value: string | number; unit?: string; trend?: { value: string; positive: boolean }; color?: 'primary' | 'cyan' | 'success' | 'warning' | 'error' }) {
  const bgColors: Record<string, string> = {
    primary: 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400',
    cyan: 'bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400',
    success: 'bg-success-50 dark:bg-success-950 text-success-600 dark:text-success-400',
    warning: 'bg-warning-50 dark:bg-warning-950 text-warning-600 dark:text-warning-400',
    error: 'bg-error-50 dark:bg-error-950 text-error-600 dark:text-error-400',
  };
  return (
    <Card hover className="p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bgColors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trend.positive ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'}`}>
            {trend.value}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</span>
        {unit && <span className="text-sm text-slate-400 dark:text-slate-500">{unit}</span>}
      </div>
    </Card>
  );
}

export function EmptyState({ icon: Icon, title, message }: { icon: LucideIcon; title: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">{title}</h3>
      {message && <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">{message}</p>}
    </div>
  );
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className={`animate-spin ${sizes[size]} border-2 border-slate-200 dark:border-slate-700 border-t-primary-600 dark:border-t-primary-400 rounded-full`} />
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
