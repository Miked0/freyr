import React, { useRef, useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, X } from 'lucide-react';
import PillButton from '@/components/ui/PillButton';
import Spinner from '@/components/ui/Spinner';
import { api } from '@/api';
import { useExpenses } from '@/store/expenses';

const MAX_SIZE = 4 * 1024 * 1024;

interface DropzoneProps {
  onComplete?: () => void;
}

export function Dropzone({ onComplete }: DropzoneProps) {
  const { load } = useExpenses();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (!/\.(pdf|csv)$/i.test(file.name)) {
      setError('Formato não suportado. Envie um arquivo PDF ou CSV.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('Arquivo muito grande. O tamanho máximo é 4 MB.');
      return;
    }

    try {
      const result = await api.uploadStatement(file);
      await load();
      if (result.expenses.length === 0) {
        setError('Nenhuma despesa foi encontrada nesse arquivo. Confira se ele tem data, descrição e valor em cada lançamento.');
        return;
      }
      onComplete?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
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
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv"
        className="hidden"
        onChange={e => processFile(e.target.files?.[0])}
        data-testid="statement-input"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`dropzone flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 !text-left ${isDragging ? 'dropzone-active' : ''}`}
        role="region"
        aria-label="Área de envio de extrato"
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
    </div>
  );
}

export default Dropzone;