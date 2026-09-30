import { useEffect, useMemo } from 'react';
import { useExpenses } from './store/expenses';
import { useHealth } from './lib/useHealth';
import { useSession } from './lib/useSession';

// v2 components (lazy loaded for code splitting)
import { lazy, Suspense } from 'react';
import Spinner from './components/ui/Spinner';

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
    <div className="min-h-screen bg-ink flex items-center justify-center text-accent-light" role="status" aria-label="Carregando">
      <Spinner size="lg" />
    </div>
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

  if (session.state === 'checking') {
    return <LoadingFallback />;
  }

  if (session.state === 'required') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LoginScreenV2 onSuccess={session.refresh} />
      </Suspense>
    );
  }

  // Prepare category slices for DonutChart
  const categories = useMemo(() => {
    const acc: Record<string, number> = {};
    expenses.forEach(exp => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    });
    return acc;
  }, [expenses]);

  const slices = useMemo(() => {
    const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    return Object.entries(categories)
      .map(([category, total]) => ({
        category,
        total,
        share: total / (grandTotal || 1),
        color: '#5B5A96',
      }))
      .sort((a, b) => b.total - a.total);
  }, [categories, expenses]);

  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <BentoHero health={health} onLogout={session.canLogout ? session.logout : undefined} />
      </Suspense>

      <main className="max-w-[1240px] mx-auto px-5 sm:px-10 pt-16 sm:pt-24">
        <Suspense fallback={<LoadingFallback />}>
          <BentoCard
            id="extrato"
            number="01"
            title={<>Envie um <span className="keyword">extrato</span></>}
            description="PDF ou CSV do banco ou do cartão. Cada lançamento é lido, datado e categorizado — e o Freyr aprende com as suas correções."
          >
            <Dropzone onComplete={() => document.getElementById('transacoes')?.scrollIntoView({ behavior: 'smooth' })} />
          </BentoCard>
        </Suspense>

        <Suspense fallback={<LoadingFallback />}>
          <BentoCard
            id="categorias"
            number="02"
            title={<>Para onde o dinheiro <span className="keyword">foi</span></>}
            description="Cada categoria e o quanto ela pesa no total."
          >
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] items-start">
              <div className="h-[280px] sm:h-[320px]" role="img" aria-label="Distribuição das categorias">
                <DonutChart slices={slices} />
              </div>
              <BarChart />
            </div>
          </BentoCard>
        </Suspense>

        <Suspense fallback={<LoadingFallback />}>
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
        </Suspense>

        <Suspense fallback={<LoadingFallback />}>
          <BentoCard
            id="transacoes"
            number="04"
            title={<>Todas as <span className="keyword">transações</span></>}
            description="Busque, filtre, corrija a categoria ou o valor e exporte para planilha."
          >
            <TransactionList />
          </BentoCard>
        </Suspense>
      </main>

      <Suspense fallback={<LoadingFallback />}>
        <FooterV2 health={health} />
      </Suspense>
    </>
  );
}

export default App;