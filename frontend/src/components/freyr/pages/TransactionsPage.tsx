import { useExpenses } from '@/store/expenses';
import TransactionList from '@/components/v2/TransactionList';
import { PageHeader } from '../PageHeader';
import { BentoCard } from '../BentoCard';
import { csvExporter } from './exportCsv';
import { RepeatedImportsCard } from './RepeatedImportsCard';
import { RecategorizeCard } from './RecategorizeCard';

export function TransactionsPage() {
  const { expenses } = useExpenses();
  return (
    <>
      <PageHeader page="Transações" title="Seu extrato" phrase="Tudo o que entrou e saiu, já organizado." onExport={csvExporter(expenses)} />
      <div className="fr-bento">
        <RepeatedImportsCard />
        <RecategorizeCard />
        <BentoCard span={12}>
          <TransactionList />
        </BentoCard>
      </div>
    </>
  );
}
