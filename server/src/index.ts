import dotenv from 'dotenv';
import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './db.js';

dotenv.config({ quiet: true });

async function main(): Promise<void> {
  const env = loadEnv();

  await connectDatabase(env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const app = createApp({ corsOrigins: env.CORS_ORIGIN, version: env.RENDER_GIT_COMMIT });
  const server = app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: NodeJS.Signals) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      disconnectDatabase()
        .then(() => process.exit(0))
        .catch((err: unknown) => {
          console.error(err);
          process.exit(1);
        });
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
