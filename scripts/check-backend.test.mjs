import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkBackend } from './check-backend.mjs';

const backend = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'backend');

/** A copy of the real backend/, with one file changed. */
function withFile(name, source) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'playground-backend-'));
  fs.cpSync(backend, dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), source);
  return dir;
}

test('the real backend/ passes', () => {
  assert.deepEqual(checkBackend(backend), []);
});

test('a hand-written auth route fails, with the file and line', () => {
  const dir = withFile('api.js', `${fs.readFileSync(path.join(backend, 'api.js'), 'utf8')}\napi.post('/mfa/setup', (req, res) => res.json({}));\n`);
  const problems = checkBackend(dir);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /backend\/api\.js:\d+: route POST \/mfa\/setup/);
});

test('a new routes file importing the SDK fails twice (import + route)', () => {
  const dir = withFile('routes.js', "import { listSessions } from '@voult/sdk';\nexport const r = (router) => router.get('/sessions', async (req, res) => res.json(await listSessions(req.voult)));\n");
  const problems = checkBackend(dir);
  assert.ok(problems.some((p) => p.includes('backend/routes.js: imports @voult/sdk')));
  assert.ok(problems.some((p) => p.includes('route GET /sessions')));
});

test('removing the router mount fails', () => {
  const dir = withFile('auth.js', 'export function mountAuth() {}\n');
  assert.ok(checkBackend(dir).some((p) => p.includes('must mount createVoultRouter()')));
});
