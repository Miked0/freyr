import { useMemo } from 'react';
import { useExpenses } from '@/store/expenses';
import { toCsv } from '@/lib/finance';
import { downloadText, todayStamp } from '@/lib/download';
import { summarizeOverview } from '@/lib/overview';
import { monthLongLabel, monthName, overviewPhrase } from '@/lib/overviewPhrase';
import type { HealthState } from '@/lib/useHealth';
import TransactionList from '@/components/v2/TransactionList';
import { AppShell } from './AppShell';
import { FreyrSideNav } from './FreyrSideNav';
import { PageHeader } from './PageHeader';
import { OverviewCards } from './OverviewCards';
import { CashFlowCard } from './CashFlowCard';
import { ImportCard } from './ImportCard';
import { TopCategoriesCard } from './TopCategoriesCard';
import { RecentTransactionsCard } from './RecentTransactionsCard';
import { SpendingCard } from './SpendingCard';
import { BentoCard } from './BentoCard';

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

export interface DashboardProps {
  health: HealthState;
  onLogout?: () => void;
}

/** The "Visão geral financeira" screen of the Freyr 2.0 design system, fed by the user's entries. */
export function Dashboard({ health, onLogout }: DashboardProps) {
  const { expenses } = useExpenses();
  const summary = useMemo(() => summarizeOverview(expenses), [expenses]);

  const phrase = summary ? overviewPhrase(summary.income, summary.expense, monthName(summary.monthKey)) : overviewPhrase(0, 0);
  const exportCsv = () => downloadText(`freyr-${todayStamp()}.csv`, '﻿' + toCsv(expenses), 'text/csv;charset=utf-8');

  return (
    <AppShell nav={<FreyrSideNav transactionCount={expenses.length} health={health} onLogout={onLogout} />}>
      <PageHeader
        phrase={phrase}
        periodLabel={summary ? monthLongLabel(summary.monthKey) : undefined}
        onExport={expenses.length > 0 ? exportCsv : undefined}
        onImport={() => scrollTo('importar')}
      />

      <div className="fr-bento">
        <OverviewCards />
        <CashFlowCard />
        <div className="fr-span-4 grid gap-6 content-start min-w-0">
          <ImportCard onComplete={() => scrollTo('transacoes')} />
          <TopCategoriesCard />
        </div>
        <RecentTransactionsCard />
        <SpendingCard id="categorias" />
        <BentoCard span={12} id="transacoes" title="Todas as transações">
          <TransactionList />
        </BentoCard>
      </div>
    </AppShell>
  );
}
