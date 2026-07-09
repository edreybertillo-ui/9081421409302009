export function WaterTank({ level, capacity, remaining }: { level: number; capacity: number; remaining: number }) {
  const clampedLevel = Math.min(100, Math.max(0, level));
  const status = level < 15 ? 'critical' : level < 30 ? 'low' : 'normal';
  const colors: Record<string, { fill: string; text: string }> = {
    normal: { fill: 'from-cyan-400 to-cyan-600', text: 'text-cyan-600 dark:text-cyan-400' },
    low: { fill: 'from-warning-400 to-warning-600', text: 'text-warning-600 dark:text-warning-400' },
    critical: { fill: 'from-error-400 to-error-600', text: 'text-error-600 dark:text-error-400' },
  };
  const c = colors[status];

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-32 rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900">
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-b ${c.fill} transition-all duration-1000 ease-out`}
          style={{ height: `${clampedLevel}%` }}
        >
          <div className="absolute top-0 left-0 right-0 h-2 bg-white/30 animate-wave" />
          <div className="absolute top-1 left-0 right-0 h-1 bg-white/20 animate-wave" style={{ animationDelay: '0.5s' }} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-slate-900 dark:text-white mix-blend-luminosity drop-shadow-md">
            {clampedLevel.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Capacity:</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">{capacity.toLocaleString()} L</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Remaining:</span>
          <span className={`font-medium ${c.text}`}>{remaining.toLocaleString()} L</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Status:</span>
          <span className={`font-medium capitalize ${c.text}`}>{status}</span>
        </div>
      </div>
    </div>
  );
}
