import { useMemo } from 'react';
import { useExpenses } from '@/store/expenses';
import { totalsByCategory, type CategoryTotal } from '@/lib/finance';
import { PageHeader } from '../PageHeader';
import { SpendingCard } from '../SpendingCard';
import { TopCategoriesCard } from '../TopCategoriesCard';
import { BentoCard } from '../BentoCard';
import { CategoryTag } from '../CategoryTag';
import { money } from '../format';

/** Every category the user has, spent ones first by total, then the unspent ones alphabetically. */
function categoryRows(categories: string[], totals: CategoryTotal[]): CategoryTotal[] {
  const spent = new Set(totals.map(t => t.category));
  const unspent = [...new Set(categories)]
    .filter(c => !spent.has(c))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map(category => ({ category, total: 0, count: 0, share: 0 }));
  return [...totals, ...unspent];
}

function entries(count: number): string {
  if (count === 0) return 'Nenhum lançamento';
  return count === 1 ? '1 lançamento' : `${count} lançamentos`;
}

export function CategoriesPage() {
  const { expenses, categories } = useExpenses();
  const rows = useMemo(() => categoryRows(categories, totalsByCategory(expenses)), [categories, expenses]);

  return (
    <>
      <PageHeader page="Categorias" title="Suas categorias" phrase="Veja para onde vai cada real." />
      <div className="fr-bento">
        <SpendingCard />
        <div className="fr-span-7 grid content-start min-w-0">
          <TopCategoriesCard />
        </div>
        <BentoCard span={12} title="Todas as categorias">
          {rows.length > 0 ? (
            <ul className="fr-tx" aria-label="Gasto por categoria">
              {rows.map(r => (
                <li key={r.category}>
                  <span className="fr-tx-name"><CategoryTag tone={r.count > 0 ? 'brand' : 'muted'}>{r.category}</CategoryTag></span>
                  <span className="fr-tx-amount">{money(r.total)}</span>
                  <span className="fr-tx-meta">{entries(r.count)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, color: 'var(--ink-muted)' }}>Nenhuma categoria por aqui ainda.</p>
          )}
        </BentoCard>
      </div>
    </>
  );
}
