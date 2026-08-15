import { Router } from 'express';
import crypto from 'crypto';
import client from '../config/client.js';
import catchAsync from '../utils/catchAsync.js';
import {
  persistVoultAuth,
  persistMfaPending,
  setOAuthState,
  readOAuthState,
  clearOAuthState,
} from '../utils/voultTokens.js';
import { getFrontendUrl } from '../utils/appBaseUrl.js';
import {
  authenticateWithGoogle,
  authenticateWithGitHub,
  authenticateWithFacebook,
  authenticateWithLinkedIn,
  authenticateWithMicrosoft,
  authenticateWithApple,
  signInWithGoogle,
  signInWithGitHub,
  signInWithFacebook,
  signInWithLinkedIn,
  signInWithMicrosoft,
  signInWithApple,
  signUpWithGoogle,
  signUpWithGitHub,
  signUpWithFacebook,
  signUpWithLinkedIn,
  signUpWithMicrosoft,
  signUpWithApple,
} from 'voult-sdk';

const router = Router();

const SUPPORTED_PROVIDERS = ['google', 'github', 'facebook', 'linkedin', 'microsoft', 'apple'];

const VOULT_HANDLERS = {
  google: authenticateWithGoogle,
  github: authenticateWithGitHub,
  facebook: authenticateWithFacebook,
  linkedin: authenticateWithLinkedIn,
  microsoft: authenticateWithMicrosoft,
  apple: authenticateWithApple,
};

const VOULT_LOGIN_HANDLERS = {
  google: signInWithGoogle,
  github: signInWithGitHub,
  facebook: signInWithFacebook,
  linkedin: signInWithLinkedIn,
  microsoft: signInWithMicrosoft,
  apple: signInWithApple,
};

const VOULT_REGISTER_HANDLERS = {
  google: signUpWithGoogle,
  github: signUpWithGitHub,
  facebook: signUpWithFacebook,
  linkedin: signUpWithLinkedIn,
  microsoft: signUpWithMicrosoft,
  apple: signUpWithApple,
};

function getBackendUrl(req) {
  if (process.env.OAUTH_REDIRECT_BASE_URL) {
    return process.env.OAUTH_REDIRECT_BASE_URL.replace(/\/$/, '');
  }
  return `${req.protocol}://${req.get('host')}`;
};

function getRedirectUri(req, provider) {
  const override = process.env[`${provider.toUpperCase()}_REDIRECT_URI`];
  if (override) return override;
  if (process.env.OAUTH_REDIRECT_URI) return process.env.OAUTH_REDIRECT_URI;
  return `${getBackendUrl(req)}/oauth/callback/${provider}`;
}

function oauthConfig(provider) {
  const upper = provider.toUpperCase();
  return {
    clientId: process.env[`${upper}_CLIENT_ID`],
    clientSecret: process.env[`${upper}_CLIENT_SECRET`],
  };
}

function isConfigured(provider) {
  const { clientId, clientSecret } = oauthConfig(provider);
  return Boolean(clientId && clientSecret);
}

function assertProvider(provider) {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
}

function buildAuthUrl(req, provider, state) {
  const { clientId } = oauthConfig(provider);
  const redirectUri = getRedirectUri(req, provider);

  switch (provider) {
    case 'google': {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'online',
        prompt: 'select_account',
        state,
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }
    case 'github': {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'read:user user:email',
        state,
      });
      return `https://github.com/login/oauth/authorize?${params.toString()}`;
    }
    case 'facebook': {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'email,public_profile',
        state,
      });
      return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
    }
    case 'linkedin': {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'openid profile email',
        state,
      });
      return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    }
    case 'microsoft': {
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'openid profile email',
        state,
      });
      return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    }
    case 'apple': {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code id_token',
        response_mode: 'form_post',
        scope: 'name email',
        state,
      });
      return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

async function exchangeGoogleCode(req, code) {
  const { clientId, clientSecret } = oauthConfig('google');
  const redirectUri = getRedirectUri(req, 'google');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Google token exchange failed');
  }
  if (!data.id_token) {
    throw new Error('Google did not return an id_token. Ensure openid scope is enabled.');
  }

  return { idToken: data.id_token, accessToken: data.access_token };
}

