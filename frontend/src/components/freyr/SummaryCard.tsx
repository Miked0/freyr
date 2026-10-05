import type { MouseEvent } from 'react';
import { DeltaChip } from './DeltaChip';
import { Icon, type IconName } from './Icon';
import { cx, money } from './format';

export interface SummaryCardProps {
  label: string;
  sublabel?: string;
  value: number | string;
  delta?: number;
  /** A short line under the value, e.g. how much of the balance is invested. */
  note?: string;
  invert?: boolean;
  icon?: IconName;
  period?: string;
  variant?: 'default' | 'hero';
  actionLabel?: string;
  href?: string;
  onAction?: (e: MouseEvent<HTMLAnchorElement>) => void;
  span?: 4 | 6 | 12;
}

export function SummaryCard(p: SummaryCardProps) {
  const hero = p.variant === 'hero';
  return (
    <section className={cx('fr-sum', hero && 'is-hero', p.span && 'fr-span-' + p.span)}>
      <div className="fr-sum-top">
        <span className="fr-sum-icon">
          <Icon name={p.icon ?? 'balance'} size={18} />
        </span>
        {p.period ? <span className="fr-sum-period">{p.period}</span> : null}
      </div>
      <div className="fr-sum-body">
        <h3 className="fr-sum-label">{p.label}</h3>
        {p.sublabel ? <p className="fr-sum-sub">{p.sublabel}</p> : null}
        <div className="fr-sum-row">
          <p className="fr-sum-value">{typeof p.value === 'number' ? money(p.value) : p.value}</p>
          {p.delta != null ? <DeltaChip value={p.delta} invert={p.invert} onHero={hero} /> : null}
        </div>
        {p.note ? <p className="fr-sum-note">{p.note}</p> : null}
      </div>
      {p.actionLabel ? (
        <a className="fr-sum-action" href={p.href || '#'} onClick={p.onAction}>
          <span>{p.actionLabel}</span>
          <Icon name="arrow" size={16} />
        </a>
      ) : null}
    </section>
  );
}
