import { useMemo } from 'react';
import { LogOut, ChevronRight } from 'lucide-react';
import PillButton from '@/components/ui/PillButton';
import { useExpenses } from '@/store/expenses';
import { formatChange, formatCurrency, percentChange, totalsByCategory, totalsByMonth } from '@/lib/finance';
import type { HealthState } from '@/lib/useHealth';
import { Logo, StatusDot } from '@/components/Hero';

const SECTIONS = [['#extrato', 'Extrato'], ['#categorias', 'Categorias'], ['#meses', 'Meses'], ['#transacoes', 'Transações']] as const;

export function BentoHero({ health, onLogout }: { health: HealthState; onLogout?: () => void }) {
  const { expenses, status } = useExpenses();

  const summary = useMemo(() => {
    const months = totalsByMonth(expenses);
    const last = months[months.length - 1];
    const previous = months[months.length - 2];
    return {
      last,
      previous,
      change: last && previous ? percentChange(last.total, previous.total) : undefined,
      spent: months.reduce((sum, m) => sum + m.total, 0),
      top: totalsByCategory(expenses)[0],
    };
  }, [expenses]);

  const { last, previous, change, spent, top } = summary;
  const direction = change === undefined ? undefined : Math.round(change) > 0 ? 'mais' : Math.round(change) < 0 ? 'menos' : 'o mesmo';
  const hasData = expenses.length > 0;

  return (
    <header className="on-text bg-text text-surface">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
          <a href="#" className="!text-surface !opacity-100" aria-label="Freyr, início">
            <Logo className="text-[34px]" />
          </a>
          <nav aria-label="Seções" className="order-last w-full sm:order-none sm:w-auto">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {SECTIONS.map(([href, label]) => (
                <li key={href}><a href={href} className="!text-on-text-muted hover:!text-surface">{label}</a></li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-4">
            <StatusDot health={health} />
            {onLogout && (
              <button onClick={onLogout} className="inline-flex items-center gap-1.5 text-sm text-on-text-muted hover:text-surface cursor-pointer" title="Sair">
                <LogOut className="h-4 w-4" /> Sair
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12 pt-12 sm:pt-20 pb-12 sm:pb-16">
          <div className="lg:col-span-7 lg:col-start-1">
            <h1 className="display text-[56px] sm:text-[88px] lg:text-[104px]">
              {status !== 'ready' || !hasData ? (
                <>Para onde vai o seu <span className="keyword">dinheiro</span>?</>
              ) : last && direction ? (
                <>Você gastou <span className="keyword">{direction}</span> em {last.label}.</>
              ) : (
                <>Seus gastos de <span className="keyword">{last?.label}</span>.</>
              )}
            </h1>

            {hasData && last ? (
              <div className="mt-8 lg:mt-12 lg:pb-3">
                <p className="text-sm text-on-text-muted mb-2">Gastos de {last.label}</p>
                <p className="display text-[48px] sm:text-[64px] num">{formatCurrency(last.total)}</p>
                <p className="mt-4 text-lg leading-snug font-serif italic text-on-text-muted">
                  {change !== undefined && previous ? (
                    <>
                      <span className="marker num">{formatChange(change)}</span> em relação a {previous.label}.
                    </>
                  ) : 'Envie o extrato de outro mês para comparar.'}
                  {top && <> Maior peso: <span className="font-medium">{top.category}</span>.</>}
                </p>
              </div>
            ) : (
              <p className="mt-8 text-lg text-on-text-muted leading-snug lg:pb-3 max-w-md">
                Envie um extrato bancário ou fatura de cartão. O Freyr organiza cada gasto por categoria, sem planilhas.
              </p>
            )}
          </div>

          <div className="lg:col-span-5 lg:col-start-8 relative">
            <div className="relative h-full min-h-[280px] sm:min-h-[320px] bg-on-text-line/50 rounded-2xl p-6 sm:p-8 flex flex-col justify-end">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <PillButton tone="light" onClick={() => document.getElementById('extrato')?.scrollIntoView({ behavior: 'smooth' })}>
                  Enviar extrato
                </PillButton>
                {hasData && (
                  <PillButton tone="light" onClick={() => document.getElementById('transacoes')?.scrollIntoView({ behavior: 'smooth' })} icon={<ChevronRight className="h-4 w-4" />}>
                    Ver {expenses.length} transações
                  </PillButton>
                )}
              </div>
              {hasData && (
                <div className="text-right">
                  <p className="text-sm text-on-text-muted mb-1">Gastos registrados</p>
                  <p className="display text-[36px] sm:text-[48px] num">{formatCurrency(spent)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default BentoHero;