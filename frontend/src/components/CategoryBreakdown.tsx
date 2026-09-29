import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useExpenses } from '@/store/expenses';
import { formatCurrency, totalsByCategory } from '@/lib/finance';
import { categoryColor, pieSlices, type PieSlice } from '@/lib/categoryColors';

const BACKGROUND = '#F7F6F3';

const formatPercent = (share: number) => `${(share * 100).toFixed(1).replace('.', ',')}%`;

const SliceTooltip = ({ active, payload }: { active?: boolean; payload?: { payload?: PieSlice }[] }) => {
  const slice = payload?.[0]?.payload;
  if (!active || !slice) return null;
  return (
    <div className="bg-ink text-bg rounded-xl px-3.5 py-2.5 text-sm shadow-lg">
      <p className="text-on-ink-muted text-xs">{slice.category}</p>
      <p className="font-medium num text-base">
        {formatCurrency(slice.total)} · {formatPercent(slice.share)}
      </p>
    </div>
  );
};

export default function CategoryBreakdown() {
  const { expenses } = useExpenses();
  const categories = useMemo(() => totalsByCategory(expenses), [expenses]);
  const slices = useMemo(() => pieSlices(categories), [categories]);
  const maxShare = categories[0]?.share ?? 1;

  if (categories.length === 0) {
    return <p className="text-muted">As categorias aparecem aqui depois do primeiro extrato.</p>;
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] items-start">
      <div
        className="h-[280px] sm:h-[320px] lg:sticky lg:top-24"
        role="img"
        aria-label={`Gráfico de pizza da participação de cada categoria: ${slices.map(s => `${s.category} ${formatPercent(s.share)}`).join(', ')}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="total" nameKey="category" outerRadius="92%" startAngle={90} endAngle={-270} stroke={BACKGROUND} strokeWidth={2} isAnimationActive={false}>
              {slices.map(slice => (
                <Cell key={slice.category} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip content={<SliceTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ol className="divide-y divide-hairline border-y border-hairline">
        {categories.map((item, index) => (
          <li key={item.category} className="grid grid-cols-[36px_1fr] sm:grid-cols-[48px_minmax(0,1.1fr)_minmax(0,1fr)] gap-x-4 gap-y-3 py-6 items-center">
            <span className="text-muted num text-sm sm:text-base">{String(index + 1).padStart(2, '0')}</span>
            <div className="min-w-0">
              <p className="flex items-center gap-2.5 text-[22px] sm:text-[26px] font-medium tracking-[-0.03em] leading-tight">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColor(item.category) }} aria-hidden="true" />
                {item.category}
              </p>
              <p className="mt-1.5 text-muted">
                levou <span className="marker num">{formatCurrency(item.total)}</span> em {item.count} {item.count === 1 ? 'transação' : 'transações'}
              </p>
            </div>
            <div className="col-start-2 sm:col-start-3 flex items-center gap-4">
              <div className="flex-1 h-2 rounded-full bg-hairline overflow-hidden" aria-hidden="true">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(item.share / maxShare) * 100}%` }} />
              </div>
              <span className="w-16 text-right text-lg font-medium num">{formatPercent(item.share)}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
