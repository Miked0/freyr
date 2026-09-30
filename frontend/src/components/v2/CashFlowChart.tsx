import { useMemo } from 'react';
import { useExpenses } from '@/store/expenses';
import { formatCurrency, totalsByMonth } from '@/lib/finance';

// Plot geometry in viewBox units; the SVG scales uniformly so text is never stretched.
const WIDTH = 400;
const HEIGHT = 300;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 256;
const PLOT_LEFT = 8;
const PLOT_RIGHT = 336;
const GRID_LINES = 4;

// Theme tokens, so the chart follows the palette (and the dark theme) instead of fixed colours.
const ACCENT = 'var(--color-brand-primary)';
const LINE = 'var(--color-line)';
const MUTED = 'var(--color-ink-muted)';
const SURFACE = 'var(--color-surface)';

const compactCurrency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });

export function CashFlowChart() {
  const { expenses } = useExpenses();
  const months = useMemo(() => totalsByMonth(expenses), [expenses]);

  if (months.length === 0) {
    return <p className="text-ink-muted text-center py-8">A evolução mês a mês aparece aqui depois do primeiro extrato.</p>;
  }

  const maxVal = Math.max(...months.map(m => m.total));
  const scale = maxVal > 0 ? maxVal : 1;
  const xAt = (i: number) =>
    months.length === 1 ? (PLOT_LEFT + PLOT_RIGHT) / 2 : PLOT_LEFT + ((PLOT_RIGHT - PLOT_LEFT) * i) / (months.length - 1);
  const yAt = (value: number) => PLOT_BOTTOM - ((PLOT_BOTTOM - PLOT_TOP) * value) / scale;
  const points = months.map((m, i) => [xAt(i), yAt(m.total)] as const);
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  const area = `${line} L${points[points.length - 1][0]} ${PLOT_BOTTOM} L${points[0][0]} ${PLOT_BOTTOM} Z`;

  return (
    <div>
      {months.length < 2 && <p className="text-ink-muted mb-4">Envie extratos de mais de um mês para ver a evolução.</p>}
      {/* The sr-only table below carries the data for screen readers. */}
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" aria-hidden="true">
        <defs>
          <linearGradient id="cashflow-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.15" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </linearGradient>
        </defs>

        <g>
          {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
            const y = PLOT_TOP + ((PLOT_BOTTOM - PLOT_TOP) * i) / GRID_LINES;
            return (
              <g key={i}>
                <line x1={PLOT_LEFT} y1={y} x2={PLOT_RIGHT} y2={y} stroke={LINE} strokeWidth={1} />
                <text x={WIDTH - 4} y={y} fill={MUTED} fontSize={12} textAnchor="end" dominantBaseline="middle" className="num">
                  {compactCurrency.format(maxVal * (1 - i / GRID_LINES))}
                </text>
              </g>
            );
          })}

          {months.map((m, i) => (
            // Edge labels anchor inward so they are not clipped by the viewBox.
            <text
              key={m.key}
              x={xAt(i)}
              y={PLOT_BOTTOM + 24}
              fill={MUTED}
              fontSize={12}
              textAnchor={months.length === 1 ? 'middle' : i === 0 ? 'start' : i === months.length - 1 ? 'end' : 'middle'}
            >
              {m.label}
            </text>
          ))}

          {months.length > 1 && <path d={area} fill="url(#cashflow-area)" />}
          {months.length > 1 && <path d={line} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" />}
          {points.map(([x, y], i) => (
            <circle key={months[i].key} cx={x} cy={y} r={4} fill={ACCENT} stroke={SURFACE} strokeWidth={2} />
          ))}
        </g>
      </svg>

      <table className="sr-only">
        <caption>Gastos por mês</caption>
        <thead>
          <tr><th scope="col">Mês</th><th scope="col">Gastos</th></tr>
        </thead>
        <tbody>
          {months.map(m => (
            <tr key={m.key}><td>{m.label}</td><td>{formatCurrency(m.total)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CashFlowChart;
