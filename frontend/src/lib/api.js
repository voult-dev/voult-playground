export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export async function api(path, options = {}) {
  const { method = 'GET', body, headers = {} } = options;

  const config = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || data?.message || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.error?.code;
    error.data = data;
    throw error;
  }

  return data;
}

export const endpoints = {
  session: 'GET /api/auth/session',
  register: 'POST /api/auth/register',
  usernameRegister: 'POST /api/auth/username-register',
  emailLogin: 'POST /api/auth/email-login',
  usernameLogin: 'POST /api/auth/username-login',
  logout: 'POST /api/auth/logout',
  mfaVerify: 'POST /api/auth/mfa/verify',
  mfaStatus: 'GET /api/auth/mfa/status',
  mfaSetup: 'POST /api/auth/mfa/setup',
  mfaEnable: 'POST /api/auth/mfa/enable',
  mfaDisable: 'POST /api/auth/mfa/disable',
  mfaRegenerate: 'POST /api/auth/mfa/backup-codes/regenerate',
  webauthnCompatibility: 'GET /api/auth/webauthn/compatibility',
  webauthnRegisterOptions: 'POST /api/auth/webauthn/register/options',
  webauthnRegisterVerify: 'POST /api/auth/webauthn/register/verify',
  webauthnLoginOptions: 'POST /api/auth/webauthn/login/options',
  webauthnLoginVerify: 'POST /api/auth/webauthn/login/verify',
  webauthnCredentials: 'GET /api/auth/webauthn/credentials',
  sessions: 'GET /api/sessions',
  sessionRefresh: 'POST /api/sessions/refresh',
  sessionRevoke: 'GET /api/sessions/revoke/:id',
  me: 'GET /api/user/me',
  updateMe: 'PATCH /api/user/me',
  verifyEmail: 'GET /api/user/verify-email',
  forgotPassword: 'POST /api/user/forgot-password',
  resetPassword: 'POST /api/user/reset-password',
  disableAccount: 'POST /api/user/disable',
  reenableAccount: 'POST /api/user/reenable',
  sendMagicLink: 'POST /api/send-magic-link',
  validateMagicLink: 'POST /api/validate-magic-link',
  oauthAccounts: 'GET /api/me/oauth-accounts',
  setPassword: 'POST /api/me/set-password',
  auditLogs: 'GET /api/audit-logs/me',
  providerVisibility: 'GET /api/provider-visibility',
};
