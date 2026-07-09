export function WaterTank({
  level,
  capacity,
  height = 200,
  className = '',
}: {
  level: number;
  capacity: number;
  height?: number;
  className?: string;
}) {
  const percentage = Math.min((level / capacity) * 100, 100);
  const waterHeight = (percentage / 100) * (height - 20);

  const getColor = () => {
    if (percentage < 15) return 'fill-error-500';
    if (percentage < 30) return 'fill-warning-500';
    return 'fill-primary-500';
  };

  return (
    <div className={`relative ${className}`} style={{ width: 80, height }}>
      {/* Tank outline */}
      <svg viewBox="0 0 80 200" className="absolute inset-0 w-full h-full">
        {/* Tank body */}
        <rect
          x="5"
          y="10"
          width="70"
          height="180"
          rx="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-slate-300 dark:text-slate-700"
        />
        {/* Water */}
        <rect
          x="7"
          y={200 - waterHeight - 10}
          width="66"
          height={waterHeight}
          className={getColor()}
          opacity="0.7"
          rx="6"
        >
          <animate
            attributeName="y"
            values={`${200 - waterHeight - 10};${200 - waterHeight - 8};${200 - waterHeight - 10}`}
            dur="2s"
            repeatCount="indefinite"
          />
        </rect>
      </svg>

      {/* Level indicator */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{Math.round(percentage)}%</p>
      </div>
    </div>
  );
}
