import { useId, useState, type FormEvent } from 'react';
import { api } from '@/api';
import { ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';
import { LEGAL_DOCS, legalHref, type LegalDocKey } from '@/legal/content';
import { BentoCard } from './BentoCard';
import { Button } from './Button';

const css = `
.fr-privacy-seal { display: flex; align-items: center; gap: var(--space-3); margin: 0; }
.fr-privacy-seal-icon { flex: none; display: grid; place-items: center; width: 32px; height: 32px; border-radius: var(--radius-md); background: var(--positive-soft); color: var(--positive-deep); }
.fr-privacy-seal p { margin: 0; font-size: 13px; line-height: 18px; color: var(--ink-muted); }
.fr-privacy-docs { list-style: none; margin: 0; padding: 0; border-top: var(--border-width) solid var(--line); }
.fr-privacy-docs li { border-bottom: var(--border-width) solid var(--line); }
.fr-privacy-docs a { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); min-height: 44px; font-size: 14px; line-height: 20px; color: var(--ink); text-decoration: none; border-radius: var(--radius-xs); transition: color 160ms ease-out; }
.fr-privacy-docs a svg { color: var(--ink-muted); transition: transform 160ms ease-out, color 160ms ease-out; }
.fr-privacy-docs a:hover { color: var(--link); }
.fr-privacy-docs a:hover svg { color: var(--link); transform: translateX(2px); }
.fr-privacy-docs a:focus-visible, .fr-privacy-danger:focus-visible { outline: 2px solid transparent; box-shadow: var(--focus-ring); }
.fr-privacy-danger { display: inline-flex; align-items: center; gap: var(--space-1); justify-self: start; padding: 0; border: 0; background: none; font: inherit; font-size: 13px; line-height: 18px; color: var(--ink-muted); cursor: pointer; border-radius: var(--radius-xs); }
.fr-privacy-danger:hover, .fr-privacy-danger[aria-expanded="true"] { color: var(--alert-deep); }
`;

const DOCS: LegalDocKey[] = ['privacidade', 'termos', 'lgpd'];

/** Profile card with the privacy documents and the LGPD right to erase the account. */
export function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const id = useId();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [asking, setAsking] = useState(false);

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
      <style href="freyr-privacy" precedence="default">{css}</style>
      <div className="fr-privacy-seal">
        <span className="fr-privacy-seal-icon" aria-hidden="true"><ShieldCheck size={16} strokeWidth={2} /></span>
        <p>Suas descrições ficam cifradas com uma chave só sua.</p>
      </div>
      <ul className="fr-privacy-docs">
        {DOCS.map(key => (
          <li key={key}>
            <a href={legalHref(key)}>
              {LEGAL_DOCS[key].linkLabel}
              <ChevronRight size={16} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="fr-privacy-danger"
        aria-expanded={asking}
        aria-controls={`${id}-delete`}
        onClick={() => setAsking(open => !open)}
      >
        Excluir conta
        <ChevronDown size={14} aria-hidden="true" style={{ transform: asking ? 'rotate(180deg)' : undefined }} />
      </button>
      {asking ? (
        <form id={`${id}-delete`} className="fr-field" onSubmit={submit}>
          <p className="fr-field-hint">Apaga a conta, as transações, as categorias e as metas. Não dá para desfazer.</p>
          <label className="fr-field-hint" htmlFor={`${id}-password`}>Confirme com sua senha</label>
          <input
            id={`${id}-password`}
            className="fr-input"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error ? <p role="alert" className="fr-field-error">{error}</p> : null}
          <Button type="submit" variant="outline" disabled={!password || deleting}>
            {deleting ? 'Excluindo…' : 'Excluir minha conta'}
          </Button>
        </form>
      ) : null}
    </BentoCard>
  );
}
