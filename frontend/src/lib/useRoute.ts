import { useCallback, useEffect, useState } from 'react';

export type Route = 'overview' | 'transactions' | 'categories' | 'goals' | 'profile';

const paths: Record<Route, string> = {
  overview: '',
  transactions: 'transacoes',
  categories: 'categorias',
  goals: 'metas',
  profile: 'perfil',
};

/** Maps a location hash to a page. Accepts "#/transacoes" and the older "#transacoes"; anything unknown is the overview. */
export function routeFromHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  const match = (Object.keys(paths) as Route[]).find(r => paths[r] === path);
  return match ?? 'overview';
}

export function routeHref(route: Route): string {
  return '#/' + paths[route];
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(() => routeFromHash(window.location.hash));

  useEffect(() => {
    const sync = () => {
      const current = routeFromHash(window.location.hash);
      // Older "#transacoes" anchors and unknown paths settle on the canonical link without a new history entry.
      if (window.location.hash && window.location.hash !== routeHref(current)) {
        history.replaceState(history.state, '', routeHref(current));
      }
      setRoute(current);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const navigate = useCallback((to: Route) => {
    window.location.hash = routeHref(to);
    setRoute(to);
  }, []);

  return { route, navigate };
}
