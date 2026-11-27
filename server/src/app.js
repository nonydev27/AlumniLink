import crypto from 'node:crypto';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { pool } from './db.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { apiRouter } from './routes.js';
import { v2Router } from './modules/v2/v2.routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
  });
  app.use(helmet());
  app.use(
    cors({
      // Requests with no Origin header (mobile apps, curl, server-to-server) are not browsers, so CORS doesn't apply.
      origin: (origin, cb) => cb(null, !origin || config.clientOrigins.includes(origin)),
      maxAge: 600,
    }),
  );
  app.use(compression()); // smaller responses help on slow connections
  app.use(express.json({ limit: '100kb' }));
  if (!config.isTest) app.use(morgan(config.isProd ? 'combined' : 'dev'));

  // Liveness: is the process up? Readiness: can it reach the database?
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/health/ready', async (req, res) => {
    try {
      await pool.query('select 1');
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'database_unavailable' });
    }
  });

  app.use('/api/v1', globalLimiter, apiRouter);
  app.use('/api/v2', globalLimiter, v2Router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
