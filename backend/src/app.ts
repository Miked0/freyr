import express, { Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { createExpensesRouter } from './routes/expenses';
import { createAuth } from './routes/auth';
import { createGoalsRouter } from './routes/goals';
import { createCategoriesRouter } from './routes/categories';
import { DatabaseService } from './services/database.service';
import { AIService } from './services/ai.service';
import { FileProcessorService } from './services/file.processor.service';
import type { GoogleConfig } from './services/google';

export interface AppDeps {
  db: DatabaseService;
  ai: AIService;
  secureCookies?: boolean;
  sessionSecret?: string;
  fileProcessor?: FileProcessorService;
  logRequests?: boolean;
  /** Read the client address from X-Forwarded-For; only behind a proxy that overwrites it (Vercel). */
  trustProxy?: boolean;
  /** Enables "Entrar com Google"; see googleConfigFromEnv. */
  google?: GoogleConfig;
}

export function createApp({ db, ai, secureCookies, sessionSecret, fileProcessor = new FileProcessorService(), logRequests = true, trustProxy = false, google }: AppDeps) {
  const app = express();
  app.set('trust proxy', trustProxy);
  const auth = createAuth({ db, secureCookies, sessionSecret, google });

  app.use(helmet());
  if (logRequests) app.use(morgan('dev'));
  app.use(express.json());

  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'OK', ai: ai.mode, googleLogin: auth.googleLogin, timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', auth.router);
  app.use('/api/expenses', auth.requireSession, createExpensesRouter({ db, ai, fileProcessor }));
  app.use('/api/goals', auth.requireSession, createGoalsRouter({ goals: db.goals }));
  app.use('/api/categories', auth.requireSession, createCategoriesRouter({ db }));

  return app;
}