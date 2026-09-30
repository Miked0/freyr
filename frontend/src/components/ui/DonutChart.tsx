import React, { useRef, useEffect, useState, useCallback } from 'react';
import { categoryColor, readableTextOn } from '@/lib/categoryColors';

interface DonutSlice {
  category: string;
  total: number;
  share: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  size?: number;
  showLabels?: boolean;
}

const MAX_VISIBLE_SLICES = 5;
const MIN_LABEL_SHARE = 0.05;
const STROKE_WIDTH_RATIO = 0.25; // strokeWidth as fraction of radius

export default function DonutChart({ slices, size = 200, showLabels = true }: DonutChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const radius = size / 2;
  const strokeWidth = radius * STROKE_WIDTH_RATIO;
  const innerRadius = radius - strokeWidth;
  const center = radius;

  // Sort slices by total descending, take top 5, fold rest into "Outros" (joining a real Outros if present)
  const processedSlices = React.useMemo(() => {
    const grandTotal = slices.reduce((sum, s) => sum + s.total, 0);
    const sorted = [...slices].sort((a, b) => b.total - a.total);
    const visible = sorted.slice(0, MAX_VISIBLE_SLICES);
    const others = sorted.slice(MAX_VISIBLE_SLICES);
    if (others.length > 0) {
      const existing = visible.find(s => s.category === 'Outros');
      const outrosTotal = others.reduce((sum, s) => sum + s.total, 0) + (existing?.total ?? 0);
      const outros = {
        category: 'Outros',
        total: outrosTotal,
        share: outrosTotal / grandTotal,
        color: existing?.color ?? categoryColor('Outros'),
      };
      return existing ? visible.map(s => (s === existing ? outros : s)) : [...visible, outros];
    }
    return visible;
  }, [slices]);

  // Calculate path data for each slice
  const slicePaths = React.useMemo(() => {
    let currentAngle = -90; // Start at top
    return processedSlices.map((slice) => {
      const angle = slice.share * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = center + innerRadius * Math.cos(startRad);
      const y1 = center + innerRadius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(startRad);
      const y2 = center + radius * Math.sin(startRad);
      const x3 = center + radius * Math.cos(endRad);
      const y3 = center + radius * Math.sin(endRad);
      const x4 = center + innerRadius * Math.cos(endRad);
      const y4 = center + innerRadius * Math.sin(endRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      if (angle >= 359.99) {
        const ring = (r: number) => `M ${center - r} ${center} A ${r} ${r} 0 1 1 ${center + r} ${center} A ${r} ${r} 0 1 1 ${center - r} ${center} Z`;
        const midAngle = startAngle + 180;
        const labelRadius = innerRadius + (radius - innerRadius) * 0.55;
        return {
          ...slice, pathData: `${ring(radius)} ${ring(innerRadius)}`, fillRule: 'evenodd' as const, midAngle, startAngle, endAngle,
          labelX: center + labelRadius * Math.cos((midAngle * Math.PI) / 180),
          labelY: center + labelRadius * Math.sin((midAngle * Math.PI) / 180),
        };
      }

      const pathData = [
        `M ${x1} ${y1}`,
        `L ${x2} ${y2}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x3} ${y3}`,
        `L ${x4} ${y4}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}`,
        'Z',
      ].join(' ');

      const midAngle = (startAngle + endAngle) / 2;
      const labelRadius = innerRadius + (radius - innerRadius) * 0.55;
      const labelX = center + labelRadius * Math.cos((midAngle * Math.PI) / 180);
      const labelY = center + labelRadius * Math.sin((midAngle * Math.PI) / 180);

      return { ...slice, pathData, fillRule: undefined, midAngle, labelX, labelY, startAngle, endAngle };
    });
  }, [processedSlices, radius, innerRadius, center]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const len = slicePaths.length;
      if (len === 0) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % len);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + len) % len);
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(len - 1);
          break;
        case 'Escape':
          setFocusedIndex(-1);
          break;
      }
    },
    [slicePaths.length]
  );

  const totalAmount = slices.reduce((sum, s) => sum + s.total, 0);
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (processedSlices.length === 0) {
    return <p className="text-ink-muted">Nenhum gasto para mostrar ainda. As categorias aparecem aqui depois do primeiro extrato.</p>;
  }

  const percent = (share: number) => `${(share * 100).toFixed(1).replace('.', ',')}%`;
  const focused = processedSlices[focusedIndex];
  const ariaLabel = `Gráfico de rosca com ${processedSlices.length} categorias. Total: ${formatCurrency(totalAmount)}. Use as setas para percorrer as fatias. ${processedSlices.map(s => `${s.category}: ${formatCurrency(s.total)} (${(s.share * 100).toFixed(1).replace('.', ',')}%)`).join(', ')}`;

  // The legend stacks under the ring: beside it, the narrow column left no room for category names.
  return (
    <div className="flex flex-col gap-6 items-center">
      <p className="sr-only" aria-live="polite">
        {focused ? `${focused.category}: ${formatCurrency(focused.total)}, ${percent(focused.share)}` : ''}
      </p>
      <div
        role="img"
        tabIndex={0}
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        className="flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          ref={svgRef}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
        >
          {slicePaths.map((slice, index) => (
            <g key={slice.category}>
              <path
                d={slice.pathData}
                fillRule={slice.fillRule}
                fill={slice.color}
                stroke="var(--color-surface)"
                strokeWidth={2}
                className={`transition-opacity ${index === focusedIndex ? 'opacity-70' : ''}`}
              />
              {showLabels &&
                slice.share >= MIN_LABEL_SHARE &&
                slice.pathData && (
                  <text
                    x={slice.labelX}
                    y={slice.labelY}
                    fill={readableTextOn(slice.color)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={Math.max(11, size * 0.055)}
                    fontWeight={600}
                    className="num"
                    pointerEvents="none"
                  >
                    {(slice.share * 100).toFixed(1).replace('.', ',')}%
                  </text>
                )}
            </g>
          ))}
          {/* Center hole */}
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="var(--color-surface)"
          />
        </svg>
      </div>

      {/* Legend */}
      <ol className="divide-y divide-line border-y border-line flex-1 min-w-0 w-full" role="list" aria-label="Legenda das categorias">
        {processedSlices.map((slice, index) => (
          <li
            key={slice.category}
            className={`grid grid-cols-[24px_1fr_auto] gap-x-3 gap-y-2 py-3 items-center ${
              index === focusedIndex ? 'bg-surface-wash rounded-lg -ml-2 pl-2 pr-2' : ''
            }`}
            role="listitem"
            aria-current={index === focusedIndex ? 'true' : undefined}
          >
            <span
              className="w-5 h-5 rounded-full flex-shrink-0"
              style={{ backgroundColor: slice.color }}
              aria-hidden="true"
            />
            <span className="truncate font-medium text-sm">{slice.category}</span>
            <span className="text-right text-sm font-medium num whitespace-nowrap">
              {formatCurrency(slice.total)}
              {' '}
              <span className="text-ink-muted font-normal">({(slice.share * 100).toFixed(1).replace('.', ',')}%)</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}