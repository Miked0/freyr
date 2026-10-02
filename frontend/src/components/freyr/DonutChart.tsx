import { useState } from 'react';
import { compact, cx, money } from './format';

export type DonutTone = 'brand-primary' | 'frost' | 'brand-warm' | 'ink-muted' | 'alert' | 'positive' | 'ink';

export interface DonutDatum {
  label: string;
  value: number;
  tone?: DonutTone;
}

export interface DonutChartProps {
  data: DonutDatum[];
  centerLabel?: string;
  label?: string;
}

const DONUT_TONES: DonutTone[] = ['brand-primary', 'frost', 'brand-warm', 'ink-muted', 'alert'];
const R = 70;
const C = 2 * Math.PI * R;

const toneOf = (d: DonutDatum, i: number) => `var(--${d.tone ?? DONUT_TONES[i % DONUT_TONES.length]})`;

export function DonutChart({ data, centerLabel, label }: DonutChartProps) {
  const [act, setAct] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const gap = data.length > 1 ? 3 : 0;
  const pct = (v: number) => Math.round((v / total) * 100);
  const shown = act == null ? null : data[act];
  let acc = 0;

  return (
    <figure className="fr-donut">
      <div className="fr-donut-ring">
        <svg viewBox="0 0 180 180" role="img" aria-label={`${label || 'Distribuição'}: ${data.map(d => `${d.label} ${pct(d.value)}%`).join(', ')}`}>
          <circle cx={90} cy={90} r={R} className="fr-donut-track" />
          {data.map((d, i) => {
            const len = (d.value / total) * C;
            const off = acc;
            acc += len;
            return (
              <circle
                key={d.label}
                cx={90}
                cy={90}
                r={R}
                className={cx('fr-donut-seg', act === i && 'is-active', act != null && act !== i && 'is-dim')}
                style={{ stroke: toneOf(d, i), strokeDasharray: `${Math.max(0, len - gap)} ${C}`, strokeDashoffset: -off }}
                transform="rotate(-90 90 90)"
              />
            );
          })}
        </svg>
        <div className="fr-donut-center">
          <span className="fr-tag fr-tag-muted">[ {shown ? shown.label : centerLabel || 'Total'} ]</span>
          <b>{compact(shown ? shown.value : total)}</b>
          {shown ? <small>{pct(shown.value)}%</small> : null}
        </div>
      </div>
      <ul className="fr-donut-legend">
        {data.map((d, i) => (
          <li
            key={d.label}
            tabIndex={0}
            className={act === i ? 'is-active' : ''}
            onMouseEnter={() => setAct(i)}
            onMouseLeave={() => setAct(null)}
            onFocus={() => setAct(i)}
            onBlur={() => setAct(null)}
          >
            <i className="fr-sw" style={{ background: toneOf(d, i) }} />
            <span className="fr-donut-name">{d.label}</span>
            <span className="fr-donut-val">{money(d.value)}</span>
            <span className="fr-donut-pct">{pct(d.value)}%</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
