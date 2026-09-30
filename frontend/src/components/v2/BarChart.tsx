import { useMemo } from 'react';
import { useExpenses } from '@/store/expenses';
import { formatCurrency, totalsByCategory } from '@/lib/finance';
import { categoryColor } from '@/lib/categoryColors';

export function BarChart() {
  const { expenses } = useExpenses();
  const categories = useMemo(() => totalsByCategory(expenses), [expenses]);
  const maxShare = categories[0]?.share ?? 1;

  if (categories.length === 0) {
    return null;
  }

  return (
    <ol className="divide-y divide-hairline border-y border-hairline">
      {categories.map((item, index) => (
        <li key={item.category} className="grid grid-cols-[36px_1fr] sm:grid-cols-[48px_minmax(0,1.1fr)_minmax(0,1fr)] gap-x-4 gap-y-3 py-6 items-center">
          <span className="text-muted num text-sm sm:text-base">{String(index + 1).padStart(2, '0')}</span>
          <div className="min-w-0">
            <p className="flex items-center gap-2.5 text-[22px] sm:text-[26px] font-medium tracking-[-0.03em] leading-tight">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColor(item.category) }} aria-hidden="true" />
              {item.category.toUpperCase()}
            </p>
            <p className="mt-1.5 text-muted">
              levou <span className="marker num">{formatCurrency(item.total)}</span> em {item.count} {item.count === 1 ? 'transação' : 'transações'}
            </p>
          </div>
          <div className="col-start-2 sm:col-start-3 flex items-center gap-4">
            <div className="flex-1 h-2 rounded-full bg-hairline overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full bg-accent" style={{ width: `${(item.share / maxShare) * 100}%` }} />
            </div>
            <span className="w-16 text-right text-lg font-medium num">{((item.share) * 100).toFixed(1).replace('.', ',')}%</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default BarChart;