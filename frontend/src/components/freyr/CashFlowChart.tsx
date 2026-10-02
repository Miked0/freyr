import { useState, type KeyboardEvent } from 'react';
import { compact, cx, money } from './format';

export interface CashFlowDatum {
  label: string;
  income: number;
  expense: number;
}

export interface CashFlowChartProps {
  data: CashFlowDatum[];
  mode?: 'focus' | 'all';
  height?: number;
  seriesLabels?: [string, string];
  /** Column selected on mount; defaults to the one with the highest income. */
  defaultIndex?: number;
  ticks?: number;
  label?: string;
}

function niceStep(max: number, n: number) {
  const raw = max / n || 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

export function CashFlowChart(p: CashFlowChartProps) {
  const data = p.data ?? [];
  const names = p.seriesLabels ?? ['Entradas', 'Saídas'];
  const [selected, setSel] = useState(() =>
    p.defaultIndex != null ? p.defaultIndex : data.reduce((b, d, i) => (d.income > data[b].income ? i : b), 0),
  );
  const sel = Math.max(0, Math.min(selected, data.length - 1));
  const maxV = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
  const step = niceStep(maxV, p.ticks || 4);
  // Always leave a step of headroom above the tallest bar so its tooltip stays inside the plot.
  const ticks = Math.max(2, Math.floor(maxV / step) + 1);
  const top = step * ticks;
  const pct = (v: number) => (v / top) * 100 + '%';
  const cur = data[sel];

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSel(Math.min(data.length - 1, sel + 1));
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSel(Math.max(0, sel - 1));
    }
  }

  const tipSide = sel < 2 ? 'is-start' : sel > data.length - 3 ? 'is-end' : '';
  const levels = Array.from({ length: ticks + 1 }, (_, i) => i);

  return (
    <figure className={cx('fr-cf', p.mode === 'all' && 'is-all', data.length > 8 && 'is-dense')}>
      <div className="fr-cf-legend">
        <span className="fr-cf-key">
          <i className="fr-sw is-a" />
          {names[0]}
        </span>
        <span className="fr-cf-key">
          <i className="fr-sw is-b" />
          {names[1]}
        </span>
      </div>
      <div className="fr-cf-plot" style={p.height ? { height: p.height + 'px' } : undefined}>
        <div className="fr-cf-axis" aria-hidden="true">
          {levels.map(i => (
            <span key={i} style={{ bottom: (i / ticks) * 100 + '%' }}>
              {compact(step * i)}
            </span>
          ))}
        </div>
        <div
          className="fr-cf-area"
          role="listbox"
          aria-label={p.label || 'Entradas e saídas por mês'}
          tabIndex={0}
          onKeyDown={onKey}
          aria-activedescendant={'fr-cf-' + sel}
        >
          {levels.map(i => (
            <i key={'g' + i} className="fr-cf-grid" style={{ bottom: (i / ticks) * 100 + '%' }} />
          ))}
          {data.map((d, i) => {
            const on = i === sel;
            return (
              <div
                key={d.label}
                id={'fr-cf-' + i}
                role="option"
                aria-selected={on}
                aria-label={`${d.label}: ${names[0]} ${money(d.income)}, ${names[1]} ${money(d.expense)}`}
                className={cx('fr-cf-col', on && 'is-active', i % 2 === 1 && 'is-odd')}
                onMouseEnter={() => setSel(i)}
                onClick={() => setSel(i)}
              >
                <div className="fr-cf-bars">
                  <span className="fr-cf-bar is-a" style={{ height: pct(d.income) }} />
                  <span className="fr-cf-bar is-b" style={{ height: pct(d.expense) }} />
                  {on ? (
                    <div
                      className={cx('fr-cf-tip', tipSide)}
                      style={{ bottom: 'calc(' + pct(Math.max(d.income, d.expense)) + ' + 12px)' }}
                    >
                      <span>
                        <i className="fr-sw is-a" />
                        <b>{money(d.income)}</b>
                        <small>{names[0]}</small>
                      </span>
                      <span>
                        <i className="fr-sw is-b" />
                        <b>{money(d.expense)}</b>
                        <small>{names[1]}</small>
                      </span>
                    </div>
                  ) : null}
                </div>
                <span className="fr-cf-x">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      {cur ? (
        <figcaption className="fr-cf-cap">
          Saldo de <b>{cur.label}</b>:{' '}
          <b className={cur.income - cur.expense >= 0 ? 'is-in' : 'is-out'}>{money(cur.income - cur.expense, true)}</b>
        </figcaption>
      ) : null}
    </figure>
  );
}
