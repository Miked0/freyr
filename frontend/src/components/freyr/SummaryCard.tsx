import type { MouseEvent } from 'react';
import { DeltaChip } from './DeltaChip';
import { Icon, type IconName } from './Icon';
import { cx, money } from './format';

export interface MeterPart {
  label: string;
  value: number;
  /** 'a' is the main part, 'b' the secondary one, 'alert' what went over, 'none' the empty rest of the bar. */
  tone: 'a' | 'b' | 'alert' | 'none';
}

export interface SummaryCardProps {
  label: string;
  sublabel?: string;
  value: number | string;
  delta?: number;
  /** A stacked bar under the value, with its parts listed below it. */
  meter?: MeterProps;
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
        {p.meter ? <Meter {...p.meter} /> : null}
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

export interface MeterProps {
  label: string;
  parts: MeterPart[];
  /** What the list under the bar shows, when it is not the bar's own parts. */
  legend?: MeterPart[];
}

function Meter({ label, parts, legend = parts }: MeterProps) {
  const total = parts.reduce((sum, part) => sum + Math.max(0, part.value), 0);
  return (
    <div className="fr-meter">
      <div className="fr-meter-bar" role="img" aria-label={label}>
        {total > 0
          ? parts.map(part => (
              <span key={part.label} className={cx('fr-meter-seg', 'is-' + part.tone)}
                style={{ flexGrow: Math.max(0, part.value) / total }} />
            ))
          : null}
      </div>
      <ul className="fr-meter-legend">
        {legend.map(part => (
          <li key={part.label}>
            <span className={cx('fr-meter-dot', 'is-' + part.tone)} aria-hidden="true" />
            <span>{part.label}</span> <b>{money(part.value)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
