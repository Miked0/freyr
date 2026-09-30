import { RequestHandler, Router } from 'express';
import { DatabaseService } from '../services/database.service';
import { FileProcessorService, StatementError, type ParsedTransaction } from '../services/file.processor.service';
import { AIService } from '../services/ai.service';
import { randomUUID } from 'crypto';
import multer from 'multer';
import path from 'path';
import { mapWithConcurrency } from '../utils/concurrency';

interface ExpensesRouterDeps {
  db: DatabaseService;
  ai: AIService;
  fileProcessor: FileProcessorService;
}

// Vercel functions reject request bodies above 4.5 MB.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const AI_CONCURRENCY = 5;
// Caps paid AI calls per upload; a month of statements fits well under it.
const MAX_TRANSACTIONS_PER_UPLOAD = 500;

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
      cb(new Error('Invalid file type. Only PDF and CSV are allowed.'));
    }
  }
});

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
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  });

  router.get('/categories/all', async (req, res) => {
    try {
      const userId = req.user!.id;
      res.json(await db.getAllCategoriesForUser(userId));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const userId = req.user!.id;
      const expense = await db.getExpenseByIdForUser(userId, req.params.id);
      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch expense' });
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
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const userId = req.user!.id;
      const rawExpenses = await fileProcessor.processFile(file.buffer, file.originalname);
      if (rawExpenses.length > MAX_TRANSACTIONS_PER_UPLOAD) {
        return res.status(422).json({ error: `O extrato tem ${rawExpenses.length} transações; o máximo por envio é ${MAX_TRANSACTIONS_PER_UPLOAD}.` });
      }
      const categoryNames = (await db.getAllCategoriesForUser(userId)).map(cat => cat.name);

      const expenses = await mapWithConcurrency(rawExpenses, AI_CONCURRENCY, async rawExpense => {
        const category =
          (await db.findCorrectedCategoryForUser(userId, rawExpense.description)) ??
          (await ai.categorizeExpense(rawExpense.description, categoryNames));
        return {
          id: randomUUID(),
          date: rawExpense.date,
          amount: rawExpense.amount,
          description: rawExpense.description,
          category,
          type: signToType(rawExpense.sign),
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
        message: `Processed ${expenses.length} expenses from ${file.originalname}`
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error instanceof StatementError ? error.message : 'Failed to process file' });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const userId = req.user!.id;
      const { category, description, amount, type } = req.body ?? {};
      const updates: { category?: string; description?: string; amount?: number; type?: 'income' | 'expense' } = {};

      if (category !== undefined) {
        if (typeof category !== 'string' || !category.trim()) {
          return res.status(400).json({ error: 'Category must be a non-empty string' });
        }
        updates.category = category;
      }
      if (description !== undefined) {
        if (typeof description !== 'string' || !description.trim()) {
          return res.status(400).json({ error: 'Description must be a non-empty string' });
        }
        updates.description = description.trim();
      }
      if (amount !== undefined) {
        if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
          return res.status(400).json({ error: 'Amount must be a positive number' });
        }
        updates.amount = amount;
      }
      if (type !== undefined) {
        if (type !== 'income' && type !== 'expense') {
          return res.status(400).json({ error: 'Type must be income or expense' });
        }
        updates.type = type;
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Nothing to update' });
      }

      const currentExpense = await db.getExpenseByIdForUser(userId, req.params.id);
      if (!currentExpense) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      const success = await db.updateExpenseForUser(userId, req.params.id, updates);
      if (!success) {
        return res.status(500).json({ error: 'Failed to update expense' });
      }

      if (category !== undefined && currentExpense.category !== category) {
        await db.addCorrectionForUser(userId, {
          id: randomUUID(),
          description: currentExpense.description,
          original_category: currentExpense.category,
          corrected_category: category
        });
      }

      res.json({ message: 'Expense updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update expense' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const userId = req.user!.id;
      const expense = await db.getExpenseByIdForUser(userId, req.params.id);
      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      const success = await db.deleteExpenseForUser(userId, req.params.id);
      if (!success) {
        return res.status(500).json({ error: 'Failed to delete expense' });
      }
      res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete expense' });
    }
  });

  return router;
}