import { Router } from 'express';
import { createVoultRouter, loadConfigFromEnv } from '@voult/express';
import {
  signInWithEmailLink,
  verifyEmailLink,
  deleteUser,
  getCurrentUser,
  updateProfile,
  reenableAccount,
  sendPasswordResetEmail,
  resetPassword,
  verifyEmail,
  refreshSession,
  listSessions,
  revokeSession,
  verifyMfaLogin,
  getMfaStatus,
  setupMfa,
  enableMfa,
  disableMfa,
  regenerateMfaBackupCodes,
  getWebAuthnCompatibility,
  createPasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  createPasskeyLoginOptions,
  verifyPasskeyLogin,
  listPasskeys,
  updatePasskey,
  deletePasskey,
  signInWithGoogle,
  signUpWithGoogle,
  authenticateWithGoogle,
  signInWithGitHub,
  signUpWithGitHub,
  authenticateWithGitHub,
  signInWithFacebook,
  signUpWithFacebook,
  authenticateWithFacebook,
  signInWithLinkedIn,
  signUpWithLinkedIn,
  authenticateWithLinkedIn,
  signInWithMicrosoft,
  signUpWithMicrosoft,
  authenticateWithMicrosoft,
  signInWithApple,
  signUpWithApple,
  authenticateWithApple,
  linkOAuthProvider,
  getLinkedOAuthProviders,
  unlinkOAuthProvider,
  setPassword,
} from 'voult-sdk';
import catchAsync from '../utils/catchAsync.js';
import requireAuth from '../middleware/requireAuth.js';
import { persistMfaPending, readVoultTokens } from '../utils/voultTokens.js';
import { getFrontendUrl } from '../utils/appBaseUrl.js';
import { sendSanitizedGet, sanitizeUserProfile, sendSanitizedJson } from '../utils/sanitizeResponse.js';

const router = Router();
const voultConfig = loadConfigFromEnv({
  overrides: {
    appUrl: process.env.VOULT_APP_URL || process.env.APP_BASE_URL || process.env.FRONTEND_URL,
  },
});

function handleAuthResult(req, res, result) {
  if (result?.mfaRequired) {
    persistMfaPending(res, result.mfaPendingToken);
    return res.json({
      step: 'mfa',
      mfaRequired: true,
      mfaPendingToken: result.mfaPendingToken,
      message: result.message,
    });
  }

  return sendSanitizedJson(res, result);
}

// Playground session overlay: keep mfaPending for the UI.
router.get(
  '/auth/session',
  catchAsync(async (req, res) => {
    const client = req.voult;
    const tokens = readVoultTokens(req);

    if (!client.accessToken && client.refreshToken) {
      try {
        await refreshSession(client);
      } catch {
        client.clearSession();
      }
    }

    const localUser = client.getCurrentUser();
    if (client.accessToken && !localUser?.email && !localUser?.id) {
      try {
        await getCurrentUser(client);
      } catch {
        client.clearSession();
      }
    }

    sendSanitizedGet(res, 'auth/session', {
      authenticated: Boolean(client.accessToken),
      user: sanitizeUserProfile(client.getCurrentUser()) || tokens.user || null,
      mfaPending: Boolean(tokens.mfaPendingToken),
    });
  }),
);

router.post(
  '/auth/mfa/verify',
  catchAsync(async (req, res) => {
    const { mfaPendingToken, mfaToken } = req.body;
    const token = mfaPendingToken || readVoultTokens(req).mfaPendingToken;
    const result = await verifyMfaLogin(token, mfaToken, req.voult);
    handleAuthResult(req, res, result);
  }),
);

router.get(
  '/auth/mfa/status',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await getMfaStatus(req.voult);
    sendSanitizedGet(res, 'auth/mfa/status', result);
  }),
);

router.post(
  '/auth/mfa/setup',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await setupMfa(req.voult);
    res.json(result);
  }),
);

router.post(
  '/auth/mfa/enable',
  requireAuth,
  catchAsync(async (req, res) => {
    const { token } = req.body;
    const result = await enableMfa(token, req.voult);
    res.json(result);
  }),
);

router.post(
  '/auth/mfa/disable',
  requireAuth,
  catchAsync(async (req, res) => {
    const { password, mfaToken } = req.body;
    const result = await disableMfa(password, mfaToken, req.voult);
    res.json(result);
  }),
);

router.post(
  '/auth/mfa/backup-codes/regenerate',
  requireAuth,
  catchAsync(async (req, res) => {
    const { token } = req.body;
    const result = await regenerateMfaBackupCodes(token, req.voult);
    res.json(result);
  }),
);

router.get(
  '/auth/webauthn/compatibility',
  catchAsync(async (req, res) => {
    const result = await getWebAuthnCompatibility(req.voult);
    sendSanitizedGet(res, 'auth/webauthn/compatibility', result);
  }),
);

router.post(
  '/auth/webauthn/register/options',
  requireAuth,
  catchAsync(async (req, res) => {
    const { deviceName } = req.body;
    const result = await createPasskeyRegistrationOptions({ deviceName }, req.voult);
    res.json(result);
  }),
);

router.post(
  '/auth/webauthn/register/verify',
  requireAuth,
  catchAsync(async (req, res) => {
    const { credential, deviceName } = req.body;
    const result = await verifyPasskeyRegistration(credential, { deviceName }, req.voult);
    res.json(result);
  }),
);

router.post(
  '/auth/webauthn/login/options',
  catchAsync(async (req, res) => {
    const { email } = req.body;
    const result = await createPasskeyLoginOptions({ email }, req.voult);
    res.json(result);
  }),
);

router.post(
  '/auth/webauthn/login/verify',
  catchAsync(async (req, res) => {
    const { credential } = req.body;
    const result = await verifyPasskeyLogin(credential, req.voult);
    handleAuthResult(req, res, result);
  }),
);

router.get(
  '/auth/webauthn/credentials',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await listPasskeys(req.voult);
    sendSanitizedGet(res, 'auth/webauthn/credentials', result);
  }),
);

router.patch(
  '/auth/webauthn/credentials/:id',
  requireAuth,
  catchAsync(async (req, res) => {
    const { deviceName } = req.body;
    const result = await updatePasskey(req.params.id, deviceName, req.voult);
    res.json(result);
  }),
);

router.delete(
  '/auth/webauthn/credentials/:id',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await deletePasskey(req.params.id, req.voult);
    res.json(result);
  }),
);

router.get(
  '/sessions',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await listSessions(req.voult);
    sendSanitizedGet(res, 'sessions', result);
  }),
);

router.get(
  '/sessions/revoke/:sessionId',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await revokeSession(req.params.sessionId, req.voult);
    res.json(result);
  }),
);

router.post(
  '/sessions/refresh',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await refreshSession(req.voult);
    res.json(result);
  }),
);

router.get(
  '/user/me',
  requireAuth,
  catchAsync(async (req, res) => {
    const profile = await getCurrentUser(req.voult);
    sendSanitizedGet(res, 'user/me', profile);
  }),
);

router.patch(
  '/user/me',
  requireAuth,
  catchAsync(async (req, res) => {
    const { fullName } = req.body;
    const result = await updateProfile({ fullName }, req.voult);
    sendSanitizedJson(res, result);
  }),
);

router.get(
  '/user/verify-email',
  catchAsync(async (req, res) => {
    const { token, appId } = req.query;
    const result = await verifyEmail(token, { appId }, req.voult);
    res.json(result);
  }),
);

router.post(
  '/user/forgot-password',
  catchAsync(async (req, res) => {
    const { email } = req.body;
    const result = await sendPasswordResetEmail(email, req.voult);
    res.json(result);
  }),
);

router.post(
  '/user/reset-password',
  catchAsync(async (req, res) => {
    const { token, password, appId } = req.body;
    const result = await resetPassword(token, password, { appId }, req.voult);
    res.json(result);
  }),
);

router.post(
  '/user/disable',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await deleteUser(req.voult);
    res.json(result);
  }),
);

router.post(
  '/user/reenable',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await reenableAccount(req.voult);
    res.json(result);
  }),
);

router.post(
  '/send-magic-link',
  catchAsync(async (req, res) => {
    const { email, redirectUri } = req.body;
    const uri = redirectUri?.trim() || `${getFrontendUrl()}/magic-callback`;
    const result = await signInWithEmailLink(email, { redirectUri: uri }, req.voult);
    res.json({ ...result, redirectUriUsed: uri });
  }),
);

router.post(
  '/validate-magic-link',
  catchAsync(async (req, res) => {
    const { token } = req.body;
    const result = await verifyEmailLink(token, req.voult);
    handleAuthResult(req, res, result);
  }),
);

const OAUTH_HANDLERS = {
  google: {
    login: signInWithGoogle,
    register: signUpWithGoogle,
    authenticate: authenticateWithGoogle,
  },
  github: {
    login: signInWithGitHub,
    register: signUpWithGitHub,
    authenticate: authenticateWithGitHub,
  },
  facebook: {
    login: signInWithFacebook,
    register: signUpWithFacebook,
    authenticate: authenticateWithFacebook,
  },
  linkedin: {
    login: signInWithLinkedIn,
    register: signUpWithLinkedIn,
    authenticate: authenticateWithLinkedIn,
  },
  microsoft: {
    login: signInWithMicrosoft,
    register: signUpWithMicrosoft,
    authenticate: authenticateWithMicrosoft,
  },
  apple: {
    login: signInWithApple,
    register: signUpWithApple,
    authenticate: authenticateWithApple,
  },
};

for (const provider of Object.keys(OAUTH_HANDLERS)) {
  for (const action of ['login', 'register', 'authenticate']) {
    router.post(
      `/auth/${provider}/${action}`,
      catchAsync(async (req, res) => {
        const result = await OAUTH_HANDLERS[provider][action](req.body, req.voult);
        handleAuthResult(req, res, { ...result, provider });
      }),
    );
  }
}

// Password BFF from @voult/express: /register, /email-login, /logout, etc.
router.use('/auth', createVoultRouter({ config: voultConfig }));

router.post(
  '/oauth/:provider/link',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await linkOAuthProvider(req.params.provider, req.voult);
    res.json(result);
  }),
);

router.get(
  '/me/oauth-accounts',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await getLinkedOAuthProviders(req.voult);
    sendSanitizedGet(res, 'me/oauth-accounts', result);
  }),
);

router.delete(
  '/me/oauth-accounts/:provider',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await unlinkOAuthProvider(req.params.provider, req.voult);
    res.json(result);
  }),
);

router.post(
  '/me/set-password',
  requireAuth,
  catchAsync(async (req, res) => {
    const { password } = req.body;
    const result = await setPassword(password, req.voult);
    res.json(result);
  }),
);

router.get(
  '/audit-logs/me',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await req.voult.get('/api/audit-logs/me', { requireAuth: true });
    sendSanitizedGet(res, 'audit-logs/me', result);
  }),
);

router.get(
  '/provider-visibility',
  catchAsync(async (req, res) => {
    const result = await req.voult.get(`/api/provider-visibility/${req.voult.clientId}`);
    sendSanitizedGet(res, 'provider-visibility', result);
  }),
);

router.get(
  '/oauth/config',
  catchAsync(async (req, res) => {
    const backendUrl = process.env.OAUTH_REDIRECT_BASE_URL || `http://localhost:${process.env.PORT || 2000}`;
    const providers = ['google', 'github', 'facebook', 'linkedin', 'microsoft', 'apple'];

    let visibility = {};
    try {
      const result = await req.voult.get(`/api/provider-visibility/${req.voult.clientId}`);
      visibility = result?.providers || {};
    } catch {
      visibility = {};
    }

    const config = Object.fromEntries(
      providers.map((provider) => [
        provider,
        {
          hosted: true,
          configured: true,
          enabledInVoult: Boolean(visibility[provider]),
          callbackUrl:
            process.env[`${provider.toUpperCase()}_REDIRECT_URI`] ||
            `${backendUrl.replace(/\/$/, '')}/oauth/callback/${provider}`,
        },
      ]),
    );

    res.json(config);
  }),
);

export default router;
