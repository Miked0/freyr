import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Trash2, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import PillButton from '@/components/ui/PillButton';
import Spinner from '@/components/ui/Spinner';
import { api } from '@/api';
import { useExpenses } from '@/store/expenses';
import { formatCurrency, formatDate, type Expense } from '@/lib/finance';
import { categoryColor } from '@/lib/categoryColors';

interface UploadComponentProps {
  onComplete?: () => void;
}

type Phase = 'idle' | 'uploading' | 'review' | 'saving';

const MAX_SIZE = 4 * 1024 * 1024;

const UploadComponent: React.FC<UploadComponentProps> = ({ onComplete }) => {
  const { load, remove } = useExpenses();
  const [phase, setPhase] = useState<Phase>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<Expense[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPhase('idle');
    setFileName(null);
    setUploaded([]);
    setSelected(new Set());
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setNotice(null);

    if (!/\.(pdf|csv)$/i.test(file.name)) {
      setError('Formato não suportado. Envie um arquivo PDF ou CSV.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('Arquivo muito grande. O tamanho máximo é 4 MB.');
      return;
    }

    setFileName(file.name);
    setPhase('uploading');
    try {
      const result = await api.uploadStatement(file);
      await load();
      if (result.expenses.length === 0) {
        setError('Nenhuma despesa foi encontrada nesse arquivo. Confira se ele tem data, descrição e valor em cada lançamento.');
        reset();
        return;
      }
      setUploaded(result.expenses);
      setSelected(new Set(result.expenses.map(e => e.id)));
      setPhase('review');
    } catch (err) {
      setError((err as Error).message);
      reset();
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(selected.size === uploaded.length ? new Set() : new Set(uploaded.map(e => e.id)));
  };

  const finish = async (idsToDiscard: string[], message: string) => {
    setPhase('saving');
    try {
      if (idsToDiscard.length) await remove(idsToDiscard);
      reset();
      setNotice(message);
      if (idsToDiscard.length < uploaded.length) onComplete?.();
    } catch (err) {
      setError((err as Error).message);
      setPhase('review');
    }
  };

  const keep = () => {
    const discard = uploaded.filter(e => !selected.has(e.id)).map(e => e.id);
    const kept = uploaded.length - discard.length;
    finish(discard, `${kept} ${kept === 1 ? 'despesa mantida' : 'despesas mantidas'}. Veja abaixo, em Transações.`);
  };

  const discardAll = () => {
    if (!window.confirm(`Descartar as ${uploaded.length} despesas deste extrato?`)) return;
    finish(uploaded.map(e => e.id), 'Extrato descartado. Nenhuma despesa foi mantida.');
  };

  const selectedTotal = uploaded.filter(e => selected.has(e.id)).reduce((sum, e) => sum + e.amount, 0);
  const uploadedTotal = uploaded.reduce((sum, e) => sum + e.amount, 0);
  const isBusy = phase === 'uploading' || phase === 'saving';

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv"
        className="hidden"
        onChange={e => processFile(e.target.files?.[0])}
        disabled={isBusy}
        data-testid="statement-input"
      />

      {phase === 'idle' && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
          onDrop={e => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files?.[0]); }}
          className={`dropzone flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 !text-left ${isDragging ? 'dropzone-active' : ''}`}
        >
          <div className="flex items-start gap-4">
            <Upload className="h-7 w-7 text-accent flex-shrink-0 mt-1" strokeWidth={1.5} />
            <div>
              <p className="text-2xl font-medium tracking-[-0.03em] leading-tight">
                {isDragging ? 'Solte o arquivo aqui' : 'Arraste o PDF ou CSV para cá'}
              </p>
              <p className="text-muted mt-1">
                Extrato bancário ou fatura de cartão · até 4 MB · no CSV, colunas de data, valor e descrição
              </p>
            </div>
          </div>
          <PillButton onClick={() => fileInputRef.current?.click()}>Escolher arquivo</PillButton>
        </div>
      )}

      {phase === 'uploading' && (
        <div className="dropzone flex items-center gap-4 !text-left" role="status" aria-live="polite">
          <Spinner size="lg" className="text-accent flex-shrink-0" />
          <div>
            <p className="text-xl font-medium flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" strokeWidth={1.75} /> {fileName}
            </p>
            <p className="text-muted">Lendo o extrato e categorizando cada despesa — com a IA ativa, cerca de 1 segundo por item.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 rounded-2xl bg-danger-soft text-danger flex items-start gap-3 animate-fade-in" role="alert">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Não foi possível processar o arquivo</p>
            <p className="text-sm mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="cursor-pointer hover:opacity-70" aria-label="Fechar aviso">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {notice && phase === 'idle' && (
        <div className="mt-4 p-4 rounded-2xl bg-success-soft text-success flex items-center gap-3 animate-fade-in" role="status">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="font-medium flex-1">{notice}</p>
          <button onClick={() => setNotice(null)} className="cursor-pointer hover:opacity-70" aria-label="Fechar aviso">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {(phase === 'review' || phase === 'saving') && (
        <div className="animate-fade-in">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
            <div className="min-w-0">
              <p className="text-2xl font-medium tracking-[-0.03em] truncate">{fileName}</p>
              <p className="text-muted">
                {uploaded.length} {uploaded.length === 1 ? 'despesa encontrada' : 'despesas encontradas'} somando <span className="marker num">{formatCurrency(uploadedTotal)}</span>. Já estão salvas — desmarque as que não quer manter.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={toggleAll} disabled={phase === 'saving'}>
              {selected.size === uploaded.length ? 'Desmarcar todas' : 'Marcar todas'}
            </Button>
          </div>

          <ul className="divide-y divide-hairline border-y border-hairline max-h-[28rem] overflow-y-auto">
            {uploaded.map(exp => {
              const isSelected = selected.has(exp.id);
              return (
                <li key={exp.id}>
                  <label className={`flex items-center gap-4 py-3.5 px-1 cursor-pointer transition-opacity hover:bg-wash ${isSelected ? '' : 'opacity-40'}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(exp.id)}
                      disabled={phase === 'saving'}
                      className="w-4 h-4 accent-accent flex-shrink-0"
                    />
                    <span className="text-muted num text-sm w-[84px] flex-shrink-0">{formatDate(exp.date)}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">{exp.description}</span>
                      <span className="inline-flex items-center gap-2 text-sm text-muted">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColor(exp.category) }} aria-hidden="true" />
                        {exp.category}
                      </span>
                    </span>
                    <span className="font-medium num whitespace-nowrap">{formatCurrency(exp.amount)}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center gap-3">
            <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={discardAll} disabled={phase === 'saving'} className="sm:mr-auto">
              Descartar tudo
            </Button>
            <PillButton onClick={keep} disabled={selected.size === 0 || phase === 'saving'} icon={phase === 'saving' ? <Spinner size="sm" /> : <Check className="h-4 w-4" />}>
              Manter {selected.size} · {formatCurrency(selectedTotal)}
            </PillButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadComponent;
