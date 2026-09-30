import { useMemo } from 'react';
import { useExpenses } from '@/store/expenses';
import { formatCurrency, totalsByMonth } from '@/lib/finance';

interface CashFlowMonth {
  key: string;
  label: string;
  expense: number;
  balance: number;
}

const CHART_HEIGHT = 280;
const MARGIN_TOP = 8;
const MARGIN_RIGHT = 8;
const MARGIN_LEFT = 0;
const MARGIN_BOTTOM = 0;

const ACCENT = '#5B5A96';
const HAIRLINE = 'rgba(30,28,26,0.12)';
const MUTED = 'rgba(30,28,26,0.58)';

const compactCurrency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink text-bg rounded-xl px-3.5 py-2.5 text-sm shadow-lg">
      <p className="text-on-ink-muted text-xs">{label}</p>
      <p className="font-medium num text-base">{formatCurrency(payload[0].value ?? 0)}</p>
    </div>
  );
};

export function CashFlowChart() {
  const { expenses } = useExpenses();
  const months = useMemo(() => totalsByMonth(expenses), [expenses]);

  if (months.length === 0) {
    return <p className="text-muted text-center py-8">A evolução mês a mês aparece aqui depois do primeiro extrato.</p>;
  }

  // Convert MonthTotal to CashFlowMonth format (expense only for now)
  const chartData = months.map(m => ({
    key: m.key,
    label: m.label,
    expense: m.total,
    balance: m.total,
  }));

  return (
    <div>
      {months.length < 2 && <p className="text-muted mb-4">Envie extratos de mais de um mês para ver a evolução.</p>}
      <div className="h-[280px] sm:h-[320px]" role="img" aria-label="Gráfico da evolução mensal dos gastos">
        <svg width="100%" height="100%" viewBox="0 0 400 280" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity="0.15" />
              <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          <g stroke={HAIRLINE} strokeWidth={1}>
            {(() => {
              const maxVal = Math.max(...chartData.map(d => d.expense));
              const lines = 4;
              return Array.from({ length: lines + 1 }, (_, i) => {
                const y = MARGIN_TOP + (CHART_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM) * i / lines;
                return <line key={i} x1={MARGIN_LEFT} y1={y} x2={400 - MARGIN_RIGHT} y2={y} />;
              });
            })()}
          </g>
          
          {/* X Axis */}
          <g stroke={HAIRLINE} strokeWidth={1}>
            {chartData.map((d, i) => {
              const x = MARGIN_LEFT + (400 - MARGIN_LEFT - MARGIN_RIGHT) * i / (chartData.length - 1 || 1);
              return (
                <g key={d.key}>
                  <line x1={x} y1={CHART_HEIGHT - MARGIN_BOTTOM} x2={x} y2={CHART_HEIGHT - MARGIN_BOTTOM + 4} />
                  <text x={x} y={CHART_HEIGHT - MARGIN_BOTTOM + 16} fill={MUTED} fontSize={12} textAnchor="middle" dominantBaseline="middle">{d.label}</text>
                </g>
              );
            })}
          </g>
          
          {/* Y Axis labels */}
          <g>
            {(() => {
              const maxVal = Math.max(...chartData.map(d => d.expense));
              const lines = 4;
              return Array.from({ length: lines + 1 }, (_, i) => {
                const val = maxVal * (1 - i / lines);
                const y = MARGIN_TOP + (CHART_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM) * i / lines;
                return (
                  <text key={i} x={400 - MARGIN_RIGHT - 4} y={y + 4} fill={MUTED} fontSize={11} textAnchor="end" dominantBaseline="middle">{compactCurrency.format(val)}</text>
                );
              });
            })()}
          </g>
          
          {/* Area chart */}
          <path
            d={(() => {
              const points = chartData.map((d, i) => {
                const x = MARGIN_LEFT + (400 - MARGIN_LEFT - MARGIN_RIGHT) * i / (chartData.length - 1 || 1);
                const maxVal = Math.max(...chartData.map(d => d.expense));
                const y = MARGIN_TOP + (CHART_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM) * (1 - d.expense / maxVal);
                return [x, y];
              });
              const areaPoints = [
                [MARGIN_LEFT, CHART_HEIGHT - MARGIN_BOTTOM],
                ...points,
                [400 - MARGIN_RIGHT, CHART_HEIGHT - MARGIN_BOTTOM]
              ];
              return areaPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ') + ' Z';
            })()}
            fill="url(#areaGradient)"
            stroke={ACCENT}
            strokeWidth={2}
            fillOpacity={1}
          />
          
          {/* Dots */}
          <g>
            {chartData.map((d, i) => {
              const x = MARGIN_LEFT + (400 - MARGIN_LEFT - MARGIN_RIGHT) * i / (chartData.length - 1 || 1);
              const maxVal = Math.max(...chartData.map(d => d.expense));
              const y = MARGIN_TOP + (CHART_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM) * (1 - d.expense / maxVal);
              return (
                <circle key={d.key} cx={x} cy={y} r={4} fill={ACCENT} stroke="#F7F6F3" strokeWidth={2} />
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

export default CashFlowChart;