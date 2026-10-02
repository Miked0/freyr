import { useId, useState, type FormEvent } from 'react';
import { api } from '@/api';
import { LEGAL_DOCS, legalHref } from '@/legal/content';
import { BentoCard } from './BentoCard';
import { Button } from './Button';

/**
 * Profile card with the privacy documents and the LGPD right to erase the account.
 * Accounts created through Google have no password, so they pass `username` and confirm by typing it.
 */
export function DeleteAccount({ onDeleted, username }: { onDeleted: () => void; username?: string }) {
  const id = useId();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const ready = username ? confirmation === username : !!confirmation;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteAccount(username ? { username: confirmation } : { password: confirmation });
      onDeleted();
    } catch (err) {
      setError((err as Error).message);
      setConfirmation('');
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
        <label className="fr-field-hint" htmlFor={`${id}-confirmation`}>
          {username ? `Digite ${username} para confirmar` : 'Confirme com sua senha'}
        </label>
        <input
          id={`${id}-confirmation`}
          className="fr-input"
          type={username ? 'text' : 'password'}
          autoComplete={username ? 'off' : 'current-password'}
          value={confirmation}
          onChange={e => setConfirmation(e.target.value)}
        />
        {error ? <p role="alert" className="fr-field-error">{error}</p> : null}
        <Button type="submit" variant="outline" disabled={!ready || deleting}>
          {deleting ? 'Excluindo…' : 'Excluir minha conta'}
        </Button>
      </form>
    </BentoCard>
  );
}
