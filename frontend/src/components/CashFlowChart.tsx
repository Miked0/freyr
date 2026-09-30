import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useExpenses } from '@/store/expenses';
import { formatCurrency, totalsByMonth } from '@/lib/finance';

const SUCCESS = '#0F8E46';
const HAIRLINE = 'rgba(30,28,26,0.12)';
const MUTED = 'rgba(30,28,26,0.58)';

const compactCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1
});

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value?: number; name?: string; color?: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-text text-surface rounded-xl px-3.5 py-2.5 text-sm shadow-lg">
      <p className="text-on-text-muted text-xs">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-medium num text-base flex items-center gap-2" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full" />
          {p.name}: {formatCurrency(p.value ?? 0)}
        </p>
      ))}
    </div>
  );
};

export default function CashFlowChart() {
  const { expenses } = useExpenses();
  const months = useMemo(() => totalsByMonth(expenses), [expenses]);

  if (months.length === 0) {
    return <p className="text-ink-muted">O fluxo de caixa aparece aqui depois do primeiro extrato.</p>;
  }

  const recent = months.slice(-6).reverse();

  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <div>
        {months.length < 2 && <p className="text-ink-muted mb-4">Envie extratos de mais de um mês para ver a evolução.</p>}
        <div className="h-[280px] sm:h-[320px]" role="img" aria-label="Gráfico de fluxo de caixa mensal (receitas vs despesas)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={HAIRLINE} vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: HAIRLINE }} tick={{ fontSize: 13, fill: MUTED }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 13, fill: MUTED }}
                tickFormatter={v => compactCurrency.format(v)}
                width={76}
                domain={[0, 'auto']}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: HAIRLINE }} />
              <Legend />
              <Bar
                dataKey="income"
                name="Receitas"
                fill={SUCCESS}
                radius={[4, 4, 0, 0]}
              >
                {months.map((_, i) => <Cell key={i} fill={SUCCESS} />)}
              </Bar>
              <Bar
                dataKey="expense"
                name="Despesas"
                fill="#E53935"
                radius={[4, 4, 0, 0]}
              >
                {months.map((_, i) => <Cell key={i} fill="#E53935" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: SUCCESS }} />
            Receitas
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#E53935' }} />
            Despesas
          </span>
        </div>
      </div>

      <ol className="divide-y divide-line border-y border-line self-start">
        {recent.map((month, index) => {
          const previous = recent[index + 1];
          const incomeChange = previous
            ? ((month.income - previous.income) / Math.max(previous.income, 1)) * 100
            : undefined;
          const expenseChange = previous
            ? ((month.expense - previous.expense) / Math.max(previous.expense, 1)) * 100
            : undefined;
          const balanceChange = previous
            ? ((month.balance - previous.balance) / Math.max(Math.abs(previous.balance), 1)) * 100
            : undefined;

          return (
            <li key={month.key} className="flex items-baseline justify-between gap-4 py-4">
              <div>
                <p className="text-lg font-medium tracking-[-0.02em]">{month.label}</p>
                <p className="text-sm text-ink-muted">{month.count} {month.count === 1 ? 'transação' : 'transações'}</p>
              </div>
              <div className="text-right space-y-1">
                <div className="flex items-baseline justify-end gap-2">
                  <span className="text-positive font-medium num">{formatCurrency(month.income)}</span>
                  {incomeChange !== undefined && (
                    <span className={`text-xs num ${incomeChange > 0 ? 'text-positive' : incomeChange < 0 ? 'text-alert' : 'text-ink-muted'}`}>
                      {incomeChange > 0 ? '+' : ''}{incomeChange.toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-end gap-2">
                  <span className="text-alert font-medium num">{formatCurrency(month.expense)}</span>
                  {expenseChange !== undefined && (
                    <span className={`text-xs num ${expenseChange > 0 ? 'text-alert' : expenseChange < 0 ? 'text-positive' : 'text-ink-muted'}`}>
                      {expenseChange > 0 ? '+' : ''}{expenseChange.toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-end gap-2 border-t border-line pt-1">
                  <span className={`font-medium num ${month.balance >= 0 ? 'text-positive' : 'text-alert'}`}>
                    {formatCurrency(month.balance)}
                  </span>
                  {balanceChange !== undefined && (
                    <span className={`text-xs num ${balanceChange > 0 ? 'text-positive' : balanceChange < 0 ? 'text-alert' : 'text-ink-muted'}`}>
                      {balanceChange > 0 ? '+' : ''}{balanceChange.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}