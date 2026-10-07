import { Router } from 'express';
import { DatabaseService } from '../services/database.service';
import { FREE_PLAN } from '../services/plans';

const MAX_NAME_LENGTH = 40;

interface CategoriesRouterDeps {
  db: DatabaseService;
}

export function createCategoriesRouter({ db }: CategoriesRouterDeps) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const categories = await db.getAllCategoriesForUser(req.user!.id);
      res.json({
        categories: categories.map(({ id, name, is_custom }) => ({ id, name, is_custom: Boolean(is_custom) })),
        custom_limit: FREE_PLAN.customCategories,
      });
    } catch (error) {
      res.status(500).json({ error: 'Não foi possível carregar as categorias.' });
    }
  });

  router.post('/', async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ error: 'Dê um nome à categoria.' });
    if (name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: `O nome da categoria pode ter até ${MAX_NAME_LENGTH} caracteres.` });
    }
    try {
      const result = await db.createCustomCategoryForUser(req.user!.id, name, FREE_PLAN.customCategories);
      if ('refused' in result && result.refused === 'limit') {
        return res.status(403).json({
          error: `Você já criou ${FREE_PLAN.customCategories} categorias, o máximo do seu plano. Apague uma para criar outra.`,
        });
      }
      if ('refused' in result) return res.status(409).json({ error: `Você já tem a categoria ${name}.` });
      res.status(201).json({ id: result.created.id, name: result.created.name, is_custom: true });
    } catch (error) {
      res.status(500).json({ error: 'Não foi possível criar a categoria.' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      if (!(await db.deleteCustomCategoryForUser(req.user!.id, req.params.id))) {
        return res.status(404).json({ error: 'Categoria não encontrada.' });
      }
      res.json({ message: 'Categoria apagada.' });
    } catch (error) {
      res.status(500).json({ error: 'Não foi possível apagar a categoria.' });
    }
  });

  return router;
}
