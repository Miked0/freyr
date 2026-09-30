import React from 'react';

interface MetricProps {
  value: number;
  label: string;
  change?: number;
  trend?: 'up' | 'down';
}

const formatValue = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const Metric: React.FC<MetricProps> = ({ value, label, change, trend }) => {
  const hasChange = change !== undefined && change !== 0;
  const isPositive = hasChange && change > 0;
  const isNegative = hasChange && change < 0;
  const trendValue = hasChange ? (trend ?? (isPositive ? 'up' : isNegative ? 'down' : undefined)) : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-3">
        <span className={`
          display font-medium tracking-[-0.04em] leading-[0.95] num
          ${trendValue === 'up' ? 'text-positive' : trendValue === 'down' ? 'text-alert' : 'text-text'}
        `}>
          {value >= 0 ? '+' : ''}{formatValue(value)}
        </span>
        {hasChange && (
          <span
            className={`
              inline-flex items-center gap-1 text-sm font-medium num
              ${trendValue === 'up' ? 'text-positive' : 'text-alert'}
            `}
            aria-label={trendValue === 'up' ? `Aumento de ${Math.abs(change!).toFixed(2)}%` : `Queda de ${Math.abs(change!).toFixed(2)}%`}
          >
            <svg
              className="h-3.5 w-3.5 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {trendValue === 'up' ? (
                <path d="M18 15l-6-6-6 6" />
              ) : (
                <path d="M6 9l6 6 6-6" />
              )}
            </svg>
            {Math.abs(change!).toFixed(2)}%
          </span>
        )}
      </div>
      <span className="text-sm text-ink-muted">{label}</span>
    </div>
  );
};

export default Metric;