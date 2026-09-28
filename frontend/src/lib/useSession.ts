import { useCallback, useEffect, useState } from 'react';
import { api, onUnauthorized, type Session } from '../api';

export type SessionState = 'checking' | 'required' | 'authenticated' | 'open' | 'offline';

const toState = (session: Session): SessionState =>
  !session.required ? 'open' : session.authenticated ? 'authenticated' : 'required';

export function useSession() {
  const [state, setState] = useState<SessionState>('checking');

  const refresh = useCallback(() => {
    api.session().then(s => setState(toState(s)), () => setState('offline'));
  }, []);

  useEffect(() => {
    onUnauthorized(() => setState('required'));
    api.session().then(s => setState(toState(s)), () => setState('offline'));
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setState('required');
  }, []);

  return { state, refresh, logout, canLogout: state === 'authenticated' };
}
