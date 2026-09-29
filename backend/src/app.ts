import express, { Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { createExpensesRouter } from './routes/expenses';
import { createAuth } from './routes/auth';
import { DatabaseService } from './services/database.service';
import { AIService } from './services/ai.service';
import { FileProcessorService } from './services/file.processor.service';

export interface AppDeps {
  db: DatabaseService;
  ai: AIService;
  secureCookies?: boolean;
  sessionSecret?: string;
  fileProcessor?: FileProcessorService;
  logRequests?: boolean;
}

export function createApp({ db, ai, secureCookies, sessionSecret, fileProcessor = new FileProcessorService(), logRequests = true }: AppDeps) {
  const app = express();
  const auth = createAuth({ db, secureCookies, sessionSecret });

  app.use(helmet());
  if (logRequests) app.use(morgan('dev'));
  app.use(express.json());

  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'OK', ai: ai.mode, timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', auth.router);
  app.use('/api/expenses', auth.requireSession, createExpensesRouter({ db, ai, fileProcessor }));

  return app;
}