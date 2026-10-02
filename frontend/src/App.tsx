import { lazy, Suspense, useEffect } from 'react';
import { useExpenses } from './store/expenses';
import { useSession } from './lib/useSession';
import Spinner from './components/ui/Spinner';

const Dashboard = lazy(() => import('./components/freyr/Dashboard').then(m => ({ default: m.Dashboard })));
const LoginScreenV2 = lazy(() => import('./components/v2/LoginScreen').then(m => ({ default: m.default })));

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
  const { load } = useExpenses();
  const session = useSession();
  const canSeeData = session.state === 'authenticated' || session.state === 'open';

  useEffect(() => {
    if (canSeeData) load();
  }, [canSeeData, load]);

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

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Dashboard onLogout={session.canLogout ? session.logout : undefined} />
    </Suspense>
  );
}

export default App;
