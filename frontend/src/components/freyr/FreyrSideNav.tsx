import type { HealthState } from '@/lib/useHealth';
import { SideNav } from './SideNav';

function serverStatus(health: HealthState): [color: string, label: string] {
  if (health.state === 'checking') return ['var(--ink-muted)', 'Verificando…'];
  if (health.state === 'offline') return ['var(--alert)', 'Servidor offline'];
  return health.health.ai === 'nvidia' ? ['var(--positive)', 'Online · IA ativa'] : ['var(--brand-warm)', 'Online · sem IA'];
}

export interface FreyrSideNavProps {
  transactionCount: number;
  onLogout?: () => void;
  health: HealthState;
}

export function FreyrSideNav({ transactionCount, onLogout, health }: FreyrSideNavProps) {
  const [color, label] = serverStatus(health);
  return (
    <SideNav
      sections={[
        {
          title: 'Principal',
          items: [
            { icon: 'overview', label: 'Visão geral', href: '#visao-geral', active: true },
            { icon: 'import', label: 'Importar', href: '#importar' },
            { icon: 'transactions', label: 'Transações', href: '#transacoes', count: transactionCount },
            { icon: 'categories', label: 'Categorias', href: '#categorias' },
          ],
        },
      ]}
      footer={
        <div className="fr-side-foot mt-auto grid gap-2 px-2">
          <span role="status" className="inline-flex items-center gap-2 text-xs" style={{ color: 'var(--ink-muted)' }}>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
            {label}
          </span>
          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="justify-self-start cursor-pointer border-0 bg-transparent p-0 text-sm font-bold hover:underline"
              style={{ color: 'var(--ink-muted)', font: 'inherit', fontSize: 14, fontWeight: 700 }}
            >
              Sair
            </button>
          ) : null}
        </div>
      }
    />
  );
}
