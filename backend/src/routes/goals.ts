import { Router } from 'express';
import type { GoalPatch, GoalsStore } from '../services/goals';

const NAME_MAX = 40;
const DUE = /^\d{4}-(0[1-9]|1[0-2])$/;

const isAmount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Checks the fields present in body; returns the cleaned fields or the first error message. */
function readGoal(body: Record<string, unknown>): { fields: GoalPatch } | { error: string } {
  const fields: GoalPatch = {};
  const { name, target, saved, due } = body;
  if (name !== undefined) {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) return { error: 'Dê um nome para a meta.' };
    if (trimmed.length > NAME_MAX) return { error: `O nome pode ter até ${NAME_MAX} caracteres.` };
    fields.name = trimmed;
  }
  if (target !== undefined) {
    if (!isAmount(target) || target <= 0) return { error: 'Informe um valor-alvo maior que zero.' };
    fields.target = target;
  }
  if (saved !== undefined) {
    if (!isAmount(saved) || saved < 0) return { error: 'O valor guardado não pode ser negativo.' };
    fields.saved = saved;
  }
  if (due !== undefined) {
    if (due !== null && (typeof due !== 'string' || !DUE.test(due))) return { error: 'Informe o prazo como mês e ano.' };
    fields.due = due;
  }
  return { fields };
}

export function createGoalsRouter({ goals }: { goals: GoalsStore }) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      res.json(await goals.list(req.user!.id));
    } catch {
      res.status(500).json({ error: 'Não foi possível carregar as metas.' });
    }
  });

  router.post('/', async (req, res) => {
    const body = req.body ?? {};
    if (body.name === undefined) return res.status(400).json({ error: 'Dê um nome para a meta.' });
    if (body.target === undefined) return res.status(400).json({ error: 'Informe um valor-alvo maior que zero.' });
    const result = readGoal(body);
    if ('error' in result) return res.status(400).json({ error: result.error });
    try {
      const { name, target, saved = 0, due = null } = result.fields;
      res.status(201).json(await goals.create(req.user!.id, { name: name!, target: target!, saved, due }));
    } catch {
      res.status(500).json({ error: 'Não foi possível criar a meta.' });
    }
  });

  router.patch('/:id', async (req, res) => {
    const result = readGoal(req.body ?? {});
    if ('error' in result) return res.status(400).json({ error: result.error });
    if (Object.keys(result.fields).length === 0) return res.status(400).json({ error: 'Nada para atualizar.' });
    try {
      const goal = await goals.update(req.user!.id, req.params.id, result.fields);
      if (!goal) return res.status(404).json({ error: 'Meta não encontrada.' });
      res.json(goal);
    } catch {
      res.status(500).json({ error: 'Não foi possível atualizar a meta.' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      if (!(await goals.remove(req.user!.id, req.params.id))) return res.status(404).json({ error: 'Meta não encontrada.' });
      res.status(204).end();
    } catch {
      res.status(500).json({ error: 'Não foi possível excluir a meta.' });
    }
  });

  return router;
}
