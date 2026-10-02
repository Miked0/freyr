import { CategoryTag } from './CategoryTag';
import { cx, money } from './format';

export interface BarDatum {
  label: string;
  value: number;
  tone?: 'ink' | 'brand' | 'alert';
}

export interface BarChartProps {
  data: BarDatum[];
  highlightMax?: boolean;
  label?: string;
}

export function BarChart({ data, highlightMax, label }: BarChartProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  const top = data.reduce<BarDatum | null>((a, d) => (!a || d.value > a.value ? d : a), null);

  return (
    <ul className="fr-bars" aria-label={label || 'Gastos por categoria'}>
      {data.map(d => {
        const tone = d.tone || (highlightMax !== false && d === top ? 'alert' : 'ink');
        const fill = cx('fr-bar-fill', tone === 'brand' && 'is-brand', tone === 'alert' && 'is-alert');
        return (
          <li key={d.label} className="fr-bar">
            <div className="fr-bar-meta">
              <CategoryTag tone={tone === 'alert' ? 'alert' : tone === 'brand' ? 'brand' : undefined}>{d.label}</CategoryTag>
              <span className="fr-bar-value">{money(d.value)}</span>
            </div>
            <div className="fr-bar-track">
              <div className={fill} style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
