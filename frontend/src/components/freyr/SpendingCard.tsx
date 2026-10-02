import { useExpenses } from '@/store/expenses';
import { spendingBreakdown } from '@/lib/spending';
import { BentoCard } from './BentoCard';
import { DonutChart } from './DonutChart';

export interface SpendingCardProps {
  id?: string;
}

export function SpendingCard({ id }: SpendingCardProps) {
  const { expenses } = useExpenses();
  const data = spendingBreakdown(expenses);

  return (
    <BentoCard span={5} id={id} title="Para onde foi">
      {data.length > 0 ? (
        <DonutChart data={data} centerLabel="Saídas" />
      ) : (
        <p style={{ margin: 0, color: 'var(--ink-muted)' }}>Nenhum gasto no mês ainda.</p>
      )}
    </BentoCard>
  );
}
