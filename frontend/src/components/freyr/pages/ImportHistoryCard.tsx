import { useEffect, useState } from 'react';
import { api, type ImportedFile } from '@/api';
import DestructiveAction from '@/components/ui/DestructiveAction';
import { useExpenses } from '@/store/expenses';
import { BentoCard } from '../BentoCard';

const transactionsLabel = (n: number) => `${n} ${n === 1 ? 'transação' : 'transações'}`;

/** Lets released accounts delete every transaction that came from an imported file; hidden for everyone else. */
export function ImportHistoryCard() {
  const reload = useExpenses(state => state.load);
  const [files, setFiles] = useState<ImportedFile[]>([]);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The server refuses accounts the feature is not released to, which keeps the card hidden.
    api.listImportedFiles().then(res => setFiles(res.files)).catch(() => setFiles([]));
  }, []);

  const clearHistory = async () => {
    setClearing(true);
    setError(null);
    try {
      const { removed } = await api.clearImportHistory();
      setFiles([]);
      setMessage(`${removed} ${removed === 1 ? 'transação importada apagada' : 'transações importadas apagadas'}.`);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClearing(false);
    }
  };

  if (message) {
    return (
      <BentoCard span={12}>
        <p role="status">{message}</p>
      </BentoCard>
    );
  }
  if (files.length === 0) return null;

  const total = files.reduce((sum, file) => sum + file.transactions, 0);
  return (
    <BentoCard span={12} title="Histórico de arquivos">
      <p className="text-ink-muted mb-3">
        {transactionsLabel(total)} vieram destes arquivos. Apagar o histórico remove todas elas; os lançamentos feitos à mão continuam.
      </p>
      <ul className="mb-4 max-h-56 overflow-y-auto divide-y divide-line text-sm">
        {files.map(file => (
          <li key={file.name} className="flex justify-between gap-3 py-1.5">
            <span>{file.name}</span>
            <span className="tabular-nums text-ink-muted">{transactionsLabel(file.transactions)}</span>
          </li>
        ))}
      </ul>
      {error ? <p role="alert" className="text-alert mb-3">{error}</p> : null}
      <DestructiveAction
        label="Apagar histórico de arquivos"
        onConfirm={clearHistory}
        loading={clearing}
        modalTitle="Apagar o histórico de arquivos?"
        modalMessage={`${transactionsLabel(total)} importadas serão apagadas. Esta ação não pode ser desfeita.`}
        confirmLabel="Apagar"
      />
    </BentoCard>
  );
}
