import { useMemo } from 'react';
import { LogOut, ChevronRight } from 'lucide-react';
import PillButton from '@/components/ui/PillButton';
import { useExpenses } from '@/store/expenses';
import { formatChange, formatCurrency, totalsByCategory, totalsByMonth } from '@/lib/finance';
import type { HealthState } from '@/lib/useHealth';
import { Logo, StatusDot } from '@/components/Hero';

export function BentoHero({ health, onLogout }: { health: HealthState; onLogout?: () => void }) {
  const { expenses, status } = useExpenses();

  const summary = useMemo(() => {
    const months = totalsByMonth(expenses);
    const last = months[months.length - 1];
    const previous = months[months.length - 2];
    return {
      last,
      previous,
      change: last && previous ? ((last.total - previous.total) / previous.total) * 100 : undefined,
      total: expenses.reduce((sum, e) => sum + e.amount, 0),
      top: totalsByCategory(expenses)[0],
    };
  }, [expenses]);

  const { last, previous, change, total, top } = summary;
  const hasData = expenses.length > 0;

  return (
    <header className="on-ink bg-ink text-bg" role="banner">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
          <a href="#" className="!text-bg !opacity-100" aria-label="Freyr, início">
            <Logo className="text-[34px]" />
          </a>
          <div className="flex items-center gap-4">
            <StatusDot health={health} />
            {onLogout && (
              <button onClick={onLogout} className="inline-flex items-center gap-1.5 text-sm text-on-ink-muted hover:text-bg cursor-pointer" title="Sair">
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
              ) : last && previous ? (
                <>Você gastou <span className="keyword">{change! <= 0 ? 'menos' : 'mais'}</span> em {last.label}.</>
              ) : (
                <>Seus gastos de <span className="keyword">{last?.label}</span>.</>
              )}
            </h1>

            {hasData && last ? (
              <div className="mt-8 lg:mt-12 lg:pb-3">
                <p className="text-sm text-on-ink-muted mb-2">Total de {last.label}</p>
                <p className="display text-[48px] sm:text-[64px] num">{formatCurrency(last.total)}</p>
                <p className="mt-4 text-lg leading-snug font-serif italic text-on-ink-muted">
                  {change !== undefined && previous ? (
                    <>
                      <span className="marker num">{formatChange(change)}</span> em relação a {previous.label}.
                    </>
                  ) : 'Envie o extrato de outro mês para comparar.'}
                  {top && <> Maior peso: <span className="font-medium">{top.category}</span>.</>}
                </p>
              </div>
            ) : (
              <p className="mt-8 text-lg text-on-ink-muted leading-snug lg:pb-3 max-w-md">
                Envie um extrato bancário ou fatura de cartão. O Freyr organiza cada gasto por categoria, sem planilhas.
              </p>
            )}
          </div>

          <div className="lg:col-span-5 lg:col-start-8 relative">
            <div className="relative h-full min-h-[280px] sm:min-h-[320px] bg-on-ink-hairline/50 rounded-2xl p-6 sm:p-8 flex flex-col justify-end">
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
                  <p className="text-sm text-on-ink-muted mb-1">Total registrado</p>
                  <p className="display text-[36px] sm:text-[48px] num">{formatCurrency(total)}</p>
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