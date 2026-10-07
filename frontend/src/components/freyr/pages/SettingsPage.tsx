import { PageHeader } from '../PageHeader';
import { AppearanceCard } from './AppearanceCard';
import { ImportHistoryCard } from './ImportHistoryCard';
import { ProfileTabs } from './ProfileTabs';

export function SettingsPage() {
  return (
    <>
      <PageHeader page="Perfil" title="Perfil e preferências" phrase="A conta é sua. Deixe com a sua cara." />
      <ProfileTabs current="settings" />
      <div className="fr-bento">
        <ImportHistoryCard />
        <AppearanceCard />
      </div>
    </>
  );
}
