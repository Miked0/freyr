import { routeHref } from '@/lib/useRoute';
import { avatarInitials, avatarStyle, displayNameOf, resetProfile, useProfile, type AvatarColor } from '@/lib/useProfile';

const css = `
.fr-profile { display: grid; gap: var(--space-2); min-width: 0; }
.fr-profile-link { display: flex; align-items: center; gap: var(--space-3); min-width: 0; padding: var(--space-2); border-radius: var(--radius-sm); color: var(--ink); text-decoration: none; }
.fr-profile-link:hover { background: var(--skeleton); }
.fr-profile-link:focus-visible { outline: 2px solid transparent; box-shadow: var(--focus-ring); }
.fr-profile-text { display: grid; min-width: 0; }
.fr-profile-name { font-size: 14px; line-height: 20px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fr-profile-handle { font-size: 12px; line-height: 16px; color: var(--ink-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fr-profile-out { justify-self: start; margin-left: var(--space-2); padding: 0; border: 0; background: transparent; font: inherit; font-size: 14px; font-weight: 700; color: var(--ink-muted); cursor: pointer; border-radius: 2px; }
.fr-profile-out:hover { color: var(--ink); text-decoration: underline; text-underline-offset: 0.3em; }
.fr-profile-out:focus-visible { outline: 2px solid transparent; box-shadow: var(--focus-ring); }
.fr-avatar { display: grid; place-items: center; flex-shrink: 0; width: 36px; height: 36px; border-radius: var(--radius-sm); font-size: 13px; line-height: 1; font-weight: 800; letter-spacing: 0.5px; user-select: none; }
.fr-avatar.is-lg { width: 64px; height: 64px; font-size: 22px; }
.fr-avatar.is-empty { background: var(--skeleton); }
@media (max-width: 860px) {
  .fr-profile { display: flex; align-items: center; gap: var(--space-3); }
  .fr-profile-text { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .fr-profile-link { padding: 0; }
  .fr-profile-out { margin-left: 0; }
}
`;

export interface AvatarProps {
  name: string;
  color?: AvatarColor;
  size?: 'md' | 'lg';
}

/** Square initials badge with straight corners, like the rune-cut icons. Decorative: the name is always written next to it. */
export function Avatar({ name, color, size = 'md' }: AvatarProps) {
  return (
    <span
      className={'fr-avatar' + (size === 'lg' ? ' is-lg' : '') + (color ? '' : ' is-empty')}
      style={color ? avatarStyle(color) : undefined}
      aria-hidden="true"
    >
      {color ? avatarInitials(name) : null}
    </span>
  );
}

export function ProfileStyles() {
  return <style href="freyr-profile" precedence="default">{css}</style>;
}

export interface ProfileCardProps {
  /** Shows "Sair" when given; may return a promise that settles once the session has ended. */
  onLogout?: () => void | Promise<void>;
}

export function ProfileCard({ onLogout }: ProfileCardProps) {
  const { profile, status } = useProfile();

  const logout = async () => {
    try {
      await onLogout?.();
    } finally {
      resetProfile();
    }
  };

  const name = profile ? displayNameOf(profile) : 'Seu perfil';

  return (
    <div className="fr-profile">
      <ProfileStyles />
      {status === 'unavailable' ? null : (
        <a
          href={routeHref('profile')}
          className="fr-profile-link"
          title="Editar perfil"
          aria-busy={status === 'loading' || status === 'idle' ? true : undefined}
        >
          <Avatar name={name} color={profile?.avatar_color} />
          <span className="fr-profile-text">
            <span className="fr-profile-name">{name}</span>
            {profile ? <span className="fr-profile-handle">@{profile.username}</span> : null}
            <span className="sr-only">Editar perfil</span>
          </span>
        </a>
      )}
      {onLogout ? (
        <button type="button" className="fr-profile-out" onClick={logout}>
          Sair
        </button>
      ) : null}
    </div>
  );
}
