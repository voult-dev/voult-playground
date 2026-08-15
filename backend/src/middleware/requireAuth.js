import { readVoultTokens } from '../utils/voultTokens.js';

export default function requireAuth(req, res, next) {
  const { accessToken, refreshToken } = readVoultTokens(req);

  if (!accessToken && !refreshToken) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Sign in first to perform that action.',
        status: 401,
      },
    });
  }

  next();
}
