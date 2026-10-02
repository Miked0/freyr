import { cx, money } from './format';

export interface GoalProgressProps {
  label: string;
  current: number;
  target: number;
  /** Already formatted, e.g. "dez 2026". */
  due?: string;
}

/** A savings goal: name, percentage, 6px bar and "R$ x de R$ y · prazo"; reached goals turn positive. */
export function GoalProgress({ label, current, target, due }: GoalProgressProps) {
  const done = target > 0 && current >= target;
  // Rounding must not reach 100% before the whole target is saved.
  const pct = done ? 100 : Math.max(0, Math.min(99, Math.round(((current || 0) / (target || 1)) * 100)));
  return (
    <div className="fr-goal">
      <div className="fr-goal-head">
        <span className="fr-goal-name">{label}</span>
        <span className={cx('fr-goal-pct', done && 'is-done')}>{done ? 'Concluída' : pct + '%'}</span>
      </div>
      <div className="fr-goal-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={cx('fr-goal-fill', done && 'is-done')} style={{ width: pct + '%' }} />
      </div>
      <span className="fr-goal-meta">{money(current) + ' de ' + money(target) + (due ? ' · ' + due : '')}</span>
    </div>
  );
}
