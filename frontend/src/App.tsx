import { useEffect } from 'react';
import Hero, { Logo, StatusDot } from './components/Hero';
import Section from './components/Section';
import UploadComponent from './components/UploadComponent';
import CategoryBreakdown from './components/CategoryBreakdown';
import MonthlyTrend from './components/MonthlyTrend';
import TransactionsTable from './components/TransactionsTable';
import LoginScreen from './components/LoginScreen';
import Spinner from './components/ui/Spinner';
import { useExpenses } from './store/expenses';
import { useHealth } from './lib/useHealth';
import { useSession } from './lib/useSession';
import { API_URL } from './api';

function App() {
  const { categories, load } = useExpenses();
  const health = useHealth();
  const session = useSession();
  const canSeeData = session.state === 'authenticated' || session.state === 'open';

  useEffect(() => {
    if (canSeeData) load();
  }, [canSeeData, load]);

  if (session.state === 'checking') {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center text-accent-light" role="status" aria-label="Carregando">
        <Spinner size="lg" />
      </div>
    );
  }

  if (session.state === 'required') {
    return <LoginScreen onSuccess={session.refresh} />;
  }

  const aiDescription =
    health.state !== 'online' ? '—'
    : health.health.ai === 'nvidia' ? 'IA (NVIDIA NIM) + suas correções'
    : 'Palavras-chave + suas correções';

  return (
    <>
      <Hero health={health} onLogout={session.canLogout ? session.logout : undefined} />

      <main className="max-w-[1240px] mx-auto px-5 sm:px-10 pt-16 sm:pt-24">
        <Section
          id="extrato"
          number="01"
          title={<>Envie um <span className="keyword">extrato</span></>}
          description="PDF ou CSV do banco ou do cartão. Cada lançamento é lido, datado e categorizado — e o Freyr aprende com as suas correções."
        >
          <UploadComponent onComplete={() => document.getElementById('transacoes')?.scrollIntoView({ behavior: 'smooth' })} />
        </Section>

        <Section
          id="categorias"
          number="02"
          title={<>Para onde o dinheiro <span className="keyword">foi</span></>}
          description="Cada categoria e o quanto ela pesa no total."
        >
          <CategoryBreakdown />
        </Section>

        <Section
          id="meses"
          number="03"
          title={<>Mês a <span className="keyword">mês</span></>}
          description="Como os seus gastos evoluem ao longo do tempo."
        >
          <MonthlyTrend />
        </Section>

        <Section
          id="transacoes"
          number="04"
          title={<>Todas as <span className="keyword">transações</span></>}
          description="Busque, filtre, corrija a categoria ou o valor e exporte para planilha."
        >
          <TransactionsTable />
        </Section>
      </main>

      <footer className="on-ink bg-ink text-bg mt-8">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-10 py-14 sm:py-20 grid gap-12 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Logo className="text-[64px] sm:text-[88px]" />
            <p className="mt-4 text-on-ink-muted max-w-xs">Clareza financeira, sem planilhas.</p>
          </div>
          <div>
            <p className="eyebrow !text-on-ink-muted mb-4">Sistema</p>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-on-ink-muted">Status</dt>
                <dd className="mt-0.5"><StatusDot health={health} /></dd>
              </div>
              <div>
                <dt className="text-on-ink-muted">Categorização</dt>
                <dd className="mt-0.5">{aiDescription}</dd>
              </div>
              <div>
                <dt className="text-on-ink-muted">Servidor</dt>
                <dd className="mt-0.5 break-all">{API_URL || window.location.origin}</dd>
              </div>
            </dl>
            {health.state === 'online' && health.health.ai === 'keywords' && (
              <p className="mt-4 text-sm text-on-ink-muted">
                Para ativar a IA, defina <code className="text-bg">NVIDIA_API_KEY</code> em <code className="text-bg">backend/.env</code>.
              </p>
            )}
          </div>
          <div>
            <p className="eyebrow !text-on-ink-muted mb-4">Categorias</p>
            <ul className="flex flex-wrap gap-2">
              {categories.map(c => (
                <li key={c} className="px-3.5 py-1.5 rounded-full border border-on-ink-hairline text-sm">{c}</li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;
