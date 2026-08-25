import { Router } from 'express';
import crypto from 'crypto';
import catchAsync from '../utils/catchAsync.js';
import {
  persistMfaPending,
  setOAuthState,
  readOAuthState,
  clearOAuthState,
} from '../utils/voultTokens.js';
import { getFrontendUrl } from '../utils/appBaseUrl.js';
import { getOAuthAuthorizationUrl, exchangeOAuthCode } from 'voult-sdk';

const router = Router();

const SUPPORTED_PROVIDERS = ['google', 'github', 'facebook', 'linkedin', 'microsoft', 'apple'];

function getBackendUrl(req) {
  if (process.env.OAUTH_REDIRECT_BASE_URL) {
    return process.env.OAUTH_REDIRECT_BASE_URL.replace(/\/$/, '');
  }
  return `${req.protocol}://${req.get('host')}`;
}

function getRedirectUri(req, provider) {
  const override = process.env[`${provider.toUpperCase()}_REDIRECT_URI`];
  if (override) return override;
  if (process.env.OAUTH_REDIRECT_URI) return process.env.OAUTH_REDIRECT_URI;
  return `${getBackendUrl(req)}/oauth/callback/${provider}`;
}

function assertProvider(provider) {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
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
  const apiCode = err?.apiCode || err?.details?.apiCode || err?.code;

  if (apiCode === 'PROVIDER_NOT_ENABLED' || apiCode === 'PROVIDER_DISABLED_FOR_THIS_APP') {
    return 'This OAuth provider is not enabled for this Voult app. Enable it in the Voult dashboard.';
  }

  if (apiCode === 'EBADCSRFTOKEN') {
    return (
      'This Voult API still requires CSRF on OAuth routes. Deploy the latest voult API ' +
      '(or use a local instance) — the playground BFF expects SDK-style OAuth endpoints.'
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

async function completeOAuth(req, res, provider, payload) {
  const oauthSession = readOAuthState(req);

  if (payload.error) {
    clearOAuthState(res);
    return redirectWithError(res, payload.errorDescription || payload.error);
  }

  if (!oauthSession || oauthSession.provider !== provider) {
    return redirectWithError(res, 'OAuth session expired. Please try again.');
  }

  if (!payload.voultCode) {
    clearOAuthState(res);
    return redirectWithError(
      res,
      'Sign-in must complete through Voult. Enable the provider in the Voult dashboard.',
    );
  }

  try {
    const result = await exchangeOAuthCode(
      payload.voultCode,
      { redirectUri: oauthSession.redirectUri || getRedirectUri(req, provider) },
      req.voult,
    );

    clearOAuthState(res);

    if (result?.mfaRequired) {
      persistMfaPending(res, result.mfaPendingToken);
      return redirectWithMfa(res);
    }

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

    const redirectUri = getRedirectUri(req, provider);
    const state = crypto.randomBytes(24).toString('hex');
    setOAuthState(res, { provider, state, redirectUri });

    try {
      const { authUrl } = await getOAuthAuthorizationUrl(
        provider,
        { intent: 'authenticate', redirectUri },
        req.voult,
      );
      return res.redirect(authUrl);
    } catch (err) {
      console.error(`OAuth ${provider} start error:`, err);
      clearOAuthState(res);
      return redirectWithError(res, formatOAuthError(err));
    }
  });
}

for (const provider of SUPPORTED_PROVIDERS) {
  router.get(`/${provider}/start`, startOAuth(provider));
}

function handleOAuthCallback(resolveProvider) {
  return catchAsync(async (req, res) => {
    const provider =
      typeof resolveProvider === 'function' ? resolveProvider(req) : resolveProvider;

    await completeOAuth(req, res, provider, {
      voultCode: req.query.voult_code,
      state: req.query.state,
      error: req.query.error,
      errorDescription: req.query.error_description,
    });
  });
}

router.get('/callback/:provider', handleOAuthCallback((req) => req.params.provider));

for (const provider of SUPPORTED_PROVIDERS) {
  router.get(`/${provider}/callback`, handleOAuthCallback(provider));
}

router.post(
  '/callback/apple',
  catchAsync(async (req, res) => {
    await completeOAuth(req, res, 'apple', {
      voultCode: req.body.voult_code,
      state: req.body.state,
      error: req.body.error,
      errorDescription: req.body.error_description,
    });
  }),
);

export { SUPPORTED_PROVIDERS, getRedirectUri };

export default router;
