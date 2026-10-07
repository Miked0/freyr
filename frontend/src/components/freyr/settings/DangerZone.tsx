import type { ReactNode } from 'react';
import { Icon } from '../Icon';

export interface DangerZoneProps {
  id: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

/** The card of actions that delete data, always the last of the settings. Every action in it asks first. */
export function DangerZone({ id, title, description, children }: DangerZoneProps) {
  return (
    <section className="fr-danger" id={id} aria-labelledby={`${id}-title`}>
      <header className="fr-danger-head">
        <span className="fr-danger-icon" aria-hidden="true"><Icon name="warning" size={16} /></span>
        <h2 className="fr-card-title" id={`${id}-title`}>{title}</h2>
      </header>
      {description ? <p className="fr-srow-desc">{description}</p> : null}
      {children}
    </section>
  );
}
