import { useState } from 'react';
import { cashFlowSeries } from '@/lib/overview';
import { useExpenses } from '@/store/expenses';
import { BentoCard } from './BentoCard';
import { CashFlowChart } from './CashFlowChart';
import { SegmentedControl } from './SegmentedControl';
import { cx, money } from './format';

type View = 'monthly' | 'yearly';

const VIEWS = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
];

// The design system ships these totals as page-level CSS (.fr-cf-total), so they are rebuilt with utilities.
const totalLabel = 'text-[11px] leading-4 font-bold tracking-[1.5px] uppercase text-[color:var(--ink-muted)]';
const totalValue = 'text-2xl leading-7 font-extrabold tracking-[-0.02em] tabular-nums';

export function CashFlowCard() {
  const expenses = useExpenses(s => s.expenses);
  const [view, setView] = useState<View>('monthly');
  const data = cashFlowSeries(expenses, view);
  const income = data.reduce((sum, d) => sum + d.income, 0);
  const expense = data.reduce((sum, d) => sum + d.expense, 0);
  const net = income - expense;

  return (
    <BentoCard
      span={8}
      title="Fluxo de caixa"
      action={<SegmentedControl label="Visão do fluxo" value={view} onChange={v => setView(v as View)} options={VIEWS} />}
    >
      <div className="flex flex-wrap gap-[var(--space-6)]">
        <div className="grid gap-0.5">
          <small className={totalLabel}>Entradas</small>
          <b className={totalValue}>{money(income)}</b>
        </div>
        <div className="grid gap-0.5">
          <small className={totalLabel}>Saídas</small>
          <b className={totalValue}>{money(expense)}</b>
        </div>
        <div className="grid gap-0.5">
          <small className={totalLabel}>Sobra</small>
          <b className={cx(totalValue, net >= 0 ? 'text-[color:var(--positive)]' : 'text-[color:var(--alert)]')}>
            {money(net, true)}
          </b>
        </div>
      </div>
      {data.length ? (
        <CashFlowChart key={view} data={data} mode="all" height={370} defaultIndex={data.length - 1} />
      ) : (
        <p className="m-0 text-sm text-[color:var(--ink-muted)]">Envie um extrato e veja, mês a mês, o que entra e o que sai.</p>
      )}
    </BentoCard>
  );
}
