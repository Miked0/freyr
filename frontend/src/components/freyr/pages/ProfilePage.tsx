import { PageHeader } from '../PageHeader';
import { ProfilePage as ProfileContent } from '../ProfilePage';
import { ProfileTabs } from './ProfileTabs';

export function ProfilePage() {
  return (
    <>
      <PageHeader page="Perfil" title="Perfil e preferências" phrase="A conta é sua. Deixe com a sua cara." />
      <ProfileTabs current="profile" />
      <ProfileContent />
    </>
  );
}
