import { useEffect } from 'react';
import { create } from 'zustand';
import { api, UnauthorizedError, type Profile, type ProfilePatch } from '../api';

export type AvatarColor = Profile['avatar_color'];

/** Avatar colors in picker order: design-system token plus the name shown to the user. */
export const AVATAR_COLORS: ReadonlyArray<{ token: AvatarColor; label: string }> = [
  { token: 'brand-primary', label: 'Aurora' },
  { token: 'frost', label: 'Geada' },
  { token: 'brand-warm', label: 'Colheita' },
  { token: 'positive', label: 'Floresta' },
  { token: 'alert', label: 'Brasa' },
  { token: 'hero', label: 'Noite' },
];

// Frost and harvest are light in both themes, so cream initials fall under 4.5:1; on-warm (dark in both) reads on them.
const AVATAR_TEXT: Record<AvatarColor, string> = {
  'brand-primary': 'var(--on-brand)',
  frost: 'var(--on-warm)',
  'brand-warm': 'var(--on-warm)',
  positive: 'var(--on-brand)',
  alert: 'var(--on-brand)',
  hero: 'var(--on-hero)',
};

export function avatarStyle(color: AvatarColor) {
  return { background: `var(--${color})`, color: AVATAR_TEXT[color] };
}

export function displayNameOf(profile: Pick<Profile, 'username' | 'display_name'>): string {
  return profile.display_name?.trim() || profile.username;
}

/** First letter of the first and last words; a single word gives its first two letters. */
export function avatarInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words.length === 1 ? Array.from(words[0]).slice(0, 2) : [Array.from(words[0])[0], Array.from(words[words.length - 1])[0]];
  return letters.join('').toLocaleUpperCase('pt-BR');
}

/**
 * Reads a budget typed in Brazilian format ("2.500,50", "R$ 99,9", "2500"); a dot with exactly three
 * digits after it is a thousands separator. Empty means no budget (null); unreadable gives undefined.
 */
export function parseBudget(text: string): number | null | undefined {
  const value = text.trim().replace(/^R\$\s*/i, '');
  if (!value) return null;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(value)) return Number(value.replace(/\./g, '').replace(',', '.'));
  if (/^\d+(,\d{1,2})?$/.test(value)) return Number(value.replace(',', '.'));
  if (/^\d+(\.\d{1,2})?$/.test(value)) return Number(value);
  return undefined;
}

export function formatBudget(value: number | null): string {
  return value == null ? '' : value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type ProfileStatus = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';

interface ProfileState {
  profile: Profile | null;
  /** `unavailable`: no logged-in account (open session), so there is no profile to show. */
  status: ProfileStatus;
  error: string | null;
  load: () => Promise<void>;
  save: (patch: ProfilePatch) => Promise<Profile>;
}

// Bumped on reset so a response for the previous account never lands in the store.
let generation = 0;
let loading = false;
// Bumped on each save so a refresh that started before it cannot bring back the older profile.
let saves = 0;

const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  status: 'idle',
  error: null,

  load: async () => {
    if (loading) return;
    const current = generation;
    const savesBefore = saves;
    // A refresh keeps the profile on screen; only the first load shows as loading.
    set({ status: get().profile ? 'ready' : 'loading', error: null });
    loading = true;
    try {
      const profile = await api.getProfile();
      if (current === generation && savesBefore === saves) set({ profile, status: 'ready' });
    } catch (err) {
      if (current !== generation) return;
      if (err instanceof UnauthorizedError) set({ profile: null, status: 'unavailable' });
      else if (get().profile) set({ status: 'ready', error: (err as Error).message });
      else set({ status: 'error', error: (err as Error).message });
    } finally {
      if (current === generation) loading = false;
    }
  },

  save: async patch => {
    const current = generation;
    const profile = await api.updateProfile(patch);
    saves += 1;
    if (current === generation) set({ profile, status: 'ready', error: null });
    return profile;
  },
}));

/** The profile already loaded (by the shell's profile card), without asking the server for it again. */
export function useLoadedProfile(): Profile | null {
  return useProfileStore(state => state.profile);
}

/** Puts a profile in the store as if it had loaded; for tests and previews. */
export function setLoadedProfile(profile: Profile | null) {
  useProfileStore.setState({ profile, status: profile ? 'ready' : 'idle', error: null });
}

/** Forgets the loaded profile, e.g. on logout, so the next account loads its own. */
export function resetProfile() {
  generation += 1;
  loading = false;
  useProfileStore.setState({ profile: null, status: 'idle', error: null });
}

/**
 * The logged-in user's profile, shared by every component. Each component that mounts refreshes it,
 * so a page shown after a new login never keeps the previous account's profile for long.
 */
export function useProfile() {
  const state = useProfileStore();
  const { status, load } = state;
  useEffect(() => {
    load();
  }, [load]);
  // After a reset while mounted, load again for whoever is logged in now.
  useEffect(() => {
    if (status === 'idle') load();
  }, [status, load]);
  return state;
}
