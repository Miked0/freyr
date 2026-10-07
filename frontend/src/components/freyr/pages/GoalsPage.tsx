import { PageHeader } from '../PageHeader';
import { GoalsPage as GoalsContent } from '../GoalsPage';

export function GoalsPage() {
  return (
    <>
      <PageHeader page="Metas" title="Aonde você quer chegar" phrase="Diga quanto quer juntar e veja a colheita crescer a cada real guardado." />
      <GoalsContent />
    </>
  );
}
