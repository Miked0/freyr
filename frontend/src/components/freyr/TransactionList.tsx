import { CategoryTag } from './CategoryTag';
import { cx, money } from './format';

export interface Transaction {
  /** Optional stable key; the list falls back to the position. */
  id?: string;
  name: string;
  /** Signed: income positive, spending negative. */
  amount: number;
  category: string;
  date: string;
}

export interface TransactionListProps {
  items: Transaction[];
}

export function TransactionList({ items }: TransactionListProps) {
  return (
    <ul className="fr-tx">
      {items.map((t, i) => (
        <li key={t.id ?? i}>
          <span className="fr-tx-name">{t.name}</span>
          <span className={cx('fr-tx-amount', t.amount > 0 && 'is-in')}>{money(t.amount, true)}</span>
          <span className="fr-tx-meta">
            <CategoryTag tone="muted">{t.category}</CategoryTag>
            {t.date}
          </span>
        </li>
      ))}
    </ul>
  );
}
