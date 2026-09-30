import { CheckCircle, Loader2, FileText, AlertCircle } from 'lucide-react';

interface ImportProgressProps {
  phase: 'idle' | 'uploading' | 'processing' | 'review' | 'complete' | 'error';
  fileName?: string;
  progress?: number;
  total?: number;
  processed?: number;
  error?: string;
}

const phaseLabels: Record<ImportProgressProps['phase'], string> = {
  idle: 'Aguardando',
  uploading: 'Enviando arquivo',
  processing: 'Processando extrato',
  review: 'Pronto para revisão',
  complete: 'Importação concluída',
  error: 'Erro na importação'
};

const phaseIcons = {
  idle: FileText,
  uploading: Loader2,
  processing: Loader2,
  review: CheckCircle,
  complete: CheckCircle,
  error: AlertCircle
};

export default function ImportProgress({
  phase,
  fileName,
  progress,
  total,
  processed,
  error
}: ImportProgressProps) {
  const Icon = phaseIcons[phase];
  const isLoading = phase === 'uploading' || phase === 'processing';

  return (
    <div className="dropzone flex flex-col items-center gap-4 !text-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <Icon
          className={`h-7 w-7 flex-shrink-0 ${
            phase === 'error' ? 'text-danger' :
            phase === 'complete' || phase === 'review' ? 'text-success' :
            'text-accent animate-spin'
          }`}
          strokeWidth={1.75}
        />
        <div className="text-left">
          <p className="text-xl font-medium">{phaseLabels[phase]}</p>
          {fileName && <p className="text-muted text-sm">{fileName}</p>}
        </div>
      </div>

      {isLoading && progress !== undefined && (
        <div className="w-full max-w-md">
          <div className="h-2 bg-hairline rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="text-sm text-muted mt-1">
            {phase === 'processing' && processed !== undefined && total !== undefined
              ? `Analisando lançamento ${processed} de ${total}...`
              : `Progresso: ${Math.round(progress)}%`}
          </p>
        </div>
      )}

      {phase === 'review' && total !== undefined && (
        <p className="text-muted">
          {total} {total === 1 ? 'lançamento encontrado' : 'lançamentos encontrados'} — revise e confirme.
        </p>
      )}

      {phase === 'complete' && total !== undefined && (
        <p className="text-success font-medium">
          {total} {total === 1 ? 'lançamento importado' : 'lançamentos importados'} com sucesso!
        </p>
      )}

      {phase === 'error' && error && (
        <div className="p-3 rounded-xl bg-danger-soft text-danger text-sm max-w-md text-center">
          <p className="font-medium">Erro ao processar</p>
          <p className="mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}