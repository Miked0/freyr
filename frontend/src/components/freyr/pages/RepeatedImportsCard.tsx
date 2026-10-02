import { useEffect, useState } from 'react';
import { api } from '@/api';
import DestructiveAction from '@/components/ui/DestructiveAction';
import { useExpenses } from '@/store/expenses';
import { formatBRL, formatDate, type Expense } from '@/lib/finance';
import { BentoCard } from '../BentoCard';

const copiesLabel = (n: number) => `${n} ${n === 1 ? 'cópia' : 'cópias'}`;

/** Offers to remove the copies left by statements imported more than once; hidden when there are none. */
export function RepeatedImportsCard() {
  const reload = useExpenses(state => state.load);
  const [copies, setCopies] = useState<Expense[]>([]);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listRepeatedImports().then(res => setCopies(res.expenses)).catch(() => setCopies([]));
  }, []);

  const removeCopies = async () => {
    setRemoving(true);
    setError(null);
    try {
      const { removed } = await api.removeRepeatedImports(copies.map(c => c.id));
      setCopies([]);
      setMessage(`${copiesLabel(removed)} ${removed === 1 ? 'removida' : 'removidas'}.`);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRemoving(false);
    }
  };

  if (message) {
    return (
      <BentoCard span={12}>
        <p role="status">{message}</p>
      </BentoCard>
    );
  }
  if (copies.length === 0) return null;

  const n = copies.length;
  return (
    <BentoCard span={12} title="Transações repetidas">
      <p className="text-ink-muted mb-3">
        {n} {n === 1 ? 'transação aparece' : 'transações aparecem'} mais de uma vez porque o mesmo extrato foi importado de novo.
        A primeira de cada uma fica; só as cópias saem.
      </p>
      <ul className="mb-4 max-h-56 overflow-y-auto divide-y divide-line text-sm">
        {copies.map(c => (
          <li key={c.id} className="flex justify-between gap-3 py-1.5">
            <span>{formatDate(c.date)} · <span>{c.description}</span></span>
            <span className="tabular-nums">{formatBRL(c.amount, c.type)}</span>
          </li>
        ))}
      </ul>
      {error ? <p role="alert" className="text-alert mb-3">{error}</p> : null}
      <DestructiveAction
        label={`Remover ${copiesLabel(n)}`}
        onConfirm={removeCopies}
        loading={removing}
        modalTitle={`Remover ${copiesLabel(n)}?`}
        modalMessage="As transações originais continuam no extrato. Esta ação não pode ser desfeita."
        confirmLabel="Remover"
      />
    </BentoCard>
  );
}
