// Keeps this repo's copy of the design tokens identical to voult-landing's (the source of truth).
//   node scripts/sync-tokens.mjs <copy>           download voult-landing main's tokens.css over <copy>
//   node scripts/sync-tokens.mjs <copy> --check   exit 1, with a diff, if <copy> differs
// The same file lives in voult and voult-playground; see docs/design/DESIGN_SYSTEM.md (sync rule).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const SOURCE = 'https://raw.githubusercontent.com/voult-dev/voult-landing/main/public/css/tokens.css';
const [dest, flag] = process.argv.slice(2);
if (!dest) {
  console.error('Usage: node scripts/sync-tokens.mjs <path to this repo\'s tokens.css> [--check]');
  process.exit(2);
}

const res = await fetch(SOURCE);
if (!res.ok) {
  console.error(`Could not download ${SOURCE}: HTTP ${res.status}`);
  process.exit(2);
}
const canonical = await res.text();
const local = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : null;

if (flag !== '--check') {
  fs.writeFileSync(dest, canonical);
  console.log(local === canonical ? `${dest} already up to date` : `${dest} updated from voult-landing`);
} else if (local === canonical) {
  console.log(`${dest} matches voult-landing`);
} else {
  console.error(`${dest} differs from voult-landing's tokens.css. Tokens change only in voult-landing; run:\n  node scripts/sync-tokens.mjs ${dest}\n`);
  if (local !== null) {
    const tmp = `${dest}.canonical`;
    fs.writeFileSync(tmp, canonical);
    try { execFileSync('diff', ['-u', dest, tmp], { stdio: 'inherit' }); } catch { /* diff exits 1 when files differ */ }
    fs.rmSync(tmp);
  }
  process.exit(1);
}
