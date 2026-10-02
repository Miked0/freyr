import { useEffect, useRef } from 'react';
import { useExpenses } from '@/store/expenses';
import { useRoute, type Route } from '@/lib/useRoute';
import { AppShell } from './AppShell';
import { FreyrSideNav } from './FreyrSideNav';
import { OverviewPage } from './pages/OverviewPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ProfilePage } from './pages/ProfilePage';
import { GoalsPage } from './pages/GoalsPage';

export interface DashboardProps {
  onLogout?: () => void;
}

/** The signed-in app: the side nav plus the page named by the location hash. */
export function Dashboard({ onLogout }: DashboardProps) {
  const { expenses } = useExpenses();
  const { route, navigate } = useRoute();

  const shown = useRef<Route>(route);
  useEffect(() => {
    if (shown.current === route) return;
    shown.current = route;
    window.scrollTo({ top: 0 });
  }, [route]);

  return (
    <AppShell nav={<FreyrSideNav transactionCount={expenses.length} route={route} onLogout={onLogout} />}>
      {route === 'transactions' ? <TransactionsPage />
        : route === 'categories' ? <CategoriesPage />
        : route === 'goals' ? <GoalsPage />
        : route === 'profile' ? <ProfilePage />
        : <OverviewPage onImported={() => navigate('transactions')} />}
    </AppShell>
  );
}
