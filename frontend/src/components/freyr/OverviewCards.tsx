import { summarizeLast30Days, summarizeOverview } from '@/lib/overview';
import { monthLongLabel } from '@/lib/overviewPhrase';
import { useExpenses } from '@/store/expenses';
import { useLoadedProfile } from '@/lib/useProfile';
import type { InvestedAnchor } from '@/lib/finance';
import { SummaryCard } from './SummaryCard';
import { money } from './format';

/** Period key of the default view: the 30 days ending today. */
export const LAST_30_DAYS = '30d';

const dayMonth = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

/** Totals and card sublabel for a period: the last 30 days by default, or a "YYYY-MM" month. */
export function periodSummary(
  expenses: Parameters<typeof summarizeOverview>[0],
  period: string = LAST_30_DAYS,
  told?: InvestedAnchor | null,
) {
  if (period === LAST_30_DAYS) {
    const s = summarizeLast30Days(expenses, undefined, told);
    return s && { ...s, sublabel: s.endsToday ? 'Últimos 30 dias' : `30 dias até ${dayMonth(s.end)}` };
  }
  const s = summarizeOverview(expenses, period, told);
  return s && { ...s, sublabel: monthLongLabel(s.monthKey) };
}

/** The three summary cards for `period`, as a fragment so they sit directly in the dashboard's `.fr-bento` grid. */
export function OverviewCards({ period }: { period?: string }) {
  const expenses = useExpenses(s => s.expenses);
  const profile = useLoadedProfile();
  const told = profile?.invested_balance != null && profile.invested_balance_on
    ? { amount: profile.invested_balance, on: profile.invested_balance_on }
    : null;
  const summary = periodSummary(expenses, period, told);
  const sublabel = summary?.sublabel ?? 'Últimos 30 dias';
  const income = summary?.income ?? 0;
  const expense = summary?.expense ?? 0;
  const left = income - expense;
  const available = summary?.available ?? 0;
  const invested = summary?.invested ?? 0;
  const fixed = summary?.fixedExpense ?? 0;
  const spentShare = income > 0 ? Math.round((expense / income) * 100) : undefined;

  return (
    <>
      <SummaryCard span={4} variant="hero" icon="budget" label={left < 0 ? 'Faltou' : 'Sobrou'} sublabel={sublabel}
        value={Math.abs(left)}
        meter={{
          label: spentShare === undefined ? 'Nada entrou no período' : `Saiu ${spentShare}% do que entrou`,
          // The bar is what came in; the filled part is what went out of it.
          parts: left < 0
            ? [{ label: 'Saiu', value: expense, tone: 'alert' }]
            : [{ label: 'Saiu', value: expense, tone: 'a' }, { label: 'Sobrou', value: left, tone: 'none' }],
          legend: [{ label: 'Entrou', value: income, tone: 'none' }, { label: 'Saiu', value: expense, tone: left < 0 ? 'alert' : 'a' }],
        }}
        actionLabel="Ver entradas" href="#transacoes" />
      <SummaryCard span={4} icon="balance" label="Saldo total" sublabel="Desde o primeiro extrato"
        value={available + invested} delta={summary?.balanceDelta}
        meter={{
          label: `Disponível ${money(available)}, investido ${money(invested)}`,
          parts: [
            { label: 'Disponível', value: available, tone: 'a' },
            { label: 'Investido', value: invested, tone: 'b' },
          ],
          link: told ? undefined : { label: 'Informe quanto você tem investido', href: '#/perfil' },
        }}
        actionLabel="Ver transações" href="#transacoes" />
      <SummaryCard span={4} icon="expense" label="Saídas" sublabel={sublabel} invert
        value={expense} delta={summary?.expenseDelta}
        meter={{
          label: `Fixas ${money(fixed)}, dia a dia ${money(expense - fixed)}`,
          parts: [
            { label: 'Fixas', value: fixed, tone: 'a' },
            { label: 'Dia a dia', value: expense - fixed, tone: 'b' },
          ],
        }}
        actionLabel="Ver saídas" href="#transacoes" />
    </>
  );
}
