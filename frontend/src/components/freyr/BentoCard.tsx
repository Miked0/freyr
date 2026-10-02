import type { ReactNode } from 'react';
import { cx } from './format';

export interface BentoCardProps {
  title?: ReactNode;
  action?: ReactNode;
  span?: 4 | 5 | 6 | 7 | 8 | 12;
  id?: string;
  className?: string;
  children?: ReactNode;
}

export function BentoCard({ title, action, span, id, className, children }: BentoCardProps) {
  return (
    <section id={id} className={cx('fr-card', span && 'fr-span-' + span, className)}>
      {title || action ? (
        <header className="fr-card-head">
          {title ? <h2 className="fr-card-title">{title}</h2> : null}
          {action || null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
