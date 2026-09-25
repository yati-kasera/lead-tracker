import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export interface AppOptions {
  corsOrigins: string[];
}

export function createApp({ corsOrigins }: AppOptions): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: corsOrigins.includes('*') ? true : corsOrigins }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
