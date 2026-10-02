import { useEffect, useState } from 'react';
import { api } from '../api';

/** Whether the server has "Entrar com Google" set up; false until it answers or if it cannot be reached. */
export function useGoogleLogin(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let cancelled = false;
    api.health().then(h => !cancelled && setAvailable(h.googleLogin === true)).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return available;
}

/** Reads a flag the server left in the address after the Google round trip, then removes it. */
export function takeSearchParam(name: string): string | null {
  const url = new URL(window.location.href);
  const value = url.searchParams.get(name);
  if (value !== null) {
    url.searchParams.delete(name);
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }
  return value;
}
