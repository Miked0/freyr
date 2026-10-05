import { routeHref, type Route } from '@/lib/useRoute';
import { SideNav } from './SideNav';
import { ProfileCard } from './ProfileCard';
import { ThemeToggle } from './ThemeToggle';

export interface FreyrSideNavProps {
  transactionCount: number;
  /** The page on screen; its item is marked as current. */
  route: Route;
  onLogout?: () => void;
}

export function FreyrSideNav({ transactionCount, route, onLogout }: FreyrSideNavProps) {
  const item = (r: Route) => ({ href: routeHref(r), active: route === r });
  return (
    <SideNav
      sections={[
        {
          title: 'Principal',
          items: [
            { icon: 'overview', label: 'Visão geral', ...item('overview') },
            { icon: 'transactions', label: 'Transações', count: transactionCount, ...item('transactions') },
            { icon: 'categories', label: 'Categorias', ...item('categories') },
            { icon: 'goals', label: 'Metas', ...item('goals') },
          ],
        },
      ]}
      footer={
        <div className="fr-side-foot mt-auto">
          <ProfileCard onLogout={onLogout} />
          <ThemeToggle />
        </div>
      }
    />
  );
}
