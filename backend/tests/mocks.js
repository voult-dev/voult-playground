import { vi } from 'vitest';

export const mockClient = {
  clientId: 'app_test123',
  clientSecret: 'secret_test',
  accessToken: null,
  refreshToken: null,
  user: null,
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  setSession: vi.fn((user, accessToken, refreshToken) => {
    mockClient.user = user;
    mockClient.accessToken = accessToken;
    mockClient.refreshToken = refreshToken;
  }),
  clearSession: vi.fn(() => {
    mockClient.user = null;
    mockClient.accessToken = null;
    mockClient.refreshToken = null;
  }),
  isAuthenticated: vi.fn(() => Boolean(mockClient.accessToken && mockClient.user)),
  getCurrentUser: vi.fn(() => mockClient.user),
};

vi.mock('../src/config/client.js', () => ({
  default: mockClient,
}));

vi.mock('@voult/express', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createVoultMiddleware: () => (req, _res, next) => {
      req.voultConfig = {
        clientId: mockClient.clientId,
        clientSecret: mockClient.clientSecret,
        session: { strategy: 'cookie' },
      };
      req.voult = mockClient;
      next();
    },
  };
});

vi.mock('voult-sdk', () => ({
  VoultClient: vi.fn(() => mockClient),
  DEFAULT_BASE_URL: 'https://api.voult.dev',
  VoultError: class VoultError extends Error {
    constructor(message, code, status) {
      super(message);
      this.name = 'VoultError';
      this.code = code;
      this.status = status;
    }
  },
  AuthenticationError: class AuthenticationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'AuthenticationError';
      this.code = 'AUTHENTICATION_ERROR';
      this.status = 401;
    }
  },
  ValidationError: class ValidationError extends Error {
    constructor(message, field) {
      super(message);
      this.name = 'ValidationError';
      this.code = 'VALIDATION_ERROR';
      this.status = 400;
      this.field = field;
    }
  },
  signUpWithEmailAndPassword: vi.fn(),
  signUpWithUsernameAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithUsernameAndPassword: vi.fn(),
  signInWithEmailLink: vi.fn(),
  verifyEmailLink: vi.fn(),
  signOut: vi.fn(),
  deleteUser: vi.fn(),
  getCurrentUser: vi.fn(),
  updateProfile: vi.fn(),
  reenableAccount: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
  refreshSession: vi.fn(),
  listSessions: vi.fn(),
  revokeSession: vi.fn(),
  verifyMfaLogin: vi.fn(),
  getMfaStatus: vi.fn(),
  setupMfa: vi.fn(),
  enableMfa: vi.fn(),
  disableMfa: vi.fn(),
  regenerateMfaBackupCodes: vi.fn(),
  getWebAuthnCompatibility: vi.fn(),
  createPasskeyRegistrationOptions: vi.fn(),
  verifyPasskeyRegistration: vi.fn(),
  createPasskeyLoginOptions: vi.fn(),
  verifyPasskeyLogin: vi.fn(),
  listPasskeys: vi.fn(),
  updatePasskey: vi.fn(),
  deletePasskey: vi.fn(),
  signInWithGoogle: vi.fn(),
  signUpWithGoogle: vi.fn(),
  authenticateWithGoogle: vi.fn(),
  signInWithGitHub: vi.fn(),
  signUpWithGitHub: vi.fn(),
  authenticateWithGitHub: vi.fn(),
  signInWithFacebook: vi.fn(),
  signUpWithFacebook: vi.fn(),
  authenticateWithFacebook: vi.fn(),
  signInWithLinkedIn: vi.fn(),
  signUpWithLinkedIn: vi.fn(),
  authenticateWithLinkedIn: vi.fn(),
  signInWithMicrosoft: vi.fn(),
  signUpWithMicrosoft: vi.fn(),
  authenticateWithMicrosoft: vi.fn(),
  signInWithApple: vi.fn(),
  signUpWithApple: vi.fn(),
  authenticateWithApple: vi.fn(),
  getOAuthAuthorizationUrl: vi.fn(),
  exchangeOAuthCode: vi.fn(),
  linkOAuthProvider: vi.fn(),
  getLinkedOAuthProviders: vi.fn(),
  unlinkOAuthProvider: vi.fn(),
  setPassword: vi.fn(),
}));
