import { useExpenses } from '@/store/expenses';
import TransactionList from '@/components/v2/TransactionList';
import { PageHeader } from '../PageHeader';
import { BentoCard } from '../BentoCard';
import { csvExporter } from './exportCsv';
import { RepeatedImportsCard } from './RepeatedImportsCard';

export function TransactionsPage() {
  const { expenses } = useExpenses();
  return (
    <>
      <PageHeader page="Transações" title="Todas as transações" phrase="Cada lançamento, do jeito que entrou." onExport={csvExporter(expenses)} />
      <div className="fr-bento">
        <RepeatedImportsCard />
        <BentoCard span={12}>
          <TransactionList />
        </BentoCard>
      </div>
    </>
  );
}