async function exchangeGitHubCode(req, code) {
  const { clientId, clientSecret } = oauthConfig('github');
  const redirectUri = getRedirectUri(req, 'github');

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await response.json();
  if (!response.ok || data.error || !data.access_token) {
    throw new Error(data.error_description || data.error || 'GitHub token exchange failed');
  }

  return { accessToken: data.access_token };
}

async function exchangeFacebookCode(req, code) {
  const { clientId, clientSecret } = oauthConfig('facebook');
  const redirectUri = getRedirectUri(req, 'facebook');
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${params.toString()}`,
  );
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(data.error?.message || 'Facebook token exchange failed');
  }

  return { accessToken: data.access_token };
}

async function exchangeLinkedInCode(req, code) {
  const { clientId, clientSecret } = oauthConfig('linkedin');
  const redirectUri = getRedirectUri(req, 'linkedin');

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || 'LinkedIn token exchange failed',
    );
  }

  return { accessToken: data.access_token };
}

async function buildVoultCredentials(req, provider, payload) {
  const redirectUri = getRedirectUri(req, provider);

  switch (provider) {
    case 'google':
      return exchangeGoogleCode(req, payload.code);
    case 'github':
      return exchangeGitHubCode(req, payload.code);
    case 'facebook':
      return exchangeFacebookCode(req, payload.code);
    case 'linkedin':
      return exchangeLinkedInCode(req, payload.code);
    case 'microsoft':
      return { code: payload.code };
    case 'apple': {
      const credentials = { idToken: payload.idToken };
      if (payload.code) credentials.code = payload.code;
      if (payload.user) {
        try {
          const user = typeof payload.user === 'string' ? JSON.parse(payload.user) : payload.user;
          if (user?.name) {
            const parts = [user.name.firstName, user.name.lastName].filter(Boolean);
            credentials.fullName = parts.join(' ');
          }
          if (user?.email) credentials.email = user.email;
        } catch {
          // Apple user payload is optional and only sent once
        }
      }
      return credentials;
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

function redirectWithError(res, message) {
  const url = new URL('/oauth', getFrontendUrl());
  url.searchParams.set('error', message);
  return res.redirect(url.toString());
}

function redirectWithMfa(res) {
  return res.redirect(`${getFrontendUrl()}/mfa`);
}

function redirectSuccess(res) {
  return res.redirect(`${getFrontendUrl()}/account`);
}

function formatOAuthError(err) {
  const apiCode = err?.apiCode || err?.details?.apiCode;

  if (apiCode === 'EBADCSRFTOKEN') {
    return (
      'This Voult API still requires CSRF on OAuth routes. Deploy the latest voult API ' +
      '(or use a local instance) — the playground BFF expects SDK-style OAuth endpoints.'
    );
  }

  if (
    err?.status === 401 &&
    apiCode === 'UNAUTHORIZED' &&
    /authentication required/i.test(String(err?.message || ''))
  ) {
    return (
      'This Voult API does not expose POST /api/auth/{provider}/authenticate yet. ' +
      'Deploy the latest voult API to staging, or set VOULT_BASE_URL to a current instance.'
    );
  }

  if (typeof err?.message === 'string' && err.message !== '[object Object]') {
    return err.message;
  }

  const details = err?.details;
  if (typeof details === 'string') return details;
  if (details?.error?.message) return String(details.error.message);
  if (details?.message) return String(details.message);

  if (err?.code && typeof err.code === 'object' && err.code.message) {
    return String(err.code.message);
  }

  if (typeof err?.code === 'string') return err.code;

  return 'OAuth sign-in failed';
}

function isAuthenticateUnavailable(err) {
  const apiCode = err?.apiCode || err?.details?.apiCode;
  return (
    err?.status === 401 &&
    apiCode === 'UNAUTHORIZED' &&
    /authentication required/i.test(String(err?.message || ''))
  );
}

function isUserNotFound(err) {
  const apiCode = err?.apiCode || err?.details?.apiCode;
  return err?.status === 404 || apiCode === 'USER_NOT_FOUND';
}

async function authenticateWithVoult(provider, credentials) {
  client.clearSession();

  const authenticate = VOULT_HANDLERS[provider];
  try {
    return await authenticate(credentials, client);
  } catch (err) {
    if (!isAuthenticateUnavailable(err)) {
      throw err;
    }

    const login = VOULT_LOGIN_HANDLERS[provider];
    const register = VOULT_REGISTER_HANDLERS[provider];

    try {
      return await login(credentials, client);
    } catch (loginErr) {
      if (isUserNotFound(loginErr)) {
        return await register(credentials, client);
      }
      throw loginErr;
    }
  }
}

async function completeOAuth(req, res, provider, payload) {
  const oauthSession = readOAuthState(req);

  if (payload.error) {
    clearOAuthState(res);
    return redirectWithError(res, payload.errorDescription || payload.error);
  }

  if (!oauthSession || oauthSession.provider !== provider) {
    return redirectWithError(res, 'OAuth session expired. Please try again.');
  }

  if (!payload.state || payload.state !== oauthSession.state) {
    clearOAuthState(res);
    return redirectWithError(res, 'Invalid OAuth state.');
  }

  if (provider !== 'apple' && !payload.code) {
    clearOAuthState(res);
    return redirectWithError(res, 'Missing authorization code.');
  }

  if (provider === 'apple' && !payload.idToken) {
    clearOAuthState(res);
    return redirectWithError(res, 'Apple did not return an id_token.');
  }

  try {
    const credentials = await buildVoultCredentials(req, provider, payload);
    const result = await authenticateWithVoult(provider, credentials);

    clearOAuthState(res);

    if (result?.mfaRequired) {
      persistMfaPending(res, result.mfaPendingToken);
      return redirectWithMfa(res);
    }

    persistVoultAuth(res, result);
    return redirectSuccess(res);
  } catch (err) {
    console.error(`OAuth ${provider} error:`, err);
    clearOAuthState(res);
    return redirectWithError(res, formatOAuthError(err));
  }
}

function startOAuth(provider) {
  return catchAsync(async (req, res) => {
    assertProvider(provider);

    if (!isConfigured(provider)) {
      return res.status(400).json({
        error: {
          code: 'OAUTH_NOT_CONFIGURED',
          message: `Set ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET in backend/.env`,
          status: 400,
        },
      });
    }

    const state = crypto.randomBytes(24).toString('hex');

    setOAuthState(res, {
      provider,
      state,
      redirectUri: getRedirectUri(req, provider),
    });

    return res.redirect(buildAuthUrl(req, provider, state));
  });
}

for (const provider of SUPPORTED_PROVIDERS) {
  router.get(`/${provider}/start`, startOAuth(provider));
}

function handleOAuthCallback(resolveProvider) {
  return catchAsync(async (req, res) => {
    const provider =
      typeof resolveProvider === 'function' ? resolveProvider(req) : resolveProvider;

    if (provider === 'apple') {
      return res.status(405).send('Apple callback must be POST');
    }

    await completeOAuth(req, res, provider, {
      code: req.query.code,
      state: req.query.state,
      error: req.query.error,
      errorDescription: req.query.error_description,
    });
  });
}

// Canonical callback: /oauth/callback/:provider
router.get('/callback/:provider', handleOAuthCallback((req) => req.params.provider));

// Common misconfiguration alias: /oauth/:provider/callback
for (const provider of SUPPORTED_PROVIDERS) {
  if (provider !== 'apple') {
    router.get(`/${provider}/callback`, handleOAuthCallback(provider));
  }
};

router.post(
  '/callback/apple',
  catchAsync(async (req, res) => {
    await completeOAuth(req, res, 'apple', {
      code: req.body.code,
      idToken: req.body.id_token,
      state: req.body.state,
      user: req.body.user,
      error: req.body.error,
      errorDescription: req.body.error_description,
    });
  }),
);

export { SUPPORTED_PROVIDERS, isConfigured, getRedirectUri };

export default router;
