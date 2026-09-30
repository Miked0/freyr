import { lazy, Suspense, useEffect, useMemo } from 'react';
import { useExpenses } from './store/expenses';
import { useHealth } from './lib/useHealth';
import { useSession } from './lib/useSession';
import { totalsByCategory } from './lib/finance';
import { pieSlices } from './lib/categoryColors';
import Spinner from './components/ui/Spinner';

// v2 components (lazy loaded for code splitting)
const BentoHero = lazy(() => import('./components/v2/BentoHero').then(m => ({ default: m.BentoHero })));
const BentoCard = lazy(() => import('./components/v2/BentoCard').then(m => ({ default: m.default })));
const Dropzone = lazy(() => import('./components/v2/Dropzone').then(m => ({ default: m.Dropzone })));
const DonutChart = lazy(() => import('./components/ui/DonutChart').then(m => ({ default: m.default })));
const BarChart = lazy(() => import('./components/v2/BarChart').then(m => ({ default: m.BarChart })));
const CashFlowChart = lazy(() => import('./components/v2/CashFlowChart').then(m => ({ default: m.CashFlowChart })));
const MonthList = lazy(() => import('./components/v2/MonthList').then(m => ({ default: m.MonthList })));
const TransactionList = lazy(() => import('./components/v2/TransactionList').then(m => ({ default: m.default })));
const LoginScreenV2 = lazy(() => import('./components/v2/LoginScreen').then(m => ({ default: m.default })));
const FooterV2 = lazy(() => import('./components/v2/Footer').then(m => ({ default: m.default })));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-text flex items-center justify-center text-brand-primary-light" role="status" aria-label="Carregando">
      <Spinner size="lg" />
    </div>
  );
}

function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="on-text min-h-screen bg-text text-surface flex items-center justify-center px-5">
      <div className="max-w-md text-center" role="alert">
        <h1 className="display text-[40px] sm:text-[56px] mb-4">Sem conexão</h1>
        <p className="text-on-text-muted mb-8">Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.</p>
        <button type="button" onClick={onRetry} className="px-6 py-3 rounded-full bg-surface text-text font-medium hover:bg-white cursor-pointer">
          Tentar de novo
        </button>
      </div>
    </main>
  );
}

function App() {
  const { load, expenses } = useExpenses();
  const health = useHealth();
  const session = useSession();
  const canSeeData = session.state === 'authenticated' || session.state === 'open';

  useEffect(() => {
    if (canSeeData) load();
  }, [canSeeData, load]);

  // Hooks must run on every render, so they stay above the early returns below.
  const slices = useMemo(() => pieSlices(totalsByCategory(expenses)), [expenses]);

  if (session.state === 'checking') {
    return <LoadingFallback />;
  }

  if (session.state === 'offline') {
    return <OfflineScreen onRetry={session.refresh} />;
  }

  if (session.state === 'required') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LoginScreenV2 onSuccess={session.refresh} />
      </Suspense>
    );
  }

  // One boundary for the whole dashboard: per-section fallbacks stacked full-screen spinners.
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BentoHero health={health} onLogout={session.canLogout ? session.logout : undefined} />

      <main className="max-w-[1240px] mx-auto px-5 sm:px-10 pt-16 sm:pt-24">
        <BentoCard
          id="extrato"
          number="01"
          title={<>Envie um <span className="keyword">extrato</span></>}
          description="PDF ou CSV do banco ou do cartão. Cada lançamento é lido, datado e categorizado — e o Freyr aprende com as suas correções."
        >
          <Dropzone onComplete={() => document.getElementById('transacoes')?.scrollIntoView({ behavior: 'smooth' })} />
        </BentoCard>

        <BentoCard
          id="categorias"
          number="02"
          title={<>Para onde o dinheiro <span className="keyword">foi</span></>}
          description="Cada categoria de gasto e o quanto ela pesa no total. Receitas ficam de fora."
        >
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] items-start">
            <DonutChart slices={slices} />
            <BarChart />
          </div>
        </BentoCard>

        <BentoCard
          id="meses"
          number="03"
          title={<>Mês a <span className="keyword">mês</span></>}
          description="Como os seus gastos evoluem ao longo do tempo."
        >
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <CashFlowChart />
            <MonthList />
          </div>
        </BentoCard>

        <BentoCard
          id="transacoes"
          number="04"
          title={<>Todas as <span className="keyword">transações</span></>}
          description="Busque, filtre, corrija a categoria, o tipo ou o valor e exporte para planilha."
        >
          <TransactionList />
        </BentoCard>
      </main>

      <FooterV2 health={health} />
    </Suspense>
  );
}

export default App;
