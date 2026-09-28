import { useEffect, useState } from 'react';
import { api, type Health } from '../api';

export type HealthState = { state: 'checking' } | { state: 'online'; health: Health } | { state: 'offline' };

export function useHealth(): HealthState {
  const [health, setHealth] = useState<HealthState>({ state: 'checking' });
  useEffect(() => {
    let cancelled = false;
    const check = () =>
      api.health()
        .then(h => !cancelled && setHealth({ state: 'online', health: h }))
        .catch(() => !cancelled && setHealth({ state: 'offline' }));
    check();
    const interval = window.setInterval(check, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);
  return health;
}
