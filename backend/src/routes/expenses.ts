import { RequestHandler, Router } from 'express';
import { DatabaseService } from '../services/database.service';
import { FileProcessorService, StatementError, type ParsedTransaction } from '../services/file.processor.service';
import { AIService } from '../services/ai.service';
import { randomUUID } from 'crypto';
import multer from 'multer';
import path from 'path';
import { mapWithConcurrency } from '../utils/concurrency';
import { importKey, splitAlreadyImported } from '../services/import-key';

interface ExpensesRouterDeps {
  db: DatabaseService;
  ai: AIService;
  fileProcessor: FileProcessorService;
}

// Vercel functions reject request bodies above 4.5 MB.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const AI_CONCURRENCY = 10;
// Caps paid AI calls per upload and keeps the import inside the 60 s function limit
// (~1 s per AI call at AI_CONCURRENCY); a month of statements fits well under it.
const MAX_TRANSACTIONS_PER_UPLOAD = 300;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato não suportado. Envie um arquivo PDF ou CSV.'));
    }
  }
});

function uploadMessage(imported: number, duplicates: number, fileName: string): string {
  const saved = `${imported} ${imported === 1 ? 'transação importada' : 'transações importadas'} de ${fileName}`;
  if (duplicates === 0) return saved;
  const skipped = `${duplicates} ${duplicates === 1 ? 'já estava salva' : 'já estavam salvas'} e ${duplicates === 1 ? 'foi ignorada' : 'foram ignoradas'}`;
  return imported === 0 ? `Nenhuma transação nova em ${fileName}: ${skipped}.` : `${saved}; ${skipped}.`;
}

function signToType(sign: ParsedTransaction['sign']): 'income' | 'expense' {
  if (sign === 'credit') return 'income';
  return 'expense';
}

export function createExpensesRouter({ db, ai, fileProcessor }: ExpensesRouterDeps) {
  const router = Router();

  // All routes require authentication - user is attached by requireSession middleware
  router.get('/', async (req, res) => {
    try {
      const userId = req.user!.id;
      res.json(await db.getAllExpensesForUser(userId));
    } catch (error) {
      res.status(500).json({ error: 'Não foi possível carregar as transações.' });
    }
  });

  router.get('/categories/all', async (req, res) => {
    try {
      const userId = req.user!.id;
      res.json(await db.getAllCategoriesForUser(userId));
    } catch (error) {
      res.status(500).json({ error: 'Não foi possível carregar as categorias.' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const userId = req.user!.id;
      const expense = await db.getExpenseByIdForUser(userId, req.params.id);
      if (!expense) {
        return res.status(404).json({ error: 'Transação não encontrada.' });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: 'Não foi possível carregar a transação.' });
    }
  });

  const receiveStatement: RequestHandler = (req, res, next) => {
    upload.single('statement')(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Arquivo muito grande. O tamanho máximo é 4 MB.' });
      }
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  };

  router.post('/upload', receiveStatement, async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });
    }

    try {
      const userId = req.user!.id;
      const rawExpenses = await fileProcessor.processFile(file.buffer, file.originalname);
      if (rawExpenses.length > MAX_TRANSACTIONS_PER_UPLOAD) {
        return res.status(422).json({ error: `O extrato tem ${rawExpenses.length} transações; o máximo por envio é ${MAX_TRANSACTIONS_PER_UPLOAD}.` });
      }
      const candidates = rawExpenses.map(rawExpense => ({
        ...rawExpense,
        // A refund on a card invoice takes spending back, so it is stored as negative spending.
        amount: rawExpense.sign === 'refund' ? -rawExpense.amount : rawExpense.amount,
        type: signToType(rawExpense.sign),
      }));
      const { fresh, duplicates } = splitAlreadyImported(
        candidates,
        await db.countImportKeysForUser(userId, candidates.map(importKey))
      );
      const categoryNames = (await db.getAllCategoriesForUser(userId)).map(cat => cat.name);

      const expenses = await mapWithConcurrency(fresh, AI_CONCURRENCY, async rawExpense => {
        const category =
          (await db.findCorrectedCategoryForUser(userId, rawExpense.description)) ??
          (await ai.categorizeExpense(rawExpense.description, categoryNames));
        return {
          id: randomUUID(),
          date: rawExpense.date,
          amount: rawExpense.amount,
          description: rawExpense.description,
          category,
          type: rawExpense.type,
          rawDescription: rawExpense.rawDescription,
          sourceFile: file.originalname
        };
      });

      for (const expense of expenses) {
        await db.createExpenseForUser(userId, expense);
      }

      res.json({
        success: true,
        expenses,
        duplicates,
        message: uploadMessage(expenses.length, duplicates, file.originalname)
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error instanceof StatementError ? error.message : 'Não foi possível processar o arquivo.' });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const userId = req.user!.id;
      const { category, description, amount, type } = req.body ?? {};
      const updates: { category?: string; description?: string; amount?: number; type?: 'income' | 'expense' } = {};

      if (category !== undefined) {
        if (typeof category !== 'string' || !category.trim()) {
          return res.status(400).json({ error: 'Informe uma categoria.' });
        }
        updates.category = category;
      }
      if (description !== undefined) {
        if (typeof description !== 'string' || !description.trim()) {
          return res.status(400).json({ error: 'A descrição não pode ficar vazia.' });
        }
        updates.description = description.trim();
      }
      if (amount !== undefined) {
        // Negative spending is a refund from a card invoice; income must stay positive (checked below).
        if (typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0) {
          return res.status(400).json({ error: 'Informe um valor diferente de zero.' });
        }
        updates.amount = amount;
      }
      if (type !== undefined) {
        if (type !== 'income' && type !== 'expense') {
          return res.status(400).json({ error: 'O tipo deve ser receita ou despesa.' });
        }
        updates.type = type;
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Nada para atualizar.' });
      }

      const currentExpense = await db.getExpenseByIdForUser(userId, req.params.id);
      if (!currentExpense) {
        return res.status(404).json({ error: 'Transação não encontrada.' });
      }
      if ((updates.type ?? currentExpense.type) === 'income' && (updates.amount ?? currentExpense.amount) < 0) {
        return res.status(400).json({ error: 'Uma entrada precisa ter valor maior que zero.' });
      }

      const success = await db.updateExpenseForUser(userId, req.params.id, updates);
      if (!success) {
        return res.status(500).json({ error: 'Não foi possível atualizar a transação.' });
      }

      if (category !== undefined && currentExpense.category !== category) {
        await db.addCorrectionForUser(userId, {
          id: randomUUID(),
          description: currentExpense.description,
          original_category: currentExpense.category,
          corrected_category: category
        });
      }

      res.json({ message: 'Transação atualizada.' });
    } catch (error) {
      res.status(500).json({ error: 'Não foi possível atualizar a transação.' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const userId = req.user!.id;
      const expense = await db.getExpenseByIdForUser(userId, req.params.id);
      if (!expense) {
        return res.status(404).json({ error: 'Transação não encontrada.' });
      }
      const success = await db.deleteExpenseForUser(userId, req.params.id);
      if (!success) {
        return res.status(500).json({ error: 'Não foi possível excluir a transação.' });
      }
      res.json({ message: 'Transação excluída.' });
    } catch (error) {
      res.status(500).json({ error: 'Não foi possível excluir a transação.' });
    }
  });

  return router;
}