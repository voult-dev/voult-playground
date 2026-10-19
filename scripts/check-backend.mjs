// CI guard: the playground's server stays the template's server. Every auth route comes from
// @voult/express (backend/auth.js); the playground used to hand-write ~30 of them in
// backend/src/routes/api.js. Fails when that starts again.
//   node scripts/check-backend.mjs [backendDir]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The template's own routes: the /api/me example and the SPA fallback.
const ALLOWED_ROUTES = new Set(['api.js /me', 'server.js /{*page}']);
const ROUTE = /\.(get|post|put|patch|delete|all)\(\s*(['"`])([^'"`]+)\2/g;
const AUTH_PACKAGES = /from\s+['"]@voult\/(sdk|core)['"]|require\(\s*['"]@voult\/(sdk|core)['"]\s*\)/;

/** @returns {string[]} problems, empty when the backend is clean */
export function checkBackend(dir) {
  const problems = [];
  const files = fs.readdirSync(dir, { recursive: true })
    .filter((f) => /\.[cm]?[jt]s$/.test(f) && !f.split(path.sep).includes('node_modules'));
  for (const file of files) {
    const name = file.split(path.sep).join('/');
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    const lineOf = (index) => source.slice(0, index).split('\n').length;

    if (name !== 'auth.js' && AUTH_PACKAGES.test(source)) {
      problems.push(`backend/${name}: imports @voult/sdk or @voult/core. Auth logic belongs in the router (backend/auth.js mounts @voult/express).`);
    }
    for (const match of source.matchAll(ROUTE)) {
      const route = `${name} ${match[3]}`;
      if (!ALLOWED_ROUTES.has(route)) {
        problems.push(`backend/${name}:${lineOf(match.index)}: route ${match[1].toUpperCase()} ${match[3]}. The router (@voult/express) serves every auth route; if it lacks one, add it to @voult/core, not here.`);
      }
    }
  }
  const auth = path.join(dir, 'auth.js');
  if (!fs.existsSync(auth) || !fs.readFileSync(auth, 'utf8').includes('createVoultRouter(')) {
    problems.push('backend/auth.js: must mount createVoultRouter() from @voult/express.');
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'backend');
  const problems = checkBackend(dir);
  if (problems.length > 0) {
    console.error(`The playground's server has auth code of its own:\n${problems.map((p) => `  ✗ ${p}`).join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log('✓ backend/: only the router mount and the template\'s own routes');
  }
}
