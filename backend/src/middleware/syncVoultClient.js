import client from '../config/client.js';
import {
  applyVoultTokensFromCookies,
  persistVoultAuth,
} from '../utils/voultTokens.js';

function persistClientTokensIfChanged(req, res, initialTokens) {
  if (res.headersSent) return;
  if (req.originalUrl?.includes('/auth/logout')) return;

  const accessChanged = client.accessToken && client.accessToken !== initialTokens.accessToken;
  const refreshChanged = client.refreshToken && client.refreshToken !== initialTokens.refreshToken;

  if (accessChanged || refreshChanged) {
    persistVoultAuth(res, {
      accessToken: client.accessToken,
      refreshToken: client.refreshToken,
      user: client.getCurrentUser(),
    });
  }
}

function wrapResponseMethod(req, res, methodName, initialTokens) {
  if (typeof res[methodName] !== 'function') return;

  const original = res[methodName].bind(res);
  res[methodName] = (...args) => {
    persistClientTokensIfChanged(req, res, initialTokens);
    return original(...args);
  };
}

export default function syncVoultClient(req, res, next) {
  const tokens = applyVoultTokensFromCookies(req, client);

  wrapResponseMethod(req, res, 'json', tokens);
  wrapResponseMethod(req, res, 'send', tokens);
  wrapResponseMethod(req, res, 'redirect', tokens);

  next();
}
