import { cx } from './format';

export type SegmentedOption = string | { value: string; label: string };

export interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange?: (value: string) => void;
  label?: string;
}

export function SegmentedControl({ options, value, onChange, label }: SegmentedControlProps) {
  return (
    <div className="fr-seg" role="radiogroup" aria-label={label || 'Período'}>
      {options.map(o => {
        const val = typeof o === 'string' ? o : o.value;
        const lab = typeof o === 'string' ? o : o.label;
        const on = val === value;
        return (
          <button
            key={val}
            type="button"
            role="radio"
            aria-checked={on}
            className={cx('fr-seg-opt', on && 'is-on')}
            onClick={() => onChange?.(val)}
          >
            {lab}
          </button>
        );
      })}
    </div>
  );
}
