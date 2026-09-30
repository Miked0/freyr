import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useExpenses } from '@/store/expenses';
import { formatChange, formatCurrency, totalsByMonth } from '@/lib/finance';

const BRAND_PRIMARY = '#5B5A96';
const INK_MUTED = 'rgba(30,28,26,0.58)';
const LINE = 'rgba(30,28,26,0.12)';
const BACKGROUND = '#F7F6F3';

const compactCurrency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-text text-surface rounded-xl px-3.5 py-2.5 text-sm shadow-lg">
      <p className="text-on-text-muted text-xs">{label}</p>
      <p className="font-medium num text-base">{formatCurrency(payload[0].value ?? 0)}</p>
    </div>
  );
};

export default function MonthlyTrend() {
  const { expenses } = useExpenses();
  const months = useMemo(() => totalsByMonth(expenses), [expenses]);

  if (months.length === 0) {
    return <p className="text-ink-muted">A evolução mês a mês aparece aqui depois do primeiro extrato.</p>;
  }

  const recent = months.slice(-6).reverse();

  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <div>
        {months.length < 2 && <p className="text-ink-muted mb-4">Envie extratos de mais de um mês para ver a evolução.</p>}
        <div className="h-[280px] sm:h-[320px]" role="img" aria-label="Gráfico da evolução mensal dos gastos">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={LINE} vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: LINE }} tick={{ fontSize: 13, fill: INK_MUTED }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: INK_MUTED }} tickFormatter={v => compactCurrency.format(v)} width={76} domain={[0, 'auto']} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: LINE }} />
              <Area
                type="monotone"
                dataKey="total"
                stroke={BRAND_PRIMARY}
                strokeWidth={2}
                fill={BRAND_PRIMARY}
                fillOpacity={0.1}
                dot={{ r: 4, fill: BRAND_PRIMARY, stroke: BACKGROUND, strokeWidth: 2 }}
                activeDot={{ r: 5, stroke: BACKGROUND, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ol className="divide-y divide-line border-y border-line self-start">
        {recent.map((month, index) => {
          const previous = recent[index + 1];
          const change = previous ? ((month.total - previous.total) / previous.total) * 100 : undefined;
          return (
            <li key={month.key} className="flex items-baseline justify-between gap-4 py-4">
              <div>
                <p className="text-lg font-medium tracking-[-0.02em]">{month.label}</p>
                <p className="text-sm text-ink-muted">{month.count} {month.count === 1 ? 'transação' : 'transações'}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-medium num">{formatCurrency(month.total)}</p>
                {change !== undefined && (
                  <p className={`text-sm num ${Math.round(change) > 0 ? 'text-alert' : Math.round(change) < 0 ? 'text-positive' : 'text-ink-muted'}`}>
                    {formatChange(change)} vs. {previous!.label}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}