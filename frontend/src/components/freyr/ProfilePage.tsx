import { useId, useState, type FormEvent } from 'react';
import type { Profile, ProfilePatch } from '@/api';
import { AVATAR_COLORS, displayNameOf, formatBudget, parseBudget, useProfile, type AvatarColor } from '@/lib/useProfile';
import { BentoCard } from './BentoCard';
import { Button } from './Button';
import { Avatar, ProfileStyles } from './ProfileCard';

const NAME_MAX = 40;

const css = `
.fr-profile-form { display: grid; gap: var(--space-6); max-width: 560px; }
.fr-profile-preview { display: flex; align-items: center; gap: var(--space-4); min-width: 0; }
.fr-profile-preview .fr-profile-name { font-size: 20px; line-height: 28px; font-weight: 800; }
.fr-profile-preview .fr-profile-handle { font-size: 14px; line-height: 20px; }
.fr-field { display: grid; gap: var(--space-2); margin: 0; padding: 0; border: 0; min-width: 0; }
.fr-field-label { font-size: 12px; line-height: 16px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--ink-muted); padding: 0; }
.fr-field-hint { margin: 0; font-size: 13px; line-height: 18px; color: var(--ink-muted); }
.fr-field-error { margin: 0; font-size: 13px; line-height: 18px; font-weight: 700; color: var(--alert-deep); }
.fr-input { height: 44px; padding: 0 var(--space-3); border: var(--border-width) solid var(--line-strong); border-radius: var(--radius-sm); background: var(--background); color: var(--ink); font: inherit; font-size: 15px; min-width: 0; }
.fr-input:focus-visible { outline: 2px solid transparent; box-shadow: var(--focus-ring); }
.fr-input[aria-invalid="true"] { border-color: var(--alert); }
.fr-swatches { display: flex; flex-wrap: wrap; gap: var(--space-4); }
.fr-swatch { display: grid; justify-items: center; gap: var(--space-1); cursor: pointer; font-size: 12px; line-height: 16px; font-weight: 700; color: var(--ink-muted); }
.fr-swatch input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.fr-swatch-chip { width: 36px; height: 36px; border-radius: var(--radius-sm); }
.fr-swatch input:checked + .fr-swatch-chip { box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ink); }
.fr-swatch input:checked ~ .fr-swatch-name { color: var(--ink); }
.fr-swatch input:focus-visible + .fr-swatch-chip { box-shadow: var(--focus-ring); }
.fr-profile-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-4); }
.fr-profile-note { margin: 0; font-size: 14px; line-height: 20px; font-weight: 700; }
.fr-profile-note.is-ok { color: var(--positive-deep); }
.fr-profile-note.is-bad { color: var(--alert-deep); }
`;

/** The profile edit page: content only, rendered inside the app shell under the page header. */
export function ProfilePage() {
  const { profile, status, error, load } = useProfile();
  const [saved, setSaved] = useState(false);

  let body;
  if (profile) {
    // Remounts with the stored values after each save, so the form always starts from what the server keeps.
    body = <ProfileForm key={JSON.stringify(profile)} profile={profile} saved={saved} onSavedChange={setSaved} />;
  } else if (status === 'unavailable') {
    body = <p className="fr-field-hint">O perfil fica disponível quando você entra com uma conta.</p>;
  } else if (status === 'error') {
    body = (
      <div className="fr-profile-actions">
        <p role="alert" className="fr-profile-note is-bad">{error}</p>
        <Button variant="outline" onClick={() => load()}>Tentar de novo</Button>
      </div>
    );
  } else {
    body = <p role="status" className="fr-field-hint">Carregando perfil…</p>;
  }

  return (
    <div className="fr-bento">
      <ProfileStyles />
      <style href="freyr-profile-page" precedence="default">{css}</style>
      <BentoCard title="Seu perfil" span={8}>{body}</BentoCard>
    </div>
  );
}

interface ProfileFormProps {
  profile: Profile;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
}

function ProfileForm({ profile, saved, onSavedChange }: ProfileFormProps) {
  const { save } = useProfile();
  const id = useId();
  const [name, setName] = useState(profile.display_name ?? '');
  const [color, setColor] = useState<AvatarColor>(profile.avatar_color);
  const [budgetText, setBudgetText] = useState(formatBudget(profile.monthly_budget));
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const trimmedName = name.trim() || null;
  const budget = parseBudget(budgetText);
  const patch: ProfilePatch = {};
  if (trimmedName !== profile.display_name) patch.display_name = trimmedName;
  if (color !== profile.avatar_color) patch.avatar_color = color;
  if (budget !== profile.monthly_budget) patch.monthly_budget = budget ?? null;
  const dirty = Object.keys(patch).length > 0;
  const previewName = displayNameOf({ username: profile.username, display_name: trimmedName });

  const edited = () => {
    onSavedChange(false);
    setSaveError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || saving) return;
    if (budget === undefined) {
      setBudgetError('Escreva a meta em reais, como 2.500,00, ou deixe vazio.');
      return;
    }
    setSaving(true);
    try {
      await save(patch);
      onSavedChange(true);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="fr-profile-form" onSubmit={submit} noValidate>
      <div className="fr-profile-preview" data-testid="profile-preview">
        <Avatar name={previewName} color={color} size="lg" />
        <div className="fr-profile-text">
          <span className="fr-profile-name">{previewName}</span>
          <span className="fr-profile-handle">@{profile.username}</span>
        </div>
      </div>

      <div className="fr-field">
        <label className="fr-field-label" htmlFor={`${id}-name`}>Nome de exibição</label>
        <input
          id={`${id}-name`}
          className="fr-input"
          type="text"
          value={name}
          maxLength={NAME_MAX}
          placeholder={profile.username}
          autoComplete="name"
          aria-describedby={`${id}-name-hint`}
          onChange={e => { setName(e.target.value); edited(); }}
        />
        <p id={`${id}-name-hint`} className="fr-field-hint">Até {NAME_MAX} caracteres. Vazio, aparece @{profile.username}.</p>
      </div>

      <div className="fr-field">
        <span id={`${id}-color`} className="fr-field-label">Cor do avatar</span>
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
      </div>

      <div className="fr-field">
        <label className="fr-field-label" htmlFor={`${id}-budget`}>Meta de gasto mensal (R$)</label>
        <input
          id={`${id}-budget`}
          className="fr-input fr-num"
          type="text"
          inputMode="decimal"
          value={budgetText}
          placeholder="0,00"
          aria-invalid={budgetError ? true : undefined}
          aria-describedby={`${id}-budget-hint${budgetError ? ` ${id}-budget-error` : ''}`}
          onChange={e => { setBudgetText(e.target.value); setBudgetError(null); edited(); }}
        />
        <p id={`${id}-budget-hint`} className="fr-field-hint">O máximo que você quer gastar por mês. Deixe vazio para não usar.</p>
        {budgetError ? <p id={`${id}-budget-error`} role="alert" className="fr-field-error">{budgetError}</p> : null}
      </div>

      <div className="fr-profile-actions">
        <Button type="submit" variant="primary" disabled={!dirty || saving}>
          {saving ? 'Salvando…' : 'Salvar perfil'}
        </Button>
        {saveError ? <p role="alert" className="fr-profile-note is-bad">{saveError}</p> : null}
        {saved && !dirty ? <p role="status" className="fr-profile-note is-ok">Perfil salvo.</p> : null}
      </div>
    </form>
  );
}
