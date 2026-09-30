import { useMemo } from 'react';
import { ArrowDown, LogOut } from 'lucide-react';
import PillButton from '@/components/ui/PillButton';
import { useExpenses } from '@/store/expenses';
import { formatChange, formatCurrency, totalsByCategory, totalsByMonth } from '@/lib/finance';
import type { HealthState } from '@/lib/useHealth';

const NAV = [
  { href: '#extrato', label: 'Extrato' },
  { href: '#categorias', label: 'Categorias' },
  { href: '#meses', label: 'Meses' },
  { href: '#transacoes', label: 'Transações' },
];

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`display tracking-[-0.05em] ${className}`}>
      fr<span className="font-serif italic font-normal tracking-normal">e</span>yr
    </span>
  );
}

export function StatusDot({ health }: { health: HealthState }) {
  const [color, label] =
    health.state === 'checking' ? ['bg-on-text-muted', 'Verificando…']
    : health.state === 'offline' ? ['bg-alert', 'Servidor offline']
    : health.health.ai === 'nvidia' ? ['bg-positive', 'Online · IA ativa']
    : ['bg-brand-warm', 'Online · sem IA'];
  return (
    <span className="inline-flex items-center gap-2 text-sm text-on-text-muted whitespace-nowrap">
      <span className={`w-2 h-2 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

export default function Hero({ health, onLogout }: { health: HealthState; onLogout?: () => void }) {
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
    <header className="on-text bg-text text-surface">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
          <a href="#" className="!text-surface !opacity-100" aria-label="Freyr, início">
            <Logo className="text-[34px]" />
          </a>
          <nav aria-label="Seções" className="hidden md:flex items-center gap-1 rounded-full border border-on-text-line p-1">
            {NAV.map(item => (
              <a key={item.href} href={item.href} className="!text-surface px-4 py-1.5 rounded-full text-sm font-medium hover:!opacity-100 hover:bg-on-text-line transition-colors">
                {item.label}
              </a>
            ))}
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

        <div className="grid gap-12 lg:grid-cols-[1.35fr_1fr] items-end pt-12 sm:pt-20 pb-12 sm:pb-16">
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
            <div className="lg:pb-3">
              <p className="text-sm text-on-text-muted mb-2">Total de {last.label}</p>
              <p className="display text-[48px] sm:text-[64px] num">{formatCurrency(last.total)}</p>
              <p className="mt-4 text-lg leading-snug">
                {change !== undefined && previous ? (
                  <>
                    <span className="marker num">{formatChange(change)}</span> em relação a {previous.label}.
                  </>
                ) : 'Envie o extrato de outro mês para comparar.'}
                {top && <> Maior peso: <span className="font-medium">{top.category}</span>.</>}
              </p>
            </div>
          ) : (
            <p className="text-lg text-on-text-muted leading-snug lg:pb-3 max-w-md">
              Envie um extrato bancário ou fatura de cartão. O Freyr organiza cada gasto por categoria, sem planilhas.
            </p>
          )}
        </div>

        <div className="relative pb-10 sm:pb-14">
          <div className="absolute left-0 right-0 top-[26px] h-px bg-on-text-line" aria-hidden="true" />
          <div className="relative flex flex-wrap items-center gap-3">
            <PillButton tone="light" onClick={() => scrollTo('extrato')}>Enviar extrato</PillButton>
            {hasData && (
              <PillButton tone="light" onClick={() => scrollTo('transacoes')} icon={<ArrowDown className="h-4 w-4" />}>
                Ver {expenses.length} transações
              </PillButton>
            )}
            {hasData && (
              <span className="ml-auto text-sm text-on-text-muted bg-text pl-3 num">
                {formatCurrency(total)} registrados no total
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}