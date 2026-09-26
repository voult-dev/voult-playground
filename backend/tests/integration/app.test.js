import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import '../mocks.js';
import { mockClient } from '../mocks.js';
import { exchangeOAuthCode, getAppInfo, getOAuthAuthorizationUrl } from '@voult/sdk';
import { createApp } from '../../src/app.js';

describe('BFF HTTP routes', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    mockClient.accessToken = null;
    mockClient.refreshToken = null;
    mockClient.user = null;
  });

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'voult-playground-bff' });
  });

  it('GET /api/auth/session reports unauthenticated by default', async () => {
    const res = await request(app).get('/api/auth/session');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ authenticated: false, user: null });
  });

  it('GET /api/auth/mfa/status requires authentication', async () => {
    const res = await request(app).get('/api/auth/mfa/status');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/provider-visibility proxies to Voult with client id', async () => {
    mockClient.get.mockResolvedValueOnce({
      providers: { google: true, github: false },
    });

    const res = await request(app).get('/api/provider-visibility');

    expect(res.status).toBe(200);
    expect(res.body.providers.google).toBe(true);
    expect(mockClient.get).toHaveBeenCalledWith('/api/provider-visibility/app_test123');
  });

  it('GET /api/auth/oauth/providers lists providers that are on and configured (@voult/express)', async () => {
    getAppInfo.mockResolvedValueOnce({
      providers: {
        google: { enabled: true, configured: true },
        github: { enabled: true, configured: false },
      },
    });

    const res = await request(app).get('/api/auth/oauth/providers');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ providers: { google: true, github: false } });
  });

  it.each(['google', 'github'])(
    'GET /api/auth/oauth/%s/start redirects to the provider via Voult with a state nonce',
    async (provider) => {
      getOAuthAuthorizationUrl.mockResolvedValueOnce({ authUrl: `https://example.test/oauth/${provider}` });

      const res = await request(app).get(`/api/auth/oauth/${provider}/start`);

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`https://example.test/oauth/${provider}`);
      expect(res.headers['set-cookie'].join(';')).toMatch(/voult_oauth=/);
      expect(getOAuthAuthorizationUrl).toHaveBeenCalledWith(
        provider,
        expect.objectContaining({
          intent: 'authenticate',
          redirectUri: expect.stringMatching(/\/api\/auth\/oauth\/callback$/),
          state: expect.any(String),
        }),
        expect.anything(),
      );
    },
  );

  it('OAuth callback lands on the playground pages (/account, /oauth for errors)', async () => {
    getOAuthAuthorizationUrl.mockImplementationOnce(async (_p, { state }) => ({ authUrl: `https://example.test/?state=${state}` }));
    exchangeOAuthCode.mockImplementationOnce(async (_code, _opts, client) => {
      client.setSession({ id: 'u1', email: 'oauth@example.com' }, 'access-1', 'refresh-1');
      return { accessToken: 'access-1', refreshToken: 'refresh-1', user: { id: 'u1', email: 'oauth@example.com' } };
    });

    const agent = request.agent(app);
    const start = await agent.get('/api/auth/oauth/google/start');
    const state = new URL(start.headers.location).searchParams.get('state');

    const done = await agent.get('/api/auth/oauth/callback').query({ voult_code: 'otc_1', state });
    expect(done.headers.location).toBe('http://localhost:5173/account');

    const forged = await request(app).get('/api/auth/oauth/callback').query({ voult_code: 'otc_1', state: 'x' });
    expect(forged.headers.location).toMatch(/^http:\/\/localhost:5173\/oauth\?voult_error=INVALID_OAUTH_STATE/);
  });

  it.each(['/oauth/google/start', '/api/oauth/config', '/auth/google/callback'])(
    'the old playground-only OAuth route %s is gone',
    async (path) => {
      const res = await request(app).get(path);
      expect(res.status).toBe(404);
    },
  );

  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
