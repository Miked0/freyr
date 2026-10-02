import { PageHeader } from '../PageHeader';
import { ProfilePage as ProfileContent } from '../ProfilePage';

export function ProfilePage() {
  return (
    <>
      <PageHeader page="Perfil" title="Perfil e preferências" phrase="A conta é sua. Deixe com a sua cara." />
      <ProfileContent />
    </>
  );
}
