/**
 * Feature flag utilities for gradual rollout of ui_v2.
 * Uses localStorage for allowlist + percentage rollout.
 * Server-side config could be added later via API.
 */

// Test group allowlist (user IDs or emails)
const ALLOWLIST_KEY = 'freyr_v2_allowlist';

// Percentage rollout (0-100)
const ROLLOUT_PERCENT_KEY = 'freyr_v2_rollout_percent';

// Stored user preference (for opt-in/opt-out)
const USER_PREF_KEY = 'freyr_v2_user_preference';

/** Check if user is in allowlist */
export function isInAllowlist(userId?: string): boolean {
  try {
    const list = JSON.parse(localStorage.getItem(ALLOWLIST_KEY) || '[]') as string[];
    if (!userId) return false;
    return list.includes(userId);
  } catch {
    return false;
  }
}

/** Check if user is in percentage rollout */
export function isInRollout(userId?: string, percent: number = 100): boolean {
  if (percent <= 0) return false;
  if (percent >= 100) return true;
  if (!userId) return false;

  // Deterministic hash-based assignment
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  const bucket = Math.abs(hash) % 100;
  return bucket < percent;
}

/** Get effective v2 flag for current user */
export function isV2Enabled(userId?: string): boolean {
  // 1. Check explicit user preference (opt-in/opt-out)
  try {
    const pref = localStorage.getItem(USER_PREF_KEY);
    if (pref === 'enabled') return true;
    if (pref === 'disabled') return false;
  } catch {
    // ignore
  }

  // 2. Check allowlist
  if (isInAllowlist(userId)) return true;

  // 3. Check percentage rollout (default 100% for now - can be lowered)
  const rolloutPercent = getRolloutPercent();
  return isInRollout(userId, rolloutPercent);
}

/** Get current rollout percentage */
export function getRolloutPercent(): number {
  try {
    const val = localStorage.getItem(ROLLOUT_PERCENT_KEY);
    return val ? parseInt(val, 10) : 100;
  } catch {
    return 100;
  }
}

/** Set rollout percentage (admin/dev only) */
export function setRolloutPercent(percent: number): void {
  localStorage.setItem(ROLLOUT_PERCENT_KEY, String(Math.max(0, Math.min(100, percent))));
}

/** Add user to allowlist */
export function addToAllowlist(userId: string): void {
  try {
    const list = JSON.parse(localStorage.getItem(ALLOWLIST_KEY) || '[]') as string[];
    if (!list.includes(userId)) {
      list.push(userId);
      localStorage.setItem(ALLOWLIST_KEY, JSON.stringify(list));
    }
  } catch {
    // ignore
  }
}

/** Remove user from allowlist */
export function removeFromAllowlist(userId: string): void {
  try {
    const list = JSON.parse(localStorage.getItem(ALLOWLIST_KEY) || '[]') as string[];
    const filtered = list.filter(id => id !== userId);
    localStorage.setItem(ALLOWLIST_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

/** Set user preference (opt-in/opt-out) */
export function setUserPreference(pref: 'enabled' | 'disabled' | 'auto'): void {
  if (pref === 'auto') {
    localStorage.removeItem(USER_PREF_KEY);
  } else {
    localStorage.setItem(USER_PREF_KEY, pref);
  }
}

/** Get user preference */
export function getUserPreference(): 'enabled' | 'disabled' | 'auto' {
  try {
    const val = localStorage.getItem(USER_PREF_KEY);
    return (val as 'enabled' | 'disabled' | 'auto') || 'auto';
  } catch {
    return 'auto';
  }
}

/** Reset all feature flag state (for testing) */
export function resetFeatureFlags(): void {
  localStorage.removeItem(ALLOWLIST_KEY);
  localStorage.removeItem(ROLLOUT_PERCENT_KEY);
  localStorage.removeItem(USER_PREF_KEY);
}