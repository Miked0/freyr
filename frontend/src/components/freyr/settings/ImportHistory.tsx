import type { ImportedFile } from '@/api';
import { formatDate } from '@/lib/finance';
import { Icon } from '../Icon';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const monthOf = (day: string) => `${MONTHS[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}`;

/** "set 2026", or "jul–ago 2026" / "dez 2025–jan 2026" when the file spans months. */
function periodLabel(from: string, to: string): string {
  const a = monthOf(from), b = monthOf(to);
  if (a === b) return a;
  return from.slice(0, 4) === to.slice(0, 4) ? `${a.slice(0, 3)}–${b}` : `${a}–${b}`;
}

const count = (n: number) => `${n} ${n === 1 ? 'transação' : 'transações'}`;

export interface ImportHistoryProps {
  items: ImportedFile[];
  onRemove: (file: ImportedFile) => void;
}

/** The statements sent: file, period, how many transactions and when it arrived; the bin opens the delete dialog. */
export function ImportHistory({ items, onRemove }: ImportHistoryProps) {
  if (items.length === 0) {
    return <p className="fr-srow-desc">Nenhum extrato por aqui. As transações aparecem quando você enviar o primeiro.</p>;
  }
  return (
    <ul className="fr-imports">
      {items.map(item => (
        <li key={item.name}>
          <span className="fr-imports-icon" aria-hidden="true"><Icon name="file" size={16} /></span>
          <span className="fr-imports-text">
            <span className="fr-imports-name">{item.name}</span>
            <span className="fr-imports-meta">
              {[periodLabel(item.from, item.to), count(item.transactions), item.importedAt ? `enviado em ${formatDate(item.importedAt)}` : null].filter(Boolean).join(' · ')}
            </span>
          </span>
          <button type="button" className="fr-icon-btn is-alert" aria-label={`Apagar ${item.name} e suas transações`} title="Apagar este extrato" onClick={() => onRemove(item)}>
            <Icon name="trash" size={16} />
          </button>
        </li>
      ))}
    </ul>
  );
}
