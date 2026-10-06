import { useEffect, useState } from 'react';
import { api, type Recategorization } from '@/api';
import Button from '@/components/ui/Button';
import { useExpenses } from '@/store/expenses';
import { formatBRL, formatDate } from '@/lib/finance';
import { BentoCard } from '../BentoCard';

const entriesLabel = (n: number) => `${n} ${n === 1 ? 'transação' : 'transações'}`;

/** Offers the categories the current rules give to entries saved before them; hidden when there are none. */
export function RecategorizeCard() {
  const reload = useExpenses(state => state.load);
  const [suggestions, setSuggestions] = useState<Recategorization[]>([]);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listRecategorizations().then(res => setSuggestions(res.suggestions)).catch(() => setSuggestions([]));
  }, []);

  const apply = async () => {
    setApplying(true);
    setError(null);
    try {
      const { updated } = await api.applyRecategorizations(suggestions.map(s => s.id));
      setSuggestions([]);
      setMessage(`${entriesLabel(updated)} ${updated === 1 ? 'recategorizada' : 'recategorizadas'}.`);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setApplying(false);
    }
  };

  if (message) {
    return (
      <BentoCard span={12}>
        <p role="status">{message}</p>
      </BentoCard>
    );
  }
  if (suggestions.length === 0) return null;

  const n = suggestions.length;
  return (
    <BentoCard span={12} title="Categorias sugeridas">
      <p className="text-ink-muted mb-3">
        {entriesLabel(n)} {n === 1 ? 'pode' : 'podem'} ganhar uma categoria melhor com as regras novas.
        As que você corrigiu à mão ficam como estão.
      </p>
      <ul className="mb-4 max-h-56 overflow-y-auto divide-y divide-line text-sm">
        {suggestions.map(s => (
          <li key={s.id} className="flex flex-wrap justify-between gap-x-3 py-1.5">
            <span>{formatDate(s.date)} · <span>{s.description}</span></span>
            <span className="tabular-nums">{formatBRL(s.amount, s.type)} · {s.from} → {s.to}</span>
          </li>
        ))}
      </ul>
      {error ? <p role="alert" className="text-alert mb-3">{error}</p> : null}
      <Button onClick={apply} loading={applying}>{`Aplicar ${n} ${n === 1 ? 'categoria' : 'categorias'}`}</Button>
    </BentoCard>
  );
}
