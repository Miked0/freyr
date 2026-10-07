import { useEffect } from 'react';
import { formatDue, sortByDue, useGoals } from '@/store/goals';
import { BentoCard } from './BentoCard';
import { TextLink } from './TextLink';
import { GoalProgress } from './GoalProgress';

const muted = { margin: 0, color: 'var(--ink-muted)' } as const;

/** The "Metas" card of the overview: the four goals closest to their due date. */
export function GoalsCard() {
  const { goals, status, load } = useGoals();

  useEffect(() => {
    if (useGoals.getState().status === 'idle') void load();
  }, [load]);

  let body;
  if (status === 'idle' || status === 'loading') {
    body = <p style={muted}>Carregando metas…</p>;
  } else if (status === 'error') {
    body = <p style={muted}>Não foi possível carregar suas metas agora.</p>;
  } else if (goals.length === 0) {
    body = (
      <div className="grid gap-3 justify-items-start">
        <p style={muted}>Viagem, reserva, carro novo: crie uma meta e veja quanto falta.</p>
        <TextLink href="#/metas">Criar minha primeira meta</TextLink>
      </div>
    );
  } else {
    body = (
      <div className="fr-goals grid gap-6">
        {sortByDue(goals).slice(0, 4).map(g => (
          <GoalProgress key={g.id} label={g.name} current={g.saved} target={g.target} due={g.due ? formatDue(g.due) : undefined} />
        ))}
      </div>
    );
  }

  return (
    <BentoCard title="Metas" action={<TextLink href="#/metas">Todas</TextLink>}>
      {body}
    </BentoCard>
  );
}
