import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import '../mocks.js';
import { mockClient } from '../mocks.js';
import { getOAuthAuthorizationUrl } from 'voult-sdk';
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
    expect(res.body).toEqual({
      authenticated: false,
      user: null,
      mfaPending: false,
    });
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

  it('GET /api/oauth/config returns all providers hosted and enabled in playground', async () => {
    mockClient.get.mockResolvedValueOnce({
      providers: { google: true, github: false },
    });

    const res = await request(app).get('/api/oauth/config');
    expect(res.status).toBe(200);

    for (const provider of ['google', 'github', 'facebook', 'linkedin', 'microsoft', 'apple']) {
      expect(res.body[provider]).toMatchObject({
        hosted: true,
        configured: true,
        callbackUrl: expect.stringContaining(`/oauth/callback/${provider}`),
      });
    }

    expect(res.body.google.enabledInVoult).toBe(true);
    expect(res.body.github.enabledInVoult).toBe(false);
    expect(mockClient.get).toHaveBeenCalledWith('/api/provider-visibility/app_test123');
  });

  it.each(['google', 'github', 'facebook', 'linkedin', 'microsoft', 'apple'])(
    'GET /oauth/%s/start asks Voult for the auth URL',
    async (provider) => {
      getOAuthAuthorizationUrl.mockResolvedValueOnce({
        authUrl: `https://example.test/oauth/${provider}`,
      });

      const res = await request(app).get(`/oauth/${provider}/start`);

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`https://example.test/oauth/${provider}`);
      expect(getOAuthAuthorizationUrl).toHaveBeenCalledWith(
        provider,
        expect.objectContaining({
          intent: 'authenticate',
          redirectUri: expect.stringContaining(`/oauth/callback/${provider}`),
        }),
        mockClient,
      );
    },
  );

  it('GET /auth/google/callback redirects to oauth callback route', async () => {
    const res = await request(app)
      .get('/auth/google/callback')
      .query({ code: 'abc', state: 'xyz' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/oauth/callback/google?code=abc&state=xyz');
  });

  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
