import { summarizeOverview } from '@/lib/overview';
import { useExpenses } from '@/store/expenses';
import { SummaryCard } from './SummaryCard';

/** The three summary cards for `monthKey` (the latest month by default), as a fragment so they sit directly in the dashboard's `.fr-bento` grid. */
export function OverviewCards({ monthKey }: { monthKey?: string }) {
  const expenses = useExpenses(s => s.expenses);
  const summary = summarizeOverview(expenses, monthKey);

  return (
    <>
      <SummaryCard span={4} variant="hero" icon="balance" label="Saldo total" sublabel="Desde o primeiro extrato"
        value={summary?.balance ?? 0} delta={summary?.balanceDelta} actionLabel="Ver transações" href="#transacoes" />
      <SummaryCard span={4} icon="income" label="Entradas" sublabel="Este mês"
        value={summary?.income ?? 0} delta={summary?.incomeDelta} actionLabel="Ver entradas" href="#transacoes" />
      <SummaryCard span={4} icon="expense" label="Saídas" sublabel="Este mês" invert
        value={summary?.expense ?? 0} delta={summary?.expenseDelta} actionLabel="Ver saídas" href="#transacoes" />
    </>
  );
}
