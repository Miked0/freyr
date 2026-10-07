import { BentoCard } from './BentoCard';

export interface GoogleAccountProps {
  /** The account can already be opened with Google. */
  linked: boolean;
  /** The server has Google login set up. */
  available: boolean;
  /** The last attempt chose a Google account that belongs to another login. */
  conflict?: boolean;
}

/** Profile card that links the current account to Google, so "Entrar com Google" opens this same data. */
export function GoogleAccount({ linked, available, conflict = false }: GoogleAccountProps) {
  if (!linked && !available) return null;
  return (
    <BentoCard title="Conta Google" span={4}>
      {linked ? (
        <p className="fr-profile-note is-ok">Conectada. Você pode entrar com o Google.</p>
      ) : (
        <div className="fr-field">
          <p className="fr-field-hint">Conecte para entrar com o Google sem precisar da senha.</p>
          <a className="fr-btn fr-btn-outline" href="/api/auth/google">Conectar conta Google</a>
          {conflict ? (
            <p role="alert" className="fr-field-error">Essa conta Google já está ligada a outra conta do Freyr.</p>
          ) : null}
        </div>
      )}
    </BentoCard>
  );
}
