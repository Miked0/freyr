import { useEffect, useId, useState } from 'react';
import { Check, FileSpreadsheet, FileText, Minus } from 'lucide-react';
import { api, type ImportedFile } from '@/api';
import { useExpenses } from '@/store/expenses';
import { BentoCard } from '../BentoCard';
import { Button } from '../Button';
import { cx } from '../format';

const css = `
.fr-files-lead { margin: 0; font-size: 14px; line-height: 20px; color: var(--ink-muted); }
.fr-files { border: var(--border-width) solid var(--line); border-radius: var(--radius-sm); overflow: hidden; }
.fr-files-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-2) var(--space-4); background: var(--skeleton); font-size: 13px; line-height: 18px; color: var(--ink-muted); }
.fr-files-list { list-style: none; margin: 0; padding: 0; max-height: 360px; overflow-y: auto; }
.fr-files-list li + li { border-top: var(--border-width) solid var(--line); }
.fr-file { display: flex; align-items: center; gap: var(--space-3); min-height: 56px; padding: var(--space-2) var(--space-4); cursor: pointer; transition: background-color 160ms ease-out; }
.fr-file:hover { background: var(--skeleton); }
.fr-file.is-on { background: var(--alert-soft); }
.fr-check { position: relative; flex: none; display: grid; place-items: center; width: 20px; height: 20px; border: var(--border-width) solid var(--line-strong); border-radius: var(--radius-xs); background: var(--background); color: var(--on-brand); transition: background-color 160ms ease-out, border-color 160ms ease-out; }
.fr-check input { position: absolute; inset: -12px; opacity: 0; margin: 0; cursor: pointer; }
.fr-check svg { opacity: 0; pointer-events: none; }
.fr-check:has(input:checked), .fr-check:has(input:indeterminate) { background: var(--alert-deep); border-color: var(--alert-deep); }
.fr-check:has(input:checked) svg, .fr-check:has(input:indeterminate) svg { opacity: 1; }
.fr-check:has(input:focus-visible) { box-shadow: var(--focus-ring); }
.fr-file-kind { flex: none; display: grid; place-items: center; width: 36px; height: 36px; border-radius: var(--radius-sm); }
.fr-file-kind.is-csv { background: var(--positive-soft); color: var(--positive-deep); }
.fr-file-kind.is-pdf { background: var(--alert-soft); color: var(--alert-deep); }
.fr-file.is-on .fr-file-kind { background: var(--background); }
.fr-file-text { display: grid; min-width: 0; flex: 1; }
.fr-file-name { font-size: 14px; line-height: 20px; font-weight: 700; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fr-file-meta { font-size: 12px; line-height: 16px; letter-spacing: 1px; text-transform: uppercase; color: var(--ink-muted); }
.fr-file-count { flex: none; font-size: 14px; line-height: 20px; font-variant-numeric: tabular-nums; color: var(--ink-muted); }
.fr-files-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); }
.fr-files-sum { margin: 0; font-size: 14px; line-height: 20px; color: var(--ink-muted); }
.fr-files-sum b { color: var(--ink); }
.fr-btn.fr-btn-danger { background: var(--alert-deep); border-color: var(--alert-deep); color: var(--on-brand); }
.fr-btn.fr-btn-danger:hover:not(:disabled) { filter: brightness(1.08); }
.fr-files-confirm { display: grid; gap: var(--space-3); padding: var(--space-4); border-radius: var(--radius-sm); border: var(--border-width) solid var(--alert); background: var(--alert-soft); }
.fr-files-confirm p { margin: 0; font-size: 14px; line-height: 20px; color: var(--ink); }
.fr-files-actions { display: flex; flex-wrap: wrap; gap: var(--space-3); }
.fr-files-all { display: flex; align-items: center; gap: var(--space-3); min-height: 32px; font-weight: 700; color: var(--ink); cursor: pointer; }
.fr-files-done { margin: 0; font-size: 14px; line-height: 20px; font-weight: 700; color: var(--positive-deep); }
.fr-file-meta-count { display: none; }
@media (max-width: 520px) {
  .fr-file { padding: var(--space-2) var(--space-3); gap: var(--space-2); }
  .fr-file-count { display: none; }
  .fr-file-meta-count { display: inline; text-transform: none; letter-spacing: 0; }
}
.fr-files-error { margin: 0; font-size: 14px; line-height: 20px; font-weight: 700; color: var(--alert-deep); }
`;

const transactionsLabel = (n: number) => `${n} ${n === 1 ? 'transação' : 'transações'}`;
const filesLabel = (n: number) => `${n} ${n === 1 ? 'arquivo' : 'arquivos'}`;
const kindOf = (name: string) => (name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'csv');

type Status = 'loading' | 'hidden' | 'ready';

/**
 * Lets released accounts pick imported files and delete the transactions that came from them; hidden for everyone else.
 * Transactions typed by hand are never touched.
 */
