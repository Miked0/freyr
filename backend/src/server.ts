import dotenv from 'dotenv';
import { createApp } from './app';
import { databaseConfigFromEnv } from './config';
import { DatabaseService } from './services/database.service';
import { AIService } from './services/ai.service';

dotenv.config();

const PORT = process.env.PORT || 5000;

(async () => {
  const app = createApp({
    db: await DatabaseService.connect(databaseConfigFromEnv()),
    ai: new AIService(),
    secureCookies: false,
    sessionSecret: process.env.SESSION_SECRET,
    logRequests: true,
  });

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
})();