import { useExpenses } from '@/store/expenses';
import { topCategories } from '@/lib/spending';
import { BentoCard } from './BentoCard';
import { BarChart } from './BarChart';

export function TopCategoriesCard() {
  const { expenses } = useExpenses();
  const data = topCategories(expenses).slice(0, 5);

  return (
    <BentoCard title="Maiores gastos">
      {data.length > 0 ? (
        <BarChart data={data} label="Maiores gastos do mês" />
      ) : (
        <p style={{ margin: 0, color: 'var(--ink-muted)' }}>Nenhum gasto neste mês até agora.</p>
      )}
    </BentoCard>
  );
}
