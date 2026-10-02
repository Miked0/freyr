import { useExpenses } from '@/store/expenses';
import { recentTransactions } from '@/lib/spending';
import { BentoCard } from './BentoCard';
import { TextLink } from './TextLink';
import { TransactionList } from './TransactionList';

export function RecentTransactionsCard() {
  const { expenses } = useExpenses();
  const items = recentTransactions(expenses);

  return (
    <BentoCard span={7} title="Transações recentes" action={<TextLink href="#transacoes">Ver extrato</TextLink>}>
      {items.length > 0 ? (
        <TransactionList items={items} />
      ) : (
        <p style={{ margin: 0, color: 'var(--ink-muted)' }}>Nenhum lançamento por aqui ainda. Importe um extrato para começar.</p>
      )}
    </BentoCard>
  );
}
