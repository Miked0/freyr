import { useId, useState, type FormEvent } from 'react';
import { api } from '@/api';
import { LEGAL_DOCS, legalHref } from '@/legal/content';
import { BentoCard } from './BentoCard';
import { Button } from './Button';

/** Profile card with the privacy documents and the LGPD right to erase the account. */
export function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const id = useId();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteAccount(password);
      onDeleted();
    } catch (err) {
      setError((err as Error).message);
      setPassword('');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <BentoCard title="Privacidade e dados" span={4}>
      <p className="fr-field-hint">
        Suas descrições ficam cifradas com uma chave só sua. Leia a{' '}
        <a href={legalHref('privacidade')}>{LEGAL_DOCS.privacidade.linkLabel}</a>, os{' '}
        <a href={legalHref('termos')}>{LEGAL_DOCS.termos.linkLabel}</a> e{' '}
        <a href={legalHref('lgpd')}>{LEGAL_DOCS.lgpd.linkLabel}</a>.
      </p>
      <form className="fr-field" onSubmit={submit}>
        <span className="fr-field-label">Excluir conta</span>
        <p className="fr-field-hint">Apaga a conta, as transações, as categorias e as metas. Não dá para desfazer.</p>
        <label className="fr-field-hint" htmlFor={`${id}-password`}>Confirme com sua senha</label>
        <input
          id={`${id}-password`}
          className="fr-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error ? <p role="alert" className="fr-field-error">{error}</p> : null}
        <Button type="submit" variant="outline" disabled={!password || deleting}>
          {deleting ? 'Excluindo…' : 'Excluir minha conta'}
        </Button>
      </form>
    </BentoCard>
  );
}
