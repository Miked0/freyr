import { RequestHandler, Router } from 'express';
import { DatabaseService } from '../services/database.service';
import { FileProcessorService } from '../services/file.processor.service';
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

export function createExpensesRouter({ db, ai, fileProcessor }: ExpensesRouterDeps) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      res.json(await db.getAllExpenses());
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  });

  router.get('/categories/all', async (req, res) => {
    try {
      res.json(await db.getAllCategories());
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const expense = await db.getExpenseById(req.params.id);
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
      const rawExpenses = await fileProcessor.processFile(file.buffer, file.originalname);
      const categoryNames = (await db.getAllCategories()).map(cat => cat.name);

      const expenses = await mapWithConcurrency(rawExpenses, AI_CONCURRENCY, async rawExpense => {
        const category =
          (await db.findCorrectedCategory(rawExpense.description)) ??
          (await ai.categorizeExpense(rawExpense.description, categoryNames));
        return {
          id: randomUUID(),
          date: rawExpense.date,
          amount: rawExpense.amount,
          description: rawExpense.description,
          category,
          rawDescription: rawExpense.rawDescription,
          sourceFile: file.originalname
        };
      });

      for (const expense of expenses) {
        await db.createExpense(expense);
      }

      res.json({
        success: true,
        expenses,
        message: `Processed ${expenses.length} expenses from ${file.originalname}`
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error.message || 'Failed to process file' });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const { category, description, amount } = req.body ?? {};
      const updates: { category?: string; description?: string; amount?: number } = {};

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
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Nothing to update' });
      }

      const currentExpense = await db.getExpenseById(req.params.id);
      if (!currentExpense) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      const success = await db.updateExpense(req.params.id, updates);
      if (!success) {
        return res.status(500).json({ error: 'Failed to update expense' });
      }

      if (category !== undefined && currentExpense.category !== category) {
        await db.addCorrection({
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
      const success = await db.deleteExpense(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete expense' });
    }
  });

  return router;
}
