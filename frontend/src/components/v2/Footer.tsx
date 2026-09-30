import { useExpenses } from '@/store/expenses';
import { Logo, StatusDot } from '@/components/Hero';
import type { HealthState } from '@/lib/useHealth';
import { API_URL } from '@/api';

export function ServerStatus({ health }: { health: HealthState }) {
  const aiDescription =
    health.state !== 'online' ? '—'
    : health.health.ai === 'nvidia' ? 'IA (NVIDIA NIM) + suas correções'
    : 'Palavras-chave + suas correções';

  return (
    <div>
      <p className="eyebrow !text-on-text-muted mb-4">Sistema</p>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-on-text-muted">Status</dt>
          <dd className="mt-0.5"><StatusDot health={health} /></dd>
        </div>
        <div>
          <dt className="text-on-text-muted">Categorização</dt>
          <dd className="mt-0.5">{aiDescription}</dd>
        </div>
        <div>
          <dt className="text-on-text-muted">Servidor</dt>
          <dd className="mt-0.5 break-all">{API_URL || window.location.origin}</dd>
        </div>
      </dl>
      {health.state === 'online' && health.health.ai === 'keywords' && (
        <p className="mt-4 text-sm text-on-text-muted">
          Para ativar a IA, defina <code className="text-surface">NVIDIA_API_KEY</code> em <code className="text-surface">backend/.env</code>.
        </p>
      )}
    </div>
  );
}

export function CategoryLinks() {
  const { categories } = useExpenses();

  return (
    <div>
      <p className="eyebrow !text-on-text-muted mb-4">Categorias</p>
      <ul className="flex flex-wrap gap-2">
        {categories.map(c => (
          <li key={c}>
            <span className="inline-block px-3.5 py-1.5 rounded-full border border-on-text-line text-sm text-on-text-muted">
              {c.toUpperCase()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FooterV2({ health }: { health: HealthState }) {
  return (
    <footer className="on-text bg-text text-surface mt-8">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-10 py-14 sm:py-20 grid gap-12 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Logo className="text-[64px] sm:text-[88px]" />
          <p className="mt-4 text-on-text-muted max-w-xs">Clareza financeira, sem planilhas.</p>
        </div>
        <ServerStatus health={health} />
        <CategoryLinks />
      </div>
    </footer>
  );
}