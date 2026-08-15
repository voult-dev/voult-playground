import { describe, it, expect, vi, beforeEach } from 'vitest';
import syncVoultClient from '../../src/middleware/syncVoultClient.js';
import client from '../../src/config/client.js';
import { persistVoultAuth, ACCESS_COOKIE } from '../../src/utils/voultTokens.js';

function createRes() {
  const cookies = {};

  const res = {
    headersSent: false,
    cookie(name, value) {
      cookies[name] = value;
    },
    clearCookie(name) {
      delete cookies[name];
    },
    redirect(url) {
      this.headersSent = true;
      return url;
    },
    json(body) {
      this.headersSent = true;
      return body;
    },
    cookies,
  };

  return res;
}

describe('syncVoultClient', () => {
  beforeEach(() => {
    client.clearSession();
  });

  it('persists updated tokens before redirect (OAuth flow)', () => {
    const req = { cookies: {}, originalUrl: '/oauth/callback/google' };
    const res = createRes();
    const next = vi.fn();

    syncVoultClient(req, res, next);
    expect(next).toHaveBeenCalled();

    client.setSession({ email: 'a@b.com' }, 'new-access', 'new-refresh');
    res.redirect('http://localhost:5173/account');

    expect(res.headersSent).toBe(true);
    expect(res.cookies[ACCESS_COOKIE]).toBe('new-access');
  });

  it('no-ops persistVoultAuth when headers are already sent', () => {
    const res = createRes();
    res.headersSent = true;

    expect(() => {
      persistVoultAuth(res, { accessToken: 'late-token' });
    }).not.toThrow();

    expect(res.cookies[ACCESS_COOKIE]).toBeUndefined();
  });
});
