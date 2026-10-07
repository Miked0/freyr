import type { ImportedFile } from '@/api';
import { LEGAL_DOCS, legalHref, type LegalDocKey } from '@/legal/content';
import { BentoCard } from '../../BentoCard';
import { Button } from '../../Button';
import { Icon } from '../../Icon';
import { ImportHistory } from '../../settings/ImportHistory';
import { SettingRow } from '../../settings/SettingRow';

const DOCS: LegalDocKey[] = ['privacidade', 'termos', 'lgpd'];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface DataSectionProps {
  /** Null when the account cannot manage its statements yet. */
  files: ImportedFile[] | null;
  onRemoveFile: (file: ImportedFile) => void;
  /** Undefined when there is nothing to download. */
  onDownload?: () => void;
}

/** Privacy documents, the statements sent and the LGPD copy of the data. */
export function DataSection({ files, onRemoveFile, onDownload }: DataSectionProps) {
  const total = files?.reduce((sum, file) => sum + file.transactions, 0) ?? 0;
  return (
    <BentoCard title="Dados e privacidade" id="dados" className="fr-settings-card">
      <div>
        <SettingRow title="Seus dados ficam cifrados" stack>
          <div className="fr-privacy-seal">
            <span className="fr-privacy-seal-icon" aria-hidden="true"><Icon name="shield" size={16} /></span>
            <p>Suas descrições são cifradas com uma chave exclusiva da sua conta.</p>
          </div>
          <ul className="fr-privacy-docs">
            {DOCS.map(key => (
              <li key={key}>
                <a href={legalHref(key)}>{LEGAL_DOCS[key].linkLabel}<Icon name="arrow" size={16} /></a>
              </li>
            ))}
          </ul>
        </SettingRow>
        {files ? (
          <SettingRow
            title="Extratos enviados"
            description={files.length ? `${plural(files.length, 'extrato', 'extratos')}, ${plural(total, 'transação', 'transações')}. Apagar um extrato apaga as transações que vieram dele.` : undefined}
            stack
          >
            <ImportHistory items={files} onRemove={onRemoveFile} />
          </SettingRow>
        ) : null}
        <SettingRow title="Baixar meus dados" description="Todas as suas transações em CSV, que abre no Excel. Seu direito pela LGPD.">
          <Button variant="outline" onClick={onDownload} disabled={!onDownload}><Icon name="export" size={16} />Baixar CSV</Button>
        </SettingRow>
      </div>
    </BentoCard>
  );
}
