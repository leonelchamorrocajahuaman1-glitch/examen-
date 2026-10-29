import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { loadUser } from './middleware/auth.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { accountRouter } from './routes/account.js';
import { adminRouter } from './routes/admin/index.js';
import { authRouter } from './routes/auth.js';
import { catalogRouter } from './routes/catalog.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.TRUST_PROXY) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          workerSrc: ["'self'", 'blob:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          // Solo tiene sentido cuando el sitio se sirve por HTTPS.
          upgradeInsecureRequests: config.COOKIE_SECURE ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());
  if (!config.isProd) app.use(morgan('dev'));

  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());

  // Imágenes subidas desde el panel. nosniff evita que se interpreten como otro tipo de archivo.
  app.use(
    '/uploads',
    express.static(config.uploadDir, {
      maxAge: '7d',
      index: false,
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'");
      },
    }),
  );

  const api = express.Router();
  api.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: (_req, res) =>
        res.status(429).json({ error: { message: 'Demasiadas solicitudes, espera un momento.', code: 'RATE_LIMIT' } }),
    }),
  );
  api.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  api.use(csrfProtection);
  api.use(loadUser);

  api.get('/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, database: 'connected', time: new Date().toISOString() });
  });

  api.use('/auth', authRouter);
  api.use('/account', accountRouter);
  api.use('/admin', adminRouter);
  api.use(catalogRouter);
  api.use(notFoundHandler);

  app.use('/api', api);

  // En producción el servidor también entrega el frontend compilado (client/dist).
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false, maxAge: '1y', immutable: true }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || !req.accepts('html')) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
