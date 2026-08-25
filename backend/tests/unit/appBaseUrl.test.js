import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getFrontendUrl, getAppBaseUrl } from '../../src/utils/appBaseUrl.js';

describe('getFrontendUrl', () => {
  const envKeys = ['FRONTEND_URL', 'VOULT_APP_URL', 'APP_BASE_URL'];
  const saved = {};

  beforeEach(() => {
    for (const key of envKeys) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('returns FRONTEND_URL when set', () => {
    process.env.FRONTEND_URL = 'http://example.com/';
    expect(getFrontendUrl()).toBe('http://example.com');
  });

  it('falls back to APP_BASE_URL', () => {
    process.env.APP_BASE_URL = 'http://app.example.com/';
    expect(getFrontendUrl()).toBe('http://app.example.com');
  });

  it('defaults to localhost:5173', () => {
    expect(getFrontendUrl()).toBe('http://localhost:5173');
  });

  it('strips trailing slash', () => {
    process.env.FRONTEND_URL = 'http://example.com///';
    expect(getFrontendUrl()).toBe('http://example.com//');
  });
});

describe('getAppBaseUrl', () => {
  let savedAppBaseUrl;

  beforeEach(() => {
    savedAppBaseUrl = process.env.APP_BASE_URL;
  });

  afterEach(() => {
    if (savedAppBaseUrl === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = savedAppBaseUrl;
  });

  it('returns APP_BASE_URL without trailing slash when configured', () => {
    process.env.APP_BASE_URL = 'http://configured.test/';
    const req = { get: () => null, protocol: 'http' };
    expect(getAppBaseUrl(req)).toBe('http://configured.test');
  });

  it('derives URL from request when APP_BASE_URL is unset', () => {
    delete process.env.APP_BASE_URL;
    const req = {
      protocol: 'https',
      get(name) {
        if (name === 'x-forwarded-proto') return 'https';
        if (name === 'x-forwarded-host') return 'bff.example.com';
        if (name === 'host') return 'localhost:2000';
        return null;
      },
    };
    expect(getAppBaseUrl(req)).toBe('https://bff.example.com');
  });
});
