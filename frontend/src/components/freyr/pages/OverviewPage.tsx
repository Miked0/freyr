import { useMemo, useState } from 'react';
import { useExpenses } from '@/store/expenses';
import { summarizeOverview } from '@/lib/overview';
import { totalsByMonth } from '@/lib/finance';
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
  // Months with entries, newest first; the cards follow the one picked in the header (the latest by default).
  const periods = useMemo(
    () => totalsByMonth(expenses).reverse().map(m => ({ key: m.key, label: monthLongLabel(m.key) })),
    [expenses],
  );
  const [picked, setPicked] = useState<string>();
  const summary = useMemo(() => summarizeOverview(expenses, picked), [expenses, picked]);
  const phrase = summary ? overviewPhrase(summary.income, summary.expense, monthName(summary.monthKey)) : overviewPhrase(0, 0);

  return (
    <>
      <PageHeader
        page="Visão geral"
        title="Visão geral financeira"
        phrase={phrase}
        periodLabel={summary ? monthLongLabel(summary.monthKey) : undefined}
        period={summary?.monthKey}
        periods={periods}
        onPeriodChange={setPicked}
        onExport={csvExporter(expenses)}
      />
      <div className="fr-bento">
        <OverviewCards monthKey={summary?.monthKey} />
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
