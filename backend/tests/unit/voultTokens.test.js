import { describe, it, expect, vi } from 'vitest';
import {
  persistVoultAuth,
  clearVoultAuth,
  persistMfaPending,
  readVoultTokens,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  USER_COOKIE,
  MFA_COOKIE,
} from '../../src/utils/voultTokens.js';

function createRes() {
  const cookies = {};
  const cleared = [];

  return {
    cookies,
    cookie(name, value, _options) {
      cookies[name] = value;
    },
    clearCookie(name, _options) {
      cleared.push(name);
      delete cookies[name];
    },
    cleared,
  };
}

describe('readVoultTokens', () => {
  it('reads tokens and user from cookies', () => {
    const req = {
      cookies: {
        [ACCESS_COOKIE]: 'access',
        [REFRESH_COOKIE]: 'refresh',
        [MFA_COOKIE]: 'mfa',
        [USER_COOKIE]: JSON.stringify({ email: 'a@b.com' }),
      },
    };

    expect(readVoultTokens(req)).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
      mfaPendingToken: 'mfa',
      user: { email: 'a@b.com' },
    });
  });
});

describe('persistVoultAuth', () => {
  it('stores user and tokens in httpOnly cookies', () => {
    const res = createRes();

    persistVoultAuth(res, {
      user: { id: 'u1', email: 'a@b.com' },
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    expect(res.cookies[ACCESS_COOKIE]).toBe('access');
    expect(res.cookies[REFRESH_COOKIE]).toBe('refresh');
    expect(JSON.parse(res.cookies[USER_COOKIE])).toEqual({ email: 'a@b.com' });
    expect(res.cleared).toContain(MFA_COOKIE);
  });

  it('accepts token alias for accessToken', () => {
    const res = createRes();
    persistVoultAuth(res, { token: 'legacy-token', user: null });
    expect(res.cookies[ACCESS_COOKIE]).toBe('legacy-token');
  });

  it('no-ops when res or tokens are missing', () => {
    const res = createRes();
    persistVoultAuth(null, { user: { id: 'u1' } });
    persistVoultAuth(res, { user: { id: 'u1' } });
    persistVoultAuth(res, null);
    expect(Object.keys(res.cookies)).toHaveLength(0);
  });
});

describe('clearVoultAuth', () => {
  it('clears all auth cookies', () => {
    const res = createRes();
    res.cookies[ACCESS_COOKIE] = 'x';
    res.cookies[REFRESH_COOKIE] = 'y';
    res.cookies[USER_COOKIE] = '{}';
    res.cookies[MFA_COOKIE] = 'pending';

    clearVoultAuth(res);

    expect(res.cleared).toEqual(
      expect.arrayContaining([ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE, MFA_COOKIE]),
    );
  });
});

describe('persistMfaPending', () => {
  it('stores mfaPendingToken in a cookie', () => {
    const res = createRes();
    persistMfaPending(res, 'mfa-token');
    expect(res.cookies[MFA_COOKIE]).toBe('mfa-token');
  });

  it('no-ops when res or token is missing', () => {
    const res = createRes();
    persistMfaPending(null, 'token');
    persistMfaPending(res, null);
    expect(res.cookies[MFA_COOKIE]).toBeUndefined();
  });
});
