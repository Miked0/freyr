import { useExpenses } from '@/store/expenses';
import { Logo, StatusDot } from '@/components/Hero';
import type { HealthState } from '@/lib/useHealth';
import { API_URL } from '@/api';

interface TextLinkProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function TextLink({ children, href, onClick, className = '' }: TextLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (href) return;
    e.preventDefault();
    onClick?.();
  };

  if (href) {
    return (
      <a href={href} className={`text-on-ink-muted hover:text-bg transition-colors ${className}`}>
        {children}
      </a>
    );
  }

  return (
    <button onClick={handleClick} className={`text-on-ink-muted hover:text-bg transition-colors cursor-pointer ${className}`}>
      {children}
    </button>
  );
}

export function ServerStatus({ health }: { health: HealthState }) {
  const aiDescription =
    health.state !== 'online' ? '—'
    : health.health.ai === 'nvidia' ? 'IA (NVIDIA NIM) + suas correções'
    : 'Palavras-chave + suas correções';

  return (
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
  );
}

export function CategoryLinks() {
  const { categories } = useExpenses();

  return (
    <div>
      <p className="eyebrow !text-on-ink-muted mb-4">Categorias</p>
      <ul className="flex flex-wrap gap-2">
        {categories.map(c => (
          <li key={c}>
            <TextLink className="px-3.5 py-1.5 rounded-full border border-on-ink-hairline text-sm hover:border-on-ink-muted/50">
              {c.toUpperCase()}
            </TextLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FooterV2({ health }: { health: HealthState }) {
  return (
    <footer className="on-ink bg-ink text-bg mt-8">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-10 py-14 sm:py-20 grid gap-12 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Logo className="text-[64px] sm:text-[88px]" />
          <p className="mt-4 text-on-ink-muted max-w-xs">Clareza financeira, sem planilhas.</p>
        </div>
        <ServerStatus health={health} />
        <CategoryLinks />
      </div>
    </footer>
  );
}