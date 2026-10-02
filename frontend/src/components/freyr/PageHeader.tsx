import { Button } from './Button';
import { Icon } from './Icon';

// Header rules from the Dashboard preview; freyr.css only carries the component classes.
const css = `
.fr-page-head { display: grid; gap: var(--space-6); scroll-margin-top: var(--space-6); }
.fr-crumb { margin: 0; font-size: 13px; color: var(--ink-muted); }
.fr-crumb b { color: var(--ink); font-weight: 700; }
.fr-head { display: flex; justify-content: space-between; align-items: end; gap: var(--space-4); flex-wrap: wrap; }
.fr-head h1 { margin: 0; font-size: 32px; line-height: 36px; font-weight: 800; letter-spacing: -0.02em; }
.fr-head p { margin: var(--space-1) 0 0; font-family: var(--font-accent); font-style: italic; font-weight: 500; font-size: 18px; line-height: 26px; color: var(--ink-muted); }
.fr-actions { display: flex; gap: var(--space-3); flex-wrap: wrap; }
.fr-actions .fr-btn { display: inline-flex; align-items: center; gap: var(--space-2); height: 40px; padding: 0 var(--space-4); }
.fr-actions .fr-period { cursor: default; }
`;

export interface PageHeaderProps {
  phrase: string;
  /** Period shown as a static label, e.g. "Setembro 2026". Hidden when undefined. */
  periodLabel?: string;
  onExport?: () => void;
  onImport?: () => void;
}

export function PageHeader({ phrase, periodLabel, onExport, onImport }: PageHeaderProps) {
  return (
    <header id="visao-geral" className="fr-page-head">
      <style href="freyr-page-head" precedence="default">{css}</style>
      <p className="fr-crumb">Finanças / <b>Visão geral</b></p>
      <div className="fr-head">
        <div>
          <h1>Visão geral financeira</h1>
          <p>{phrase}</p>
        </div>
        <div className="fr-actions">
          {periodLabel ? (
            <span className="fr-btn fr-btn-outline fr-period">
              <Icon name="calendar" size={16} />{periodLabel}
            </span>
          ) : null}
          {onExport ? (
            <Button variant="outline" onClick={onExport}><Icon name="export" size={16} />Exportar</Button>
          ) : null}
          {onImport ? (
            <Button onClick={onImport}><Icon name="import" size={16} />Importar extrato</Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
