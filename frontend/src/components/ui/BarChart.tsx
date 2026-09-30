import React, { useRef, useEffect, useState, useCallback } from 'react';

interface BarChartData {
  category: string;
  total: number;
  share: number;
  color: string;
}

interface BarChartProps {
  data: BarChartData[];
  maxItems?: number;
}

const DEFAULT_MAX_ITEMS = 10;
const BAR_HEIGHT = 28;
const BAR_GAP = 8;
const LABEL_WIDTH = 140;
const VALUE_WIDTH = 100;
const CHART_PADDING = 16;
// Default width for SSR/test environments
const DEFAULT_WIDTH = 500;

export default function BarChart({ data, maxItems = DEFAULT_MAX_ITEMS }: BarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [containerWidth, setContainerWidth] = useState(DEFAULT_WIDTH);

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Measure container width - only in browser
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const updateWidth = () => {
      if (svgRef.current?.parentElement) {
        setContainerWidth(svgRef.current.parentElement.clientWidth || DEFAULT_WIDTH);
      }
    };
    updateWidth();
    
    // Use requestAnimationFrame to avoid layout thrashing
    let rafId: number;
    const ro = new ResizeObserver(() => {
      rafId = requestAnimationFrame(updateWidth);
    });
    if (svgRef.current?.parentElement) ro.observe(svgRef.current.parentElement);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Sort and limit data
  const processedData = React.useMemo(() => {
    return [...data].sort((a, b) => b.total - a.total).slice(0, maxItems);
  }, [data, maxItems]);

  const maxValue = processedData.length > 0 ? Math.max(...processedData.map(d => d.total)) : 1;
  const chartWidth = Math.max(1, containerWidth - LABEL_WIDTH - VALUE_WIDTH - CHART_PADDING * 2);
  const totalHeight = processedData.length * (BAR_HEIGHT + BAR_GAP) + CHART_PADDING * 2;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const len = processedData.length;
      if (len === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, len - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
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
    [processedData.length]
  );

  const ariaLabel = `Gráfico de barras horizontais com ${processedData.length} categorias. ${processedData.map(d => `${d.category}: ${formatCurrency(d.total)}`).join(', ')}`;

  return (
    <div
      role="img"
      tabIndex={0}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className="w-full"
      style={{ minWidth: 320 }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height={totalHeight}
        viewBox={`0 0 ${containerWidth} ${totalHeight}`}
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        {/* Y-axis grid lines (subtle) */}
        {processedData.map((_, index) => (
          <line
            key={`grid-${index}`}
            x1={LABEL_WIDTH + CHART_PADDING}
            y1={CHART_PADDING + index * (BAR_HEIGHT + BAR_GAP) + BAR_HEIGHT / 2}
            x2={containerWidth - VALUE_WIDTH - CHART_PADDING}
            y2={CHART_PADDING + index * (BAR_HEIGHT + BAR_GAP) + BAR_HEIGHT / 2}
            stroke="var(--color-line)"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        ))}

        {/* Bars */}
        {processedData.map((item, index) => {
          const barWidth = (item.total / maxValue) * chartWidth;
          const y = CHART_PADDING + index * (BAR_HEIGHT + BAR_GAP);
          const isMax = index === 0 && processedData.length > 0;
          const isFocused = index === focusedIndex;

          return (
            <g key={item.category} className={isFocused ? 'filter drop-shadow-[0_0_8px_rgba(91,90,150,0.5)]' : ''}>
              {/* Background track */}
              <rect
                x={LABEL_WIDTH + CHART_PADDING}
                y={y}
                width={chartWidth}
                height={BAR_HEIGHT}
                rx={BAR_HEIGHT / 2}
                fill="var(--color-line)"
                opacity={0.3}
              />
              {/* Bar */}
              <rect
                x={LABEL_WIDTH + CHART_PADDING}
                y={y}
                width={Math.max(barWidth, isMax ? 4 : 0)}
                height={BAR_HEIGHT}
                rx={BAR_HEIGHT / 2}
                fill={item.color}
                className={`transition-all duration-300 ${isMax ? 'ring-2 ring-alert ring-offset-2 ring-offset-surface' : ''} ${isFocused ? 'opacity-80' : ''}`}
                style={{
                  transition: reducedMotion ? 'none' : 'width 400ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
              {/* Value label inside bar (if fits) or after bar */}
              {barWidth > 80 && (
                <text
                  x={LABEL_WIDTH + CHART_PADDING + barWidth - 12}
                  y={y + BAR_HEIGHT / 2 + 5}
                  fill={readableTextOn(item.color)}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={12}
                  fontWeight={600}
                  className="num"
                  pointerEvents="none"
                >
                  {formatCurrency(item.total)}
                </text>
              )}
              {/* Value label after bar if doesn't fit inside */}
              {barWidth <= 80 && (
                <text
                  x={LABEL_WIDTH + CHART_PADDING + chartWidth + 8}
                  y={y + BAR_HEIGHT / 2 + 5}
                  fill="var(--color-text)"
                  textAnchor="start"
                  dominantBaseline="central"
                  fontSize={12}
                  fontWeight={600}
                  className="num"
                  pointerEvents="none"
                >
                  {formatCurrency(item.total)}
                </text>
              )}
            </g>
          );
        })}

        {/* Category labels */}
        {processedData.map((item, index) => (
          <text
            key={`label-${item.category}`}
            x={LABEL_WIDTH - 12}
            y={CHART_PADDING + index * (BAR_HEIGHT + BAR_GAP) + BAR_HEIGHT / 2 + 5}
            fill="var(--color-text)"
            textAnchor="end"
            dominantBaseline="central"
            fontSize={13}
            fontWeight={500}
            className="truncate"
            pointerEvents="none"
          >
            {item.category}
          </text>
        ))}
      </svg>

      {/* Screen-reader only table for accessibility */}
      <table className="sr-only" aria-hidden="true">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Categoria</th>
            <th scope="col">Valor</th>
            <th scope="col">Participação</th>
          </tr>
        </thead>
        <tbody>
          {processedData.map((item) => (
            <tr key={item.category}>
              <td>{item.category}</td>
              <td>{formatCurrency(item.total)}</td>
              <td>{(item.share * 100).toFixed(1).replace('.', ',')}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Helper function for text contrast
function readableTextOn(background: string): string {
  const hex = background.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const luminance = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const bg = 0.2126 * luminance(r) + 0.7152 * luminance(g) + 0.0722 * luminance(b);

  const withWhite = (1 + 0.05) / (bg + 0.05);
  const withInk = (bg + 0.05) / (0.0722 + 0.05); // INK luminance approx

  return withWhite >= withInk ? '#FFFFFF' : '#1E1C1A';
}