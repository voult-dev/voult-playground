import { describe, it, expect } from 'vitest';
import { describeOAuthError } from './oauthErrors';

describe('describeOAuthError', () => {
  it('treats a consent-screen cancel as a friendly cancel', () => {
    const result = describeOAuthError({ code: 'access_denied', description: 'The user denied access' });
    expect(result.cancelled).toBe(true);
    expect(result.message).toMatch(/cancelled/);
  });

  it('falls back to the server description, then a generic message', () => {
    expect(describeOAuthError({ code: 'X', description: 'Boom' }).message).toBe('Boom');
    expect(describeOAuthError({ code: 'X', description: null }).message).toMatch(/failed/);
  });
});
