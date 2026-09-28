import { useCallback, useEffect, useState } from 'react';
import { api, onUnauthorized, type Session, type User } from '../api';

export type SessionState = 'checking' | 'required' | 'authenticated' | 'open' | 'offline';

const toState = (session: Session): SessionState =>
  session.authenticated ? 'authenticated' : 'required';

export function useSession() {
  const [state, setState] = useState<SessionState>('checking');
  const [user, setUser] = useState<User | null>(null);

  const refresh = useCallback(() => {
    api.session().then(s => {
      setState(toState(s));
      setUser(s.user);
    }, () => setState('offline'));
  }, []);

  useEffect(() => {
    onUnauthorized(() => {
      setState('required');
      setUser(null);
    });
    api.session().then(s => {
      setState(toState(s));
      setUser(s.user);
    }, () => setState('offline'));
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setState('required');
    setUser(null);
  }, []);

  return { state, user, refresh, logout, canLogout: state === 'authenticated' };
}