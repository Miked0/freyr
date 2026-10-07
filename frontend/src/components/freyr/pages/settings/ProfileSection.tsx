import { useId, useState, type FormEvent } from 'react';
import type { Profile } from '@/api';
import { AVATAR_COLORS, displayNameOf, useProfile, type AvatarColor } from '@/lib/useProfile';
import { BentoCard } from '../../BentoCard';
import { Button } from '../../Button';
import { Avatar } from '../../ProfileCard';
import { SettingRow } from '../../settings/SettingRow';

const NAME_MAX = 40;

/** Name and avatar color: how the person shows up in the menu. The username is shown, never edited. */
export function ProfileSection({ profile }: { profile: Profile }) {
  const { save } = useProfile();
  const id = useId();
  const [name, setName] = useState(profile.display_name ?? '');
  const [color, setColor] = useState<AvatarColor>(profile.avatar_color);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim() || null;
  const dirty = trimmed !== profile.display_name || color !== profile.avatar_color;
  const preview = displayNameOf({ username: profile.username, display_name: trimmed });

  const edited = () => {
    setSaved(false);
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await save({
        ...(trimmed !== profile.display_name ? { display_name: trimmed } : {}),
        ...(color !== profile.avatar_color ? { avatar_color: color } : {}),
      });
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BentoCard title="Perfil" id="perfil" className="fr-settings-card">
      <form onSubmit={submit} noValidate>
        <SettingRow title="Como você aparece" description="Nome e cor do avatar aparecem no menu e nas telas do Freyr. Só você vê.">
          <div className="fr-profile-preview" data-testid="profile-preview">
            <Avatar name={preview} color={color} size="lg" />
            <span className="fr-profile-text">
              <span className="fr-profile-name">{preview}</span>
              <span className="fr-profile-handle">@{profile.username}</span>
            </span>
          </div>
        </SettingRow>
        <SettingRow title={<label htmlFor={`${id}-name`}>Nome de exibição</label>} description={`Pode ser só o primeiro nome. Até ${NAME_MAX} caracteres; vazio, aparece @${profile.username}.`}>
          <input
            id={`${id}-name`}
            className="fr-input"
            type="text"
            value={name}
            maxLength={NAME_MAX}
            placeholder={profile.username}
            autoComplete="name"
            onChange={e => { setName(e.target.value); edited(); }}
          />
        </SettingRow>
        <SettingRow title="Nome de usuário" description="É o que você usa para entrar. Não dá para trocar.">
          <span className="fr-readonly">@{profile.username}</span>
        </SettingRow>
        <SettingRow title={<span id={`${id}-color`}>Cor do avatar</span>}>
          <div role="radiogroup" aria-labelledby={`${id}-color`} className="fr-swatches">
            {AVATAR_COLORS.map(option => (
              <label key={option.token} className="fr-swatch">
                <input
                  type="radio"
                  name={`${id}-avatar-color`}
                  value={option.token}
                  checked={color === option.token}
                  onChange={() => { setColor(option.token); edited(); }}
                />
                <span className="fr-swatch-chip" style={{ background: `var(--${option.token})` }} aria-hidden="true" />
                <span className="fr-swatch-name">{option.label}</span>
              </label>
            ))}
          </div>
        </SettingRow>
        <div className="fr-settings-save">
          <Button type="submit" variant="primary" disabled={!dirty || saving}>{saving ? 'Salvando…' : 'Salvar perfil'}</Button>
          {error ? <p role="alert" className="fr-profile-note is-bad">{error}</p> : null}
          {saved && !dirty ? <p role="status" className="fr-profile-note is-ok">Perfil salvo.</p> : null}
        </div>
      </form>
    </BentoCard>
  );
}
