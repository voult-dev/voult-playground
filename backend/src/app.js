import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import syncVoultClient from './middleware/syncVoultClient.js';
import errorHandler from './middleware/errorHandler.js';
import apiRoutes from './routes/api.js';
import oauthFlowRoutes from './routes/oauthFlow.js';

export function createApp() {
  const app = express();

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.APP_BASE_URL,
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
  app.use(cookieParser());
  app.use(syncVoultClient);

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
