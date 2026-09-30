import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CashFlowMonth {
  key: string; // YYYY-MM
  label: string; // Display label like "jan/26"
  income: number;
  expense: number;
  balance: number;
}

interface CashFlowChartProps {
  months: CashFlowMonth[];
}

const BAR_HEIGHT = 36;
const BAR_GAP = 8;
const LABEL_WIDTH = 60;
const VALUE_WIDTH = 90;
const CHART_PADDING = 16;
const MIN_BAR_WIDTH = 4;
// Default width for SSR/test environments
const DEFAULT_WIDTH = 500;

export default function CashFlowChart({ months }: CashFlowChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [containerWidth, setContainerWidth] = useState(DEFAULT_WIDTH);
  const [showIncome, setShowIncome] = useState(false); // Fase 4: only expense series for now

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

  // Reverse months for display (most recent at top)
  const displayMonths = React.useMemo(() => [...months].reverse(), [months]);

  // Find max value for scaling (only expense for Fase 4)
  const maxExpense = displayMonths.length > 0
    ? Math.max(...displayMonths.map(m => m.expense), 1)
    : 1;
  const maxIncome = displayMonths.length > 0
    ? Math.max(...displayMonths.map(m => m.income), 1)
    : 1;

  const chartWidth = Math.max(1, containerWidth - LABEL_WIDTH - VALUE_WIDTH - CHART_PADDING * 2);
  const totalHeight = displayMonths.length * (BAR_HEIGHT + BAR_GAP) + CHART_PADDING * 2;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const len = displayMonths.length;
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
    [displayMonths.length]
  );

  const ariaLabel = `Gráfico de fluxo de caixa com ${displayMonths.length} meses. ${displayMonths.map(m => `${m.label}: saídas ${formatCurrency(m.expense)}${showIncome ? `, entradas ${formatCurrency(m.income)}` : ''}`).join(', ')}`;

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
        {/* Zero line */}
        <line
          x1={LABEL_WIDTH + CHART_PADDING + chartWidth}
          y1={CHART_PADDING}
          x2={LABEL_WIDTH + CHART_PADDING + chartWidth}
          y2={CHART_PADDING + displayMonths.length * (BAR_HEIGHT + BAR_GAP)}
          stroke="var(--color-text)"
          strokeWidth={1}
          opacity={0.2}
        />

        {/* Month rows */}
        {displayMonths.map((month, index) => {
          const y = CHART_PADDING + index * (BAR_HEIGHT + BAR_GAP);
          const isFocused = index === focusedIndex;

          // Expense bar (always shown, extends left from zero)
          const expenseWidth = (month.expense / maxExpense) * chartWidth;
          const expenseX = LABEL_WIDTH + CHART_PADDING + chartWidth - Math.max(expenseWidth, MIN_BAR_WIDTH);

          // Income bar (Fase 4: hidden, extends right from zero)
          const incomeWidth = (month.income / maxIncome) * chartWidth;
          const incomeX = LABEL_WIDTH + CHART_PADDING + chartWidth;

          return (
            <g key={month.key} className={isFocused ? 'filter drop-shadow-[0_0_8px_rgba(91,90,150,0.5)]' : ''}>
              {/* Month label */}
              <text
                x={LABEL_WIDTH - 8}
                y={y + BAR_HEIGHT / 2 + 5}
                fill="var(--color-text)"
                textAnchor="end"
                dominantBaseline="central"
                fontSize={12}
                fontWeight={500}
                pointerEvents="none"
              >
                {month.label}
              </text>

              {/* Zero reference line for this month */}
              <line
                x1={LABEL_WIDTH + CHART_PADDING + chartWidth}
                y1={y}
                x2={LABEL_WIDTH + CHART_PADDING + chartWidth}
                y2={y + BAR_HEIGHT}
                stroke="var(--color-line)"
                strokeWidth={1}
                opacity={0.5}
              />

              {/* Expense bar (alert color - leftward from zero) */}
              {month.expense > 0 && (
                <rect
                  x={expenseX}
                  y={y + 2}
                  width={Math.max(expenseWidth, MIN_BAR_WIDTH)}
                  height={BAR_HEIGHT - 4}
                  rx={4}
                  fill="var(--color-alert)"
                  className={`transition-all duration-300 ${isFocused ? 'opacity-80' : ''}`}
                  style={{
                    transformOrigin: 'right center',
                    transition: reducedMotion ? 'none' : 'width 400ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                />
              )}

              {/* Income bar (positive color - rightward from zero) - Fase 4: only when showIncome is true */}
              {showIncome && month.income > 0 && (
                <rect
                  x={incomeX}
                  y={y + 2}
                  width={Math.max(incomeWidth, MIN_BAR_WIDTH)}
                  height={BAR_HEIGHT - 4}
                  rx={4}
                  fill="var(--color-positive)"
                  className={`transition-all duration-300 ${isFocused ? 'opacity-80' : ''}`}
                  style={{
                    transformOrigin: 'left center',
                    transition: reducedMotion ? 'none' : 'width 400ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                />
              )}

              {/* Expense value label */}
              {month.expense > 0 && expenseWidth > 60 && (
                <text
                  x={expenseX + 8}
                  y={y + BAR_HEIGHT / 2 + 5}
                  fill="#FFFFFF"
                  textAnchor="start"
                  dominantBaseline="central"
                  fontSize={11}
                  fontWeight={600}
                  className="num"
                  pointerEvents="none"
                >
                  -{formatCurrency(month.expense)}
                </text>
              )}
              {month.expense > 0 && expenseWidth <= 60 && (
                <text
                  x={expenseX - 4}
                  y={y + BAR_HEIGHT / 2 + 5}
                  fill="var(--color-text)"
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={11}
                  fontWeight={600}
                  className="num"
                  pointerEvents="none"
                >
                  -{formatCurrency(month.expense)}
                </text>
              )}

              {/* Income value label - Fase 4 */}
              {showIncome && month.income > 0 && incomeWidth > 60 && (
                <text
                  x={incomeX + incomeWidth - 8}
                  y={y + BAR_HEIGHT / 2 + 5}
                  fill="#FFFFFF"
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={11}
                  fontWeight={600}
                  className="num"
                  pointerEvents="none"
                >
                  +{formatCurrency(month.income)}
                </text>
              )}
              {showIncome && month.income > 0 && incomeWidth <= 60 && (
                <text
                  x={incomeX + incomeWidth + 4}
                  y={y + BAR_HEIGHT / 2 + 5}
                  fill="var(--color-text)"
                  textAnchor="start"
                  dominantBaseline="central"
                  fontSize={11}
                  fontWeight={600}
                  className="num"
                  pointerEvents="none"
                >
                  +{formatCurrency(month.income)}
                </text>
              )}

              {/* Balance indicator */}
              <text
                x={containerWidth - VALUE_WIDTH + 4}
                y={y + BAR_HEIGHT / 2 + 5}
                fill={month.balance >= 0 ? 'var(--color-positive)' : 'var(--color-alert)'}
                textAnchor="start"
                dominantBaseline="central"
                fontSize={11}
                fontWeight={600}
                className="num"
                pointerEvents="none"
              >
                {month.balance >= 0 ? '+' : ''}{formatCurrency(month.balance)}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${LABEL_WIDTH + CHART_PADDING}, ${CHART_PADDING - 24})`}>
          <rect
            x={0}
            y={0}
            width={12}
            height={12}
            rx={3}
            fill="var(--color-alert)"
          />
          <text
            x={18}
            y={10}
            fill="var(--color-text)"
            fontSize={11}
            fontWeight={500}
            pointerEvents="none"
          >
            Saídas
          </text>
          {showIncome && (
            <>
              <rect
                x={70}
                y={0}
                width={12}
                height={12}
                rx={3}
                fill="var(--color-positive)"
              />
              <text
                x={88}
                y={10}
                fill="var(--color-text)"
                fontSize={11}
                fontWeight={500}
                pointerEvents="none"
              >
                Entradas
              </text>
            </>
          )}
        </g>
      </svg>

      {/* Screen-reader only table for accessibility */}
      <table className="sr-only" aria-hidden="true">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col">Entradas</th>
            <th scope="col">Saídas</th>
            <th scope="col">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {displayMonths.map((month) => (
            <tr key={month.key}>
              <td>{month.label}</td>
              <td>{showIncome ? formatCurrency(month.income) : '—'}</td>
              <td>{formatCurrency(month.expense)}</td>
              <td>{month.balance >= 0 ? '+' : ''}{formatCurrency(month.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}