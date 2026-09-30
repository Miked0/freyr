import { useMemo } from 'react';
import { useExpenses } from '@/store/expenses';
import { formatChange, formatCurrency, totalsByMonth } from '@/lib/finance';

export function MonthList() {
  const { expenses } = useExpenses();
  const months = useMemo(() => totalsByMonth(expenses), [expenses]);

  if (months.length === 0) {
    return null;
  }

  const recent = months.slice(-6).reverse();

  return (
    <ol className="divide-y divide-hairline border-y border-hairline self-start">
      {recent.map((month, index) => {
        const previous = recent[index + 1];
        const change = previous ? ((month.total - previous.total) / previous.total) * 100 : undefined;
        return (
          <li key={month.key} className="flex items-baseline justify-between gap-4 py-4">
            <div>
              <p className="text-lg font-medium tracking-[-0.02em]">{month.label}</p>
              <p className="text-sm text-muted">{month.count} {month.count === 1 ? 'transação' : 'transações'}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-medium num">{formatCurrency(month.total)}</p>
              {change !== undefined && (
                <p className={`text-sm num ${Math.round(change) > 0 ? 'text-danger' : Math.round(change) < 0 ? 'text-success' : 'text-muted'}`}>
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