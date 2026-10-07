import { useMemo, useState } from 'react';
import { useExpenses } from '@/store/expenses';
import { totalsByMonth } from '@/lib/finance';
import { last30Phrase, monthLongLabel, monthName, overviewPhrase } from '@/lib/overviewPhrase';
import { PageHeader } from '../PageHeader';
import { LAST_30_DAYS, OverviewCards, periodSummary } from '../OverviewCards';
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

/** The "Seu dinheiro hoje" screen of the Freyr 2.0 design system, fed by the user's entries. */
export function OverviewPage({ onImported }: OverviewPageProps) {
  const { expenses } = useExpenses();
  // The last 30 days, then the months with entries, newest first; the cards follow the one picked in the header.
  const periods = useMemo(
    () => [
      { key: LAST_30_DAYS, label: 'Últimos 30 dias' },
      ...totalsByMonth(expenses).reverse().map(m => ({ key: m.key, label: monthLongLabel(m.key) })),
    ],
    [expenses],
  );
  const [picked, setPicked] = useState(LAST_30_DAYS);
  const period = periods.some(p => p.key === picked) ? picked : LAST_30_DAYS;
  const summary = useMemo(() => periodSummary(expenses, period), [expenses, period]);
  const phrase = !summary
    ? overviewPhrase(0, 0)
    : 'monthKey' in summary
      ? overviewPhrase(summary.income, summary.expense, monthName(summary.monthKey))
      : last30Phrase(summary.income, summary.expense);

  return (
    <>
      <PageHeader
        page="Visão geral"
        title="Seu dinheiro hoje"
        phrase={phrase}
        periodLabel={summary ? periods.find(p => p.key === period)?.label : undefined}
        period={period}
        periods={periods}
        onPeriodChange={setPicked}
        onExport={csvExporter(expenses)}
      />
      <div className="fr-bento">
        <OverviewCards period={period} />
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
