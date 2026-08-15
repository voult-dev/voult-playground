import { describe, it, expect, vi } from 'vitest';
import requireAuth from '../../src/middleware/requireAuth.js';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../../src/utils/voultTokens.js';

function createMocks() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res = { status };
  const next = vi.fn();
  return { res, status, json, next };
}

describe('requireAuth', () => {
  it('returns 401 when no auth cookies are present', () => {
    const req = { cookies: {} };
    const { res, status, json, next } = createMocks();

    requireAuth(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Sign in first to perform that action.',
        status: 401,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when access token cookie is present', () => {
    const req = { cookies: { [ACCESS_COOKIE]: 'token' } };
    const { res, next } = createMocks();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('calls next when only refresh token cookie is present', () => {
    const req = { cookies: { [REFRESH_COOKIE]: 'refresh' } };
    const { res, next } = createMocks();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
