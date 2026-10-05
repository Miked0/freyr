import { summarizeLast30Days, summarizeOverview } from '@/lib/overview';
import { monthLongLabel } from '@/lib/overviewPhrase';
import { useExpenses } from '@/store/expenses';
import { SummaryCard } from './SummaryCard';
import { money } from './format';

/** Period key of the default view: the 30 days ending today. */
export const LAST_30_DAYS = '30d';

const dayMonth = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

/** Totals and card sublabel for a period: the last 30 days by default, or a "YYYY-MM" month. */
export function periodSummary(expenses: Parameters<typeof summarizeOverview>[0], period: string = LAST_30_DAYS) {
  if (period === LAST_30_DAYS) {
    const s = summarizeLast30Days(expenses);
    return s && { ...s, sublabel: s.endsToday ? 'Últimos 30 dias' : `30 dias até ${dayMonth(s.end)}` };
  }
  const s = summarizeOverview(expenses, period);
  return s && { ...s, sublabel: monthLongLabel(s.monthKey) };
}

/** The three summary cards for `period`, as a fragment so they sit directly in the dashboard's `.fr-bento` grid. */
export function OverviewCards({ period }: { period?: string }) {
  const expenses = useExpenses(s => s.expenses);
  const summary = periodSummary(expenses, period);
  const sublabel = summary?.sublabel ?? 'Últimos 30 dias';

  return (
    <>
      <SummaryCard span={4} variant="hero" icon="balance" label="Saldo total" sublabel="Desde o primeiro extrato"
        value={summary?.balance ?? 0} delta={summary?.balanceDelta}
        note={summary?.invested ? `${money(summary.invested)} investidos` : undefined}
        actionLabel="Ver transações" href="#transacoes" />
      <SummaryCard span={4} icon="income" label="Entradas" sublabel={sublabel}
        value={summary?.income ?? 0} delta={summary?.incomeDelta} actionLabel="Ver entradas" href="#transacoes" />
      <SummaryCard span={4} icon="expense" label="Saídas" sublabel={sublabel} invert
        value={summary?.expense ?? 0} delta={summary?.expenseDelta} actionLabel="Ver saídas" href="#transacoes" />
    </>
  );
}
