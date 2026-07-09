import { useMemo } from 'react';

interface DataPoint {
  label: string;
  value: number;
  [key: string]: unknown;
}

export function LineChart({ data, height = 200, color = '#3b82f6', unit = '', thresholds }: { data: DataPoint[]; height?: number; color?: string; unit?: string; thresholds?: { min?: number; max?: number } }) {
  const width = 600;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const { points, minVal, maxVal, areaPath, linePath, gridLines } = useMemo(() => {
    if (data.length === 0) return { points: [], minVal: 0, maxVal: 0, areaPath: '', linePath: '', gridLines: [] };
    const values = data.map((d) => d.value);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    if (thresholds?.min !== undefined) minVal = Math.min(minVal, thresholds.min);
    if (thresholds?.max !== undefined) maxVal = Math.max(maxVal, thresholds.max);
    const range = maxVal - minVal || 1;
    const padded = range * 0.15;
    minVal = minVal - padded;
    maxVal = maxVal + padded;

    const xStep = chartW / Math.max(1, data.length - 1);
    const points = data.map((d, i) => ({
      x: padding.left + i * xStep,
      y: padding.top + chartH - ((d.value - minVal) / (maxVal - minVal)) * chartH,
      value: d.value,
      label: d.label,
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      y: padding.top + chartH * t,
      value: maxVal - (maxVal - minVal) * t,
    }));

    return { points, minVal, maxVal, areaPath, linePath, gridLines };
  }, [data, chartW, chartH, padding.left, padding.top, thresholds]);

  if (data.length === 0) {
    return <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>No data available</div>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={padding.left} y1={g.y} x2={width - padding.right} y2={g.y} stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-slate-800" />
          <text x={padding.left - 8} y={g.y + 4} textAnchor="end" className="fill-slate-400 dark:fill-slate-500 text-[10px]">
            {g.value.toFixed(1)}
          </text>
        </g>
      ))}
      {thresholds?.min !== undefined && (
        <line
          x1={padding.left} y1={padding.top + chartH - ((thresholds.min - minVal) / (maxVal - minVal)) * chartH}
          x2={width - padding.right} y2={padding.top + chartH - ((thresholds.min - minVal) / (maxVal - minVal)) * chartH}
          stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" opacity="0.5"
        />
      )}
      {thresholds?.max !== undefined && (
        <line
          x1={padding.left} y1={padding.top + chartH - ((thresholds.max - minVal) / (maxVal - minVal)) * chartH}
          x2={width - padding.right} y2={padding.top + chartH - ((thresholds.max - minVal) / (maxVal - minVal)) * chartH}
          stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5"
        />
      )}
      <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i} className="group">
          <circle cx={p.x} cy={p.y} r="3" fill={color} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          <rect x={p.x - xStepHalf(points)} y={padding.top} width={xStepHalf(points) * 2 || 20} height={chartH} fill="transparent" />
          <text x={p.x} y={p.y - 8} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity font-medium">
            {p.value.toFixed(1)}{unit}
          </text>
        </g>
      ))}
    </svg>
  );
}

function xStepHalf(points: { x: number }[]): number {
  if (points.length < 2) return 10;
  return Math.abs(points[1].x - points[0].x) / 2;
}

export function BarChart({ data, height = 200, color = '#3b82f6', unit = '' }: { data: DataPoint[]; height?: number; color?: string; unit?: string }) {
  const width = 600;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const { bars, gridLines } = useMemo(() => {
    if (data.length === 0) return { bars: [], maxVal: 0, gridLines: [] };
    const values = data.map((d) => d.value);
    const maxVal = Math.max(...values) * 1.15 || 1;
    const barW = chartW / data.length * 0.65;
    const gap = chartW / data.length * 0.35;
    const bars = data.map((d, i) => ({
      x: padding.left + i * (barW + gap) + gap / 2,
      y: padding.top + chartH - (d.value / maxVal) * chartH,
      w: barW,
      h: (d.value / maxVal) * chartH,
      value: d.value,
      label: d.label,
    }));
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      y: padding.top + chartH * t,
      value: maxVal - maxVal * t,
    }));
    return { bars, gridLines };
  }, [data, chartW, chartH, padding.left, padding.top]);

  if (data.length === 0) {
    return <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>No data available</div>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`bar-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={padding.left} y1={g.y} x2={width - padding.right} y2={g.y} stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-slate-800" />
          <text x={padding.left - 8} y={g.y + 4} textAnchor="end" className="fill-slate-400 dark:fill-slate-500 text-[10px]">
            {g.value.toFixed(0)}
          </text>
        </g>
      ))}
      {bars.map((b, i) => (
        <g key={i} className="group">
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="4" fill={`url(#bar-${color.replace('#', '')})`} className="transition-all duration-300 group-hover:opacity-80" />
          <text x={b.x + b.w / 2} y={b.y - 5} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity font-medium">
            {b.value.toFixed(0)}{unit}
          </text>
          <text x={b.x + b.w / 2} y={height - 15} textAnchor="middle" className="fill-slate-400 dark:fill-slate-500 text-[10px]">
            {b.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function DonutChart({ data, size = 160 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = size / 2 - 20;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 24;

  let cumulative = 0;
  const segments = data.map((d) => {
    const fraction = d.value / total;
    const startAngle = (cumulative / total) * 360 - 90;
    const endAngle = ((cumulative + d.value) / total) * 360 - 90;
    cumulative += d.value;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const largeArc = fraction > 0.5 ? 1 : 0;

    return {
      path: `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      color: d.color,
      label: d.label,
      value: d.value,
      pct: (fraction * 100).toFixed(0),
    };
  });

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((s, i) => (
          <path key={i} d={s.path} fill="none" stroke={s.color} strokeWidth={strokeWidth} strokeLinecap="round" />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-slate-900 dark:fill-slate-100 text-xl font-bold">
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-slate-400 dark:fill-slate-500 text-[10px]">
          Total
        </text>
      </svg>
      <div className="space-y-2">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full" style={{ background: s.color }} />
            <span className="text-slate-600 dark:text-slate-400">{s.label}</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{s.value}</span>
            <span className="text-xs text-slate-400">({s.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AreaChart({ data, height = 200, color = '#06b6d4', unit = '%' }: { data: DataPoint[]; height?: number; color?: string; unit?: string }) {
  return <LineChart data={data} height={height} color={color} unit={unit} />;
}
