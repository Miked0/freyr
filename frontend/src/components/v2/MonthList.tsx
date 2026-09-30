import { useMemo } from 'react';
import { useExpenses } from '@/store/expenses';
import { formatChange, formatCurrency, percentChange, totalsByMonth } from '@/lib/finance';

export function MonthList() {
  const { expenses } = useExpenses();
  const months = useMemo(() => totalsByMonth(expenses), [expenses]);

  if (months.length === 0) {
    return null;
  }

  const recent = months.slice(-6).reverse();

  return (
    <ol className="divide-y divide-line border-y border-line self-start">
      {recent.map((month, index) => {
        const previous = recent[index + 1];
        const change = previous ? percentChange(month.total, previous.total) : undefined;
        return (
          <li key={month.key} className="flex items-baseline justify-between gap-4 py-4">
            <div>
              <p className="text-lg font-medium tracking-[-0.02em]">{month.label}</p>
              <p className="text-sm text-ink-muted">{month.count} {month.count === 1 ? 'gasto' : 'gastos'}</p>
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
  );
}

export default MonthList;