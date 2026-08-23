import { Router } from 'express';
import client from '../config/client.js';
import catchAsync from '../utils/catchAsync.js';
import requireAuth from '../middleware/requireAuth.js';
import {
  persistVoultAuth,
  clearVoultAuth,
  persistMfaPending,
  readVoultTokens,
} from '../utils/voultTokens.js';
import { getFrontendUrl } from '../utils/appBaseUrl.js';
import { sendSanitizedGet, sanitizeUserProfile, sendSanitizedJson } from '../utils/sanitizeResponse.js';
import {
  signUpWithEmailAndPassword,
  signUpWithUsernameAndPassword,
  signInWithEmailAndPassword,
  signInWithUsernameAndPassword,
  signInWithEmailLink,
  verifyEmailLink,
  signOut,
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

const router = Router();

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

  persistVoultAuth(res, result);
  return sendSanitizedJson(res, result);
}

// Session status
router.get(
  '/auth/session',
  catchAsync(async (req, res) => {
    const tokens = readVoultTokens(req);

    if (!client.accessToken && client.refreshToken) {
      try {
        const result = await refreshSession(client);
        persistVoultAuth(res, {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: client.getCurrentUser(),
        });
      } catch {
        clearVoultAuth(res);
        client.clearSession();
      }
    }

    if (client.accessToken && !client.getCurrentUser()) {
      try {
        const user = await getCurrentUser(client);
        persistVoultAuth(res, {
          accessToken: client.accessToken,
          refreshToken: client.refreshToken,
          user,
        });
      } catch {
        clearVoultAuth(res);
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

// Password auth
router.post(
  '/auth/register',
  catchAsync(async (req, res) => {
    const { email, password, fullName, username } = req.body;
    const options = {};
    if (fullName) options.fullName = fullName;
    if (username) options.username = username;
    const result = await signUpWithEmailAndPassword(email, password, options, client);
    handleAuthResult(req, res, result);
  }),
);

router.post(
  '/auth/username-register',
  catchAsync(async (req, res) => {
    const { username, password, fullName, email } = req.body;
    const options = {};
    if (fullName) options.fullName = fullName;
    if (email) options.email = email;
    const result = await signUpWithUsernameAndPassword(username, password, options, client);
    handleAuthResult(req, res, result);
  }),
);

router.post(
  '/auth/email-login',
  catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const result = await signInWithEmailAndPassword(email, password, client);
    handleAuthResult(req, res, result);
  }),
);

router.post(
  '/auth/username-login',
  catchAsync(async (req, res) => {
    const { username, password } = req.body;
    const result = await signInWithUsernameAndPassword(username, password, client);
    handleAuthResult(req, res, result);
  }),
);

router.post(
  '/auth/logout',
  requireAuth,
  catchAsync(async (req, res) => {
    try {
      await signOut(client);
    } catch {
      // Clear local cookies even if remote logout fails
    }
    client.clearSession();
    clearVoultAuth(res);
    res.json({ message: 'Logged out successfully' });
  }),
);

// MFA
router.post(
  '/auth/mfa/verify',
  catchAsync(async (req, res) => {
    const { mfaPendingToken, mfaToken } = req.body;
    const token = mfaPendingToken || readVoultTokens(req).mfaPendingToken;
    const result = await verifyMfaLogin(token, mfaToken, client);
    handleAuthResult(req, res, result);
  }),
);

router.get(
  '/auth/mfa/status',
  requireAuth,
  catchAsync(async (_req, res) => {
    const result = await getMfaStatus(client);
    sendSanitizedGet(res, 'auth/mfa/status', result);
  }),
);

router.post(
  '/auth/mfa/setup',
  requireAuth,
  catchAsync(async (_req, res) => {
    const result = await setupMfa(client);
    res.json(result);
  }),
);

router.post(
  '/auth/mfa/enable',
  requireAuth,
  catchAsync(async (req, res) => {
    const { token } = req.body;
    const result = await enableMfa(token, client);
    res.json(result);
  }),
);

router.post(
  '/auth/mfa/disable',
  requireAuth,
  catchAsync(async (req, res) => {
    const { password, mfaToken } = req.body;
    const result = await disableMfa(password, mfaToken, client);
    res.json(result);
  }),
);

router.post(
  '/auth/mfa/backup-codes/regenerate',
  requireAuth,
  catchAsync(async (req, res) => {
    const { token } = req.body;
    const result = await regenerateMfaBackupCodes(token, client);
    res.json(result);
  }),
);

// WebAuthn
router.get(
  '/auth/webauthn/compatibility',
  catchAsync(async (_req, res) => {
    const result = await getWebAuthnCompatibility(client);
    sendSanitizedGet(res, 'auth/webauthn/compatibility', result);
  }),
);

router.post(
  '/auth/webauthn/register/options',
  requireAuth,
  catchAsync(async (req, res) => {
    const { deviceName } = req.body;
    const result = await createPasskeyRegistrationOptions({ deviceName }, client);
    res.json(result);
  }),
);

router.post(
  '/auth/webauthn/register/verify',
  requireAuth,
  catchAsync(async (req, res) => {
    const { credential, deviceName } = req.body;
    const result = await verifyPasskeyRegistration(credential, { deviceName }, client);
    res.json(result);
  }),
);

router.post(
  '/auth/webauthn/login/options',
  catchAsync(async (req, res) => {
    const { email } = req.body;
    const result = await createPasskeyLoginOptions({ email }, client);
    res.json(result);
  }),
);

router.post(
  '/auth/webauthn/login/verify',
  catchAsync(async (req, res) => {
    const { credential } = req.body;
    const result = await verifyPasskeyLogin(credential, client);
    handleAuthResult(req, res, result);
  }),
);

router.get(
  '/auth/webauthn/credentials',
  requireAuth,
  catchAsync(async (_req, res) => {
    const result = await listPasskeys(client);
    sendSanitizedGet(res, 'auth/webauthn/credentials', result);
  }),
);

router.patch(
  '/auth/webauthn/credentials/:id',
  requireAuth,
  catchAsync(async (req, res) => {
    const { deviceName } = req.body;
    const result = await updatePasskey(req.params.id, deviceName, client);
    res.json(result);
  }),
);

router.delete(
  '/auth/webauthn/credentials/:id',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await deletePasskey(req.params.id, client);
    res.json(result);
  }),
);

// Sessions
router.get(
  '/sessions',
  requireAuth,
  catchAsync(async (_req, res) => {
    const result = await listSessions(client);
    sendSanitizedGet(res, 'sessions', result);
  }),
);

router.get(
  '/sessions/revoke/:sessionId',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await revokeSession(req.params.sessionId, client);
    res.json(result);
  }),
);

router.post(
  '/sessions/refresh',
  requireAuth,
  catchAsync(async (_req, res) => {
    const result = await refreshSession(client);
    persistVoultAuth(res, {
      user: client.getCurrentUser(),
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    res.json(result);
  }),
);

// User
router.get(
  '/user/me',
  requireAuth,
  catchAsync(async (_req, res) => {
    const profile = await getCurrentUser(client);
    sendSanitizedGet(res, 'user/me', profile);
  }),
);

router.patch(
  '/user/me',
  requireAuth,
  catchAsync(async (req, res) => {
    const { fullName } = req.body;
    const result = await updateProfile({ fullName }, client);
    if (client.getCurrentUser()) {
      persistVoultAuth(res, {
        accessToken: client.accessToken,
        refreshToken: client.refreshToken,
        user: client.getCurrentUser(),
      });
    }
    sendSanitizedJson(res, result);
  }),
);

router.get(
  '/user/verify-email',
  catchAsync(async (req, res) => {
    const { token, appId } = req.query;
    const result = await verifyEmail(token, { appId }, client);
    res.json(result);
  }),
);

router.post(
  '/user/forgot-password',
  catchAsync(async (req, res) => {
    const { email } = req.body;
    const result = await sendPasswordResetEmail(email, client);
    res.json(result);
  }),
);

router.post(
  '/user/reset-password',
  catchAsync(async (req, res) => {
    const { token, password, appId } = req.body;
    const result = await resetPassword(token, password, { appId }, client);
    res.json(result);
  }),
);

router.post(
  '/user/disable',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await deleteUser(client);
    client.clearSession();
    clearVoultAuth(res);
    res.json(result);
  }),
);

router.post(
  '/user/reenable',
  requireAuth,
  catchAsync(async (_req, res) => {
    const result = await reenableAccount(client);
    res.json(result);
  }),
);

// Magic link
router.post(
  '/send-magic-link',
  catchAsync(async (req, res) => {
    const { email, redirectUri } = req.body;
    const uri = redirectUri?.trim() || `${getFrontendUrl()}/magic-callback`;
    const result = await signInWithEmailLink(email, { redirectUri: uri }, client);
    res.json({ ...result, redirectUriUsed: uri });
  }),
);

router.post(
  '/validate-magic-link',
  catchAsync(async (req, res) => {
    const { token } = req.body;
    const result = await verifyEmailLink(token, client);
    handleAuthResult(req, res, result);
  }),
);

// OAuth providers
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
        const result = await OAUTH_HANDLERS[provider][action](req.body, client);
        handleAuthResult(req, res, { ...result, provider });
      }),
    );
  }
}

// OAuth linking
router.post(
  '/oauth/:provider/link',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await linkOAuthProvider(req.params.provider, client);
    res.json(result);
  }),
);

router.get(
  '/me/oauth-accounts',
  requireAuth,
  catchAsync(async (_req, res) => {
    const result = await getLinkedOAuthProviders(client);
    sendSanitizedGet(res, 'me/oauth-accounts', result);
  }),
);

router.delete(
  '/me/oauth-accounts/:provider',
  requireAuth,
  catchAsync(async (req, res) => {
    const result = await unlinkOAuthProvider(req.params.provider, client);
    res.json(result);
  }),
);

router.post(
  '/me/set-password',
  requireAuth,
  catchAsync(async (req, res) => {
    const { password } = req.body;
    const result = await setPassword(password, client);
    res.json(result);
  }),
);

// Audit logs (raw HTTP — not in SDK)
router.get(
  '/audit-logs/me',
  requireAuth,
  catchAsync(async (_req, res) => {
    const result = await client.get('/api/audit-logs/me', { requireAuth: true });
    sendSanitizedGet(res, 'audit-logs/me', result);
  }),
);

// Provider visibility
router.get(
  '/provider-visibility',
  catchAsync(async (_req, res) => {
    const result = await client.get(`/api/provider-visibility/${client.clientId}`);
    sendSanitizedGet(res, 'provider-visibility', result);
  }),
);

// OAuth redirect flow config. GitHub is Voult-hosted (dashboard enablement).
router.get(
  '/oauth/config',
  catchAsync(async (_req, res) => {
    const backendUrl = process.env.OAUTH_REDIRECT_BASE_URL || `http://localhost:${process.env.PORT || 2000}`;
    const providers = ['google', 'github', 'facebook', 'linkedin', 'microsoft', 'apple'];
    const hostedProviders = new Set(['github']);

    let visibility = {};
    try {
      const result = await client.get(`/api/provider-visibility/${client.clientId}`);
      visibility = result?.providers || {};
    } catch {
      visibility = {};
    }

    const config = Object.fromEntries(
      providers.map((provider) => [
        provider,
        {
          hosted: hostedProviders.has(provider),
          configured: hostedProviders.has(provider)
            ? Boolean(visibility[provider])
            : Boolean(
                process.env[`${provider.toUpperCase()}_CLIENT_ID`] &&
                  process.env[`${provider.toUpperCase()}_CLIENT_SECRET`],
              ),
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
