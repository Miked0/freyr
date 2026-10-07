import { useEffect, useId, useState, type FormEvent } from 'react';
import { formatDue, parseAmount, useGoals } from '@/store/goals';
import type { Goal, GoalInput } from '@/lib/goalsApi';
import { BentoCard } from './BentoCard';
import { Button } from './Button';
import { TextLink } from './TextLink';
import { GoalProgress } from './GoalProgress';

const NAME_MAX = 40;
const muted = { margin: 0, color: 'var(--ink-muted)' } as const;
const alertBox = 'p-3 text-sm text-alert bg-alert-soft';

const amountText = (value: number) => value.toFixed(2).replace('.', ',');

interface FormValues {
  name: string;
  target: string;
  saved: string;
  due: string;
}

const EMPTY: FormValues = { name: '', target: '', saved: '', due: '' };

function toInput(values: FormValues): GoalInput | string {
  const name = values.name.trim();
  if (!name) return 'Dê um nome para a meta.';
  if (name.length > NAME_MAX) return `O nome pode ter até ${NAME_MAX} caracteres.`;
  const target = parseAmount(values.target);
  if (!(target > 0)) return 'Informe um valor-alvo maior que zero.';
  const saved = values.saved.trim() ? parseAmount(values.saved) : 0;
  if (!(saved >= 0)) return 'Informe quanto já está guardado, ou deixe em branco.';
  return { name, target, saved, due: values.due || null };
}

function GoalForm({ editing, onDone }: { editing: Goal | null; onDone: () => void }) {
  const { create, update } = useGoals();
  const id = useId();
  const [values, setValues] = useState<FormValues>(() =>
    editing ? { name: editing.name, target: amountText(editing.target), saved: amountText(editing.saved), due: editing.due ?? '' } : EMPTY,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const field = (key: keyof FormValues) => ({
    id: `${id}-${key}`,
    value: values[key],
    onChange: (e: { target: { value: string } }) => setValues(v => ({ ...v, [key]: e.target.value })),
    className: 'input',
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const input = toInput(values);
    if (typeof input === 'string') return setError(input);
    setSaving(true);
    setError(null);
    try {
      if (editing) await update(editing.id, input);
      else await create(input);
      setValues(EMPTY);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BentoCard span={5} className="self-start" title={editing ? 'Editar meta' : 'Nova meta'}>
      <form aria-label={editing ? 'Editar meta' : 'Nova meta'} onSubmit={submit} noValidate className="grid gap-4">
        <div>
          <label htmlFor={`${id}-name`} className="field-label">Nome</label>
          <input {...field('name')} maxLength={NAME_MAX} placeholder="Reserva de emergência" autoComplete="off" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-target`} className="field-label">Valor-alvo</label>
            <input {...field('target')} inputMode="decimal" placeholder="10.000,00" autoComplete="off" />
          </div>
          <div>
            <label htmlFor={`${id}-saved`} className="field-label">Já guardado</label>
            <input {...field('saved')} inputMode="decimal" placeholder="0,00" autoComplete="off" />
          </div>
        </div>
        <div>
          <label htmlFor={`${id}-due`} className="field-label">Prazo (opcional)</label>
          <input {...field('due')} type="month" />
        </div>
        {error ? <p role="alert" className={alertBox} style={{ margin: 0 }}>{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>{editing ? 'Salvar' : 'Criar meta'}</Button>
          {editing ? <Button variant="outline" onClick={onDone} disabled={saving}>Cancelar</Button> : null}
        </div>
      </form>
    </BentoCard>
  );
}

type Mode = 'deposit' | 'delete' | null;

function GoalRow({ goal, onEdit }: { goal: Goal; onEdit: () => void }) {
  const { deposit, remove } = useGoals();
  const id = useId();
  const [mode, setMode] = useState<Mode>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = (next: Mode) => {
    setMode(next);
    setAmount('');
    setError(null);
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setMode(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitDeposit = (e: FormEvent) => {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!(value > 0)) return setError('Informe um valor maior que zero.');
    void run(() => deposit(goal.id, value));
  };

  return (
    <li className="grid gap-3 py-5 first:pt-0 last:pb-0 border-b border-line last:border-b-0">
      <GoalProgress label={goal.name} current={goal.saved} target={goal.target} due={goal.due ? formatDue(goal.due) : undefined} />

      {mode === 'deposit' ? (
        <form onSubmit={submitDeposit} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[10rem]">
            <label htmlFor={`${id}-amount`} className="field-label">Valor a guardar</label>
            <input
              id={`${id}-amount`}
              aria-label={`Valor a guardar em ${goal.name}`}
              className="input"
              inputMode="decimal"
              placeholder="0,00"
              autoComplete="off"
              autoFocus
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" disabled={busy}>Guardar</Button>
          <TextLink onClick={() => setMode(null)}>Cancelar</TextLink>
        </form>
      ) : mode === 'delete' ? (
        <div className="flex flex-wrap items-center gap-3">
          <p style={{ margin: 0 }} className="text-sm">Excluir a meta {goal.name}? O valor guardado não sai das suas contas.</p>
          <Button variant="outline" className="!text-alert !border-alert" onClick={() => run(() => remove(goal.id))} disabled={busy}>Excluir</Button>
          <TextLink onClick={() => setMode(null)}>Manter</TextLink>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <TextLink onClick={() => open('deposit')} aria-label={`Guardar valor em ${goal.name}`}>Guardar valor</TextLink>
          <TextLink onClick={onEdit} aria-label={`Editar ${goal.name}`}>Editar</TextLink>
          <TextLink onClick={() => open('delete')} aria-label={`Excluir ${goal.name}`}>Excluir</TextLink>
        </div>
      )}

      {error ? <p role="alert" className={alertBox} style={{ margin: 0 }}>{error}</p> : null}
    </li>
  );
}

/** Content of the "Metas" page: every goal, with a form to create and edit them. */
export function GoalsPage() {
  const { goals, status, error, load } = useGoals();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = goals.find(g => g.id === editingId) ?? null;

  useEffect(() => {
    if (useGoals.getState().status === 'idle') void load();
  }, [load]);

  let list;
  if (status === 'idle' || status === 'loading') {
    list = <p style={muted}>Carregando metas…</p>;
  } else if (status === 'error') {
    list = (
      <div role="alert" className={`${alertBox} flex flex-wrap items-center gap-3`}>
        <span>{error ?? 'Não foi possível carregar suas metas.'}</span>
        <TextLink onClick={() => void load()}>Tentar de novo</TextLink>
      </div>
    );
  } else if (goals.length === 0) {
    list = (
      <p style={muted}>Toda conquista começa com um número. Escolha um objetivo, diga quanto quer juntar e registre cada valor que guardar.</p>
    );
  } else {
    list = (
      <ul className="grid" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {goals.map(goal => (
          <GoalRow key={goal.id} goal={goal} onEdit={() => setEditingId(goal.id)} />
        ))}
      </ul>
    );
  }

  return (
    <div className="fr-bento">
      <BentoCard span={7} title="Suas metas">{list}</BentoCard>
      {/* Keyed so switching between new and edited goals starts from fresh fields. */}
      <GoalForm key={editing?.id ?? 'new'} editing={editing} onDone={() => setEditingId(null)} />
    </div>
  );
}
