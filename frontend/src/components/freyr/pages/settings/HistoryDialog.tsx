import { useEffect, useState } from 'react';
import type { ImportedFile } from '@/api';
import type { Expense } from '@/lib/finance';
import { entriesInScope, importedMonths, scopeImpact, type ImportScope } from '@/lib/importScope';
import { monthLongLabel } from '@/lib/overviewPhrase';
import { ConfirmDialog } from '../../settings/ConfirmDialog';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface HistoryDialogProps {
  open: boolean;
  /** Files ticked when it opens, from a statement's bin; none opens on "Todo o histórico". */
  preselected?: string[];
  files: ImportedFile[];
  expenses: Expense[];
  onClose: () => void;
  onConfirm: (doomed: Expense[], keepCopy: boolean) => void;
}

/** Picks what to delete (everything, some months or chosen statements), shows what goes and what stays, asks for APAGAR. */
export function HistoryDialog({ open, preselected, files, expenses, onClose, onConfirm }: HistoryDialogProps) {
  const months = importedMonths(expenses);
  const [kind, setKind] = useState<ImportScope['kind']>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [keepCopy, setKeepCopy] = useState(true);

  useEffect(() => {
    if (!open) return;
    setKind(preselected?.length ? 'files' : 'all');
    setChosen(preselected ?? []);
    setFrom(months[0] ?? '');
    setTo(months[months.length - 1] ?? '');
    setKeepCopy(true);
    // Resets once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const scope: ImportScope = kind === 'period' ? { kind, from, to } : kind === 'files' ? { kind, files: chosen } : { kind: 'all' };
  const impact = scopeImpact(expenses, scope);
  const total = files.reduce((sum, file) => sum + file.transactions, 0);
  const toggle = (name: string) => setChosen(list => (list.includes(name) ? list.filter(n => n !== name) : [...list, name]));
  const monthOptions = months.map(key => <option key={key} value={key}>{monthLongLabel(key)}</option>);

  return (
    <ConfirmDialog
      open={open}
      tone="danger"
      title="Apagar histórico de transações"
      confirmWord="APAGAR"
      confirmLabel={impact.entries ? `Apagar ${plural(impact.entries, 'transação', 'transações')}` : 'Nada para apagar'}
      disabled={impact.entries === 0}
      onClose={onClose}
      onConfirm={() => onConfirm(entriesInScope(expenses, scope), keepCopy)}
    >
      <p className="fr-field-label" id="history-scope-label">O que apagar</p>
      <div className="fr-choices" role="radiogroup" aria-labelledby="history-scope-label">
        <label className="fr-choice">
          <input type="radio" name="history-scope" checked={kind === 'all'} onChange={() => setKind('all')} />
          <b>Todo o histórico</b>
          <small>{plural(total, 'transação', 'transações')} de {plural(files.length, 'extrato', 'extratos')}.</small>
        </label>
        <label className="fr-choice">
          <input type="radio" name="history-scope" checked={kind === 'period'} disabled={months.length === 0} onChange={() => setKind('period')} />
          <b>Um período</b>
          <small>Os meses escolhidos, de todos os extratos.</small>
          {kind === 'period' ? (
            <span className="fr-choice-extra">
              <select className="fr-select" aria-label="De" value={from} onChange={e => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value); }}>{monthOptions}</select>
              <select className="fr-select" aria-label="Até" value={to} onChange={e => { setTo(e.target.value); if (e.target.value < from) setFrom(e.target.value); }}>{monthOptions}</select>
            </span>
          ) : null}
        </label>
        <label className="fr-choice">
          <input type="radio" name="history-scope" checked={kind === 'files'} disabled={files.length === 0} onChange={() => setKind('files')} />
          <b>Extratos escolhidos</b>
          <small>Só o que veio dos arquivos que você marcar.</small>
        </label>
        {kind === 'files' ? (
          <div className="fr-choice-files" role="group" aria-label="Extratos">
            {files.map(file => (
              <label key={file.name} className="fr-check">
                <input type="checkbox" checked={chosen.includes(file.name)} onChange={() => toggle(file.name)} />
                <span>{file.name} ({file.transactions})</span>
              </label>
            ))}
          </div>
        ) : null}
      </div>
      <div className="fr-impact" role="status">
        <span>
          Vão sair <b>{plural(impact.entries, 'transação', 'transações')}</b>
          {impact.files ? <> e o registro de <b>{plural(impact.files, 'extrato', 'extratos')}</b></> : null}.
        </span>
        <ul className="fr-keep">
          <li>Continuam: lançamentos feitos à mão, categorias, metas, perfil e preferências.</li>
          <li>Saldos e gráficos são recalculados sem essas transações.</li>
        </ul>
      </div>
      <label className="fr-check">
        <input type="checkbox" checked={keepCopy} onChange={e => setKeepCopy(e.target.checked)} />
        <span>Baixar uma cópia em CSV antes de apagar</span>
      </label>
    </ConfirmDialog>
  );
}
