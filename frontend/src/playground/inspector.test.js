import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { clearEntries, getEntries, installInspector, redact } from './inspector.js';

/** A window-like object whose fetch answers JSON. */
function fakeWindow(answer = { status: 200, body: { ok: true } }) {
  const calls = [];
  const win = {
    location: { href: 'http://localhost:5173/account' },
    fetch: async (input, init) => {
      calls.push([input, init]);
      if (answer instanceof Error) throw answer;
      return new Response(JSON.stringify(answer.body), { status: answer.status, headers: { 'Content-Type': 'application/json' } });
    },
  };
  installInspector(win);
  return { win, calls };
}

beforeEach(() => clearEntries());

test('records /api/* calls with method, path, status, masked request and response', async () => {
  const { win } = fakeWindow({ status: 200, body: { user: { email: 'a@b.test' } } });
  const res = await win.fetch('/api/auth/email-login?x=1', { method: 'post', body: JSON.stringify({ email: 'a@b.test', password: 'hunter22', nested: { refreshToken: 't' } }) });
  assert.equal((await res.json()).user.email, 'a@b.test', 'the page still gets the body');
  const [entry] = getEntries();
  assert.equal(entry.method, 'POST');
  assert.equal(entry.path, '/api/auth/email-login?x=1');
  assert.equal(entry.status, 200);
  assert.deepEqual(entry.request, { email: 'a@b.test', password: '••••', nested: { refreshToken: '••••' } });
  assert.deepEqual(entry.response, { user: { email: 'a@b.test' } });
});

test('ignores calls outside /api', async () => {
  const { win, calls } = fakeWindow();
  await win.fetch('/images/favicon.svg');
  assert.equal(calls.length, 1);
  assert.deepEqual(getEntries(), []);
});

test('errors are recorded too: HTTP errors and network failures', async () => {
  const { win } = fakeWindow({ status: 401, body: { error: { code: 'AUTHENTICATION_ERROR' } } });
  await win.fetch('/api/auth/sessions');
  assert.equal(getEntries()[0].status, 401);

  const offline = fakeWindow(new TypeError('Failed to fetch'));
  await assert.rejects(() => offline.win.fetch('/api/auth/session'), /Failed to fetch/);
  assert.equal(getEntries()[0].status, 0);
  assert.match(getEntries()[0].response.networkError, /Failed to fetch/);
});

test('keeps the newest 25, newest first', async () => {
  const { win } = fakeWindow();
  for (let i = 0; i < 30; i += 1) await win.fetch(`/api/n/${i}`);
  assert.equal(getEntries().length, 25);
  assert.equal(getEntries()[0].path, '/api/n/29');
});

test('redact masks password, secret and token keys at any depth, leaves the rest', () => {
  assert.deepEqual(redact({ newPassword: 'x', clientSecret: 'y', list: [{ token: 'z', code: '123456' }] }),
    { newPassword: '••••', clientSecret: '••••', list: [{ token: '••••', code: '123456' }] });
});
