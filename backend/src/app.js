import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createVoultMiddleware, loadConfigFromEnv } from '@voult/express';
import errorHandler from './middleware/errorHandler.js';
import apiRoutes from './routes/api.js';
import oauthFlowRoutes from './routes/oauthFlow.js';
import { persistMfaPending } from './utils/voultTokens.js';

function persistMfaCookie(_req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body?.mfaRequired && body?.mfaPendingToken) {
      persistMfaPending(res, body.mfaPendingToken);
    }
    return originalJson(body);
  };
  next();
}

export function createApp() {
  const config = loadConfigFromEnv({
    overrides: {
      appUrl: process.env.VOULT_APP_URL || process.env.APP_BASE_URL || process.env.FRONTEND_URL,
    },
  });

  const app = express();

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.APP_BASE_URL,
    process.env.VOULT_APP_URL,
    'http://localhost:5173',
    'http://localhost:2000',
    'http://127.0.0.1:5173',
  ].filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser(config.sessionSecret));
  app.use(createVoultMiddleware({ config }));
  app.use(persistMfaCookie);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'voult-playground-bff' });
  });

  app.use('/api', apiRoutes);
  app.use('/oauth', oauthFlowRoutes);

  app.get('/auth/:provider/callback', (req, res) => {
    const params = new URLSearchParams(req.query);
    res.redirect(`/oauth/callback/${req.params.provider}?${params.toString()}`);
  });

  app.use((_req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Route not found', status: 404 },
    });
  });

  app.use(errorHandler);

  return app;
}

export default createApp;
