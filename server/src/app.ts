import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { leadRouter } from './routes/lead.routes.js';

export interface AppOptions {
  corsOrigins: string[];
  /** Deployed commit SHA, reported by the health check so the CD pipeline can confirm a release is live. */
  version?: string;
}

export function createApp({ corsOrigins, version = 'dev' }: AppOptions): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: corsOrigins.includes('*') ? true : corsOrigins }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', version });
  });

  app.use('/api/leads', leadRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
