import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ALLOWLIST, checkColors, countColors } from './check-css-colors.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'frontend', 'src');
const { files: allowed } = JSON.parse(fs.readFileSync(path.join(root, ALLOWLIST), 'utf8'));

/** A copy of the real frontend/src CSS, with one file changed. */
function withFile(name, css) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'playground-css-'));
  fs.cpSync(src, dir, { recursive: true, filter: (f) => fs.statSync(f).isDirectory() || f.endsWith('.css') });
  fs.writeFileSync(path.join(dir, name), css);
  return dir;
}

test('the real CSS passes', () => {
  assert.deepEqual(checkColors(src, allowed), []);
});

test('a planted literal in playground.css fails, naming the file', () => {
  const name = 'playground/playground.css';
  const dir = withFile(name, `${fs.readFileSync(path.join(src, name), 'utf8')}\n.pg-planted { color: #ff0000; }\n`);
  assert.deepEqual(checkColors(dir, allowed).map((p) => p.split(':')[0]), [name]);
});

test('an allowlisted file may not grow, and must be lowered when it shrinks', () => {
  const css = fs.readFileSync(path.join(src, 'styles.css'), 'utf8');
  assert.match(checkColors(withFile('styles.css', `${css}\na { color: red; }\n`), allowed)[0], /allowed 14/);
  assert.match(checkColors(withFile('styles.css', ''), allowed)[0], /Lower it to 0/);
});

test('counts hex, colour functions and named colours in values only', () => {
  assert.equal(countColors('#main a:hover { color: #fff; background: rgb(0 0 0 / .5); border-color: white; }'), 3);
  assert.equal(countColors('.x { color: var(--text); background: transparent; fill: currentColor; white-space: nowrap; } /* #fff */'), 0);
  assert.equal(countColors(".y { background: url(\"data:image/svg+xml,<svg fill='%23fff'/>\"); }"), 1);
});
