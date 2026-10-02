import { cx } from './format';

export interface DeltaChipProps {
  value: number;
  /** For spending, where a fall is the good news. */
  invert?: boolean;
  onHero?: boolean;
}

export function DeltaChip({ value, invert, onHero }: DeltaChipProps) {
  const v = value || 0;
  const good = invert ? v <= 0 : v >= 0;
  return (
    <span className={cx('fr-chip', good ? 'is-good' : 'is-bad', onHero && 'is-hero')}>
      {(v >= 0 ? '↑ +' : '↓ −') + Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'}
    </span>
  );
}
