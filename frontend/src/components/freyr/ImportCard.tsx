import { Dropzone } from '@/components/v2/Dropzone';
import { BentoCard, type BentoCardProps } from './BentoCard';

export interface ImportCardProps {
  span?: BentoCardProps['span'];
  /** Called after a statement is imported with at least one entry. */
  onComplete?: () => void;
}

export function ImportCard({ span, onComplete }: ImportCardProps) {
  return (
    <BentoCard span={span} id="importar" title="Importar extrato">
      <Dropzone onComplete={onComplete} />
    </BentoCard>
  );
}
