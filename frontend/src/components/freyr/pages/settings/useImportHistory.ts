import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type ImportedFile } from '@/api';
import type { Expense } from '@/lib/finance';
import { useExpenses } from '@/store/expenses';

/** How long "Desfazer" stays on screen; the deletion reaches the server only after it. */
export const UNDO_MS = 10_000;

type Status = 'loading' | 'hidden' | 'ready';

interface Pending {
  ids: string[];
  timer: ReturnType<typeof setTimeout>;
}

/**
 * The imported files and a deletion that can be undone: the entries leave the screen at once and the server
 * deletes them when the undo window closes, or right away if the page goes away first.
 */
export function useImportHistory() {
  const reload = useExpenses(state => state.load);
  const [status, setStatus] = useState<Status>('loading');
  const [files, setFiles] = useState<ImportedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Pending | null>(null);

  const refresh = useCallback(async () => {
    try {
      setFiles((await api.listImportedFiles()).files);
      setStatus('ready');
    } catch {
      // The server refuses accounts the feature is not released to, which keeps it off the page.
      setStatus(current => (current === 'ready' ? current : 'hidden'));
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const commit = useCallback(async () => {
    const job = pending.current;
    if (!job) return;
    clearTimeout(job.timer);
    pending.current = null;
    try {
      await api.deleteImported(job.ids);
    } catch (err) {
      setError((err as Error).message);
    }
    await Promise.all([reload(), refresh()]);
  }, [reload, refresh]);

  // Leaving the page (or this screen) sends what is pending instead of dropping it.
  useEffect(() => {
    const flush = () => { void commit(); };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [commit]);

  /** Takes the entries off the screen now and deletes them on the server once the undo window closes. */
  const remove = useCallback((doomed: Expense[]) => {
    if (pending.current) void commit();
    setError(null);
    const ids = new Set(doomed.map(e => e.id));
    useExpenses.setState(state => ({ expenses: state.expenses.filter(e => !ids.has(e.id)) }));
    const gone = new Map<string, number>();
    for (const e of doomed) gone.set(e.source_file!, (gone.get(e.source_file!) ?? 0) + 1);
    setFiles(list => list
      .map(file => ({ ...file, transactions: file.transactions - (gone.get(file.name) ?? 0) }))
      .filter(file => file.transactions > 0));
    pending.current = { ids: [...ids], timer: setTimeout(() => { void commit(); }, UNDO_MS) };
  }, [commit]);

  /** Cancels the pending deletion and brings everything back from the server, where nothing was touched. */
  const undo = useCallback(async () => {
    const job = pending.current;
    if (!job) return;
    clearTimeout(job.timer);
    pending.current = null;
    await Promise.all([reload(), refresh()]);
  }, [reload, refresh]);

  return { status, files, error, remove, undo, commit };
}
