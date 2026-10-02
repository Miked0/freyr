import { useMemo } from 'react';
import { useExpenses } from '@/store/expenses';
import { summarizeOverview } from '@/lib/overview';
import { monthLongLabel, monthName, overviewPhrase } from '@/lib/overviewPhrase';
import { PageHeader } from '../PageHeader';
import { OverviewCards } from '../OverviewCards';
import { CashFlowCard } from '../CashFlowCard';
import { ImportCard } from '../ImportCard';
import { GoalsCard } from '../GoalsCard';
import { RecentTransactionsCard } from '../RecentTransactionsCard';
import { SpendingCard } from '../SpendingCard';
import { csvExporter } from './exportCsv';

export interface OverviewPageProps {
  /** Called after a statement is imported with at least one entry. */
  onImported?: () => void;
}

/** The "Visão geral financeira" screen of the Freyr 2.0 design system, fed by the user's entries. */
export function OverviewPage({ onImported }: OverviewPageProps) {
  const { expenses } = useExpenses();
  const summary = useMemo(() => summarizeOverview(expenses), [expenses]);
  const phrase = summary ? overviewPhrase(summary.income, summary.expense, monthName(summary.monthKey)) : overviewPhrase(0, 0);

  return (
    <>
      <PageHeader
        page="Visão geral"
        title="Visão geral financeira"
        phrase={phrase}
        periodLabel={summary ? monthLongLabel(summary.monthKey) : undefined}
        onExport={csvExporter(expenses)}
      />
      <div className="fr-bento">
        <OverviewCards />
        <CashFlowCard />
        <div className="fr-span-4 grid gap-6 content-start min-w-0">
          <ImportCard onComplete={onImported} />
          <GoalsCard />
        </div>
        <RecentTransactionsCard />
        <SpendingCard />
      </div>
    </>
  );
}