export function ImportHistoryCard() {
  const reload = useExpenses(state => state.load);
  const id = useId();
  const [status, setStatus] = useState<Status>('loading');
  const [files, setFiles] = useState<ImportedFile[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The server refuses accounts the feature is not released to, which keeps the card hidden.
    api.listImportedFiles()
      .then(res => { setFiles(res.files); setStatus('ready'); })
      .catch(() => setStatus('hidden'));
  }, []);

  if (status !== 'ready') return null;

  const picked = files.filter(file => chosen.has(file.name));
  const pickedTransactions = picked.reduce((sum, file) => sum + file.transactions, 0);
  const allOn = files.length > 0 && picked.length === files.length;
  const someOn = picked.length > 0 && !allOn;

  const toggle = (name: string) => {
    setMessage(null);
    setError(null);
    setConfirming(false);
    setChosen(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    setMessage(null);
    setConfirming(false);
    setChosen(allOn ? new Set() : new Set(files.map(file => file.name)));
  };

  const remove = async () => {
    setDeleting(true);
    setError(null);
    try {
      const { removed } = await api.deleteImportedFiles(picked.map(file => file.name));
      const left = await api.listImportedFiles();
      setFiles(left.files);
      setChosen(new Set());
      setConfirming(false);
      setMessage(`${removed} ${removed === 1 ? 'transação apagada' : 'transações apagadas'} de ${filesLabel(picked.length)}.`);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <BentoCard span={8} title="Arquivos importados">
      <style href="freyr-import-files" precedence="default">{css}</style>
      <p className="fr-files-lead">
        Escolha os extratos e faturas que quer tirar do Freyr. As transações que vieram deles são apagadas; os lançamentos feitos à mão continuam.
      </p>

      {files.length === 0 ? (
        <>
          {message ? <p role="status" className="fr-files-done">{message}</p> : null}
          <p className="fr-files-lead">Nenhum arquivo importado por enquanto.</p>
        </>
      ) : (
        <>
          <div className="fr-files">
            <div className="fr-files-head">
              <label className="fr-files-all">
                <span className="fr-check">
                  <input
                    type="checkbox"
                    checked={allOn}
                    ref={el => { if (el) el.indeterminate = someOn; }}
                    onChange={toggleAll}
                    aria-controls={`${id}-files`}
                  />
                  {someOn ? <Minus size={14} strokeWidth={3} aria-hidden="true" /> : <Check size={14} strokeWidth={3} aria-hidden="true" />}
                </span>
                Selecionar todos
              </label>
              <span>{filesLabel(files.length)}</span>
            </div>
            <ul id={`${id}-files`} className="fr-files-list">
              {files.map((file, index) => {
                const on = chosen.has(file.name);
                const kind = kindOf(file.name);
                return (
                  <li key={file.name}>
                    <label className={cx('fr-file', on && 'is-on')}>
                      <span className="fr-check">
                        <input type="checkbox" checked={on} onChange={() => toggle(file.name)} aria-label={file.name} aria-describedby={`${id}-count-${index}`} />
                        <Check size={14} strokeWidth={3} aria-hidden="true" />
                      </span>
                      <span className={cx('fr-file-kind', 'is-' + kind)} aria-hidden="true">
                        {kind === 'pdf' ? <FileText size={18} /> : <FileSpreadsheet size={18} />}
                      </span>
                      <span className="fr-file-text">
                        <span className="fr-file-name">{file.name}</span>
                        <span className="fr-file-meta">{kind}<span className="fr-file-meta-count" aria-hidden="true"> · {transactionsLabel(file.transactions)}</span></span>
                      </span>
                      <span id={`${id}-count-${index}`} className="fr-file-count">{transactionsLabel(file.transactions)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          {confirming ? (
            <div className="fr-files-confirm" role="group" aria-labelledby={`${id}-confirm`}>
              <p id={`${id}-confirm`}>
                Apagar <b>{transactionsLabel(pickedTransactions)}</b> de {filesLabel(picked.length)}? Não dá para desfazer.
              </p>
              <div className="fr-files-actions">
                <Button className="fr-btn-danger" onClick={remove} disabled={deleting}>
                  {deleting ? 'Apagando…' : 'Apagar de vez'}
                </Button>
                <Button variant="outline" onClick={() => setConfirming(false)} disabled={deleting}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="fr-files-foot">
              <p className="fr-files-sum" aria-live="polite">
                {picked.length === 0
                  ? 'Nenhum arquivo selecionado.'
                  : <><b>{filesLabel(picked.length)}</b> · {transactionsLabel(pickedTransactions)}</>}
              </p>
              <Button variant="outline" disabled={picked.length === 0} onClick={() => setConfirming(true)}>
                Apagar selecionados
              </Button>
            </div>
          )}
          {message ? <p role="status" className="fr-files-done">{message}</p> : null}
        </>
      )}
      {error ? <p role="alert" className="fr-files-error">{error}</p> : null}
    </BentoCard>
  );
}
