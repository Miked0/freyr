import React, { useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/freyr/Button';
import { CategoryTag } from '@/components/freyr/CategoryTag';
import { Icon } from '@/components/freyr/Icon';
import { cx } from '@/components/freyr/format';
import { api } from '@/api';
import { useExpenses } from '@/store/expenses';

const MAX_SIZE = 4 * 1024 * 1024;
// Bar heights of the pulsing chart placeholder shown while a statement is read.
const SKELETON = [62, 88, 40, 70, 30, 54];

interface DropzoneProps {
  onComplete?: () => void;
}

export function Dropzone({ onComplete }: DropzoneProps) {
  const { load } = useExpenses();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  // A ref, not state: two drops in the same tick would both still see uploading === null.
  const busy = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File | undefined) => {
    if (!file || busy.current) return;
    setError(null);

    if (!/\.(pdf|csv)$/i.test(file.name)) {
      setError('Formato não suportado. Envie um arquivo PDF ou CSV.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('Arquivo muito grande. O tamanho máximo é 4 MB.');
      return;
    }

    busy.current = true;
    setUploading(file.name);
    try {
      const result = await api.uploadStatement(file);
      await load();
      if (result.expenses.length === 0) {
        setError('Nenhuma transação foi encontrada nesse arquivo. Confira se ele tem data, descrição e valor em cada lançamento.');
        return;
      }
      onComplete?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      busy.current = false;
      setUploading(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [load, onComplete]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cx('fr-drop', isDragging && 'is-over')}
        role="region"
        aria-label="Área de envio de extrato"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.csv"
          // The button below is the keyboard path; skipping the hidden input avoids a second tab stop.
          tabIndex={-1}
          disabled={uploading !== null}
          onChange={e => processFile(e.target.files?.[0])}
          data-testid="statement-input"
        />
        <CategoryTag tone="muted">Importar</CategoryTag>
        <p className="fr-drop-title">{isDragging ? 'Solte o arquivo aqui' : 'Anexe ou arraste seu arquivo para iniciar a análise'}</p>
        <p className="fr-drop-hint">Extratos PDF ou CSV · até 4 MB</p>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading !== null}>
          <Icon name="import" size={16} />
          Escolher arquivo
        </Button>
      </label>

      <div aria-live="polite">
        {uploading && (
          <div className="fr-progress">
            <div className="fr-skel" aria-hidden="true">
              {SKELETON.map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}
            </div>
            <p className="fr-progress-step">Importando {uploading}… isso pode levar até um minuto.</p>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 animate-fade-in"
          style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--alert-soft)', color: 'var(--alert-deep)' }}
        >
          <div className="flex-1">
            <p style={{ margin: 0, fontWeight: 700 }}>Não foi possível processar o arquivo</p>
            <p style={{ margin: 0, marginTop: 'var(--space-1)', fontSize: 14, lineHeight: '20px' }}>{error}</p>
          </div>
          <button type="button" onClick={() => setError(null)} className="p-2 -m-2 cursor-pointer hover:opacity-70" aria-label="Fechar aviso">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default Dropzone;