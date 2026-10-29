// CI guard (Phase 4, DoD G1): colours come from tokens.css, nowhere else. Counts the colour literals (hex,
// rgb()/hsl()/… functions, named colours) in every CSS file under <dir> except tokens.css and compares each
// file's count with css-colors.allowlist.json at the repo root. The allowlist holds the files written before
// the design system; their counts can only go down. Any other file must have none.
//   node scripts/check-css-colors.mjs <dir>
// The same file lives in voult and voult-playground; see docs/design/DESIGN_SYSTEM.md (§16).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ALLOWLIST = 'css-colors.allowlist.json';

const NAMED = new Set(('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown '
  + 'burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod '
  + 'darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen '
  + 'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue '
  + 'firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew '
  + 'hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan '
  + 'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray '
  + 'lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid '
  + 'mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream '
  + 'mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen '
  + 'paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown '
  + 'royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow '
  + 'springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen').split(' '));

// A declaration's value (`prop: value;`); selectors such as `#main` or `a:hover {` never match.
const DECLARATION = /[\w-]+\s*:([^;{}]+)(?=[;}])/g;
// In a value: a hex colour (also inside a data: URL, where # is %23), a colour function, or a bare word.
const LITERAL = /(?:#|%23)[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(|(?<![\w-])[a-z]+(?![\w-])/gi;

/** Colour literals in one stylesheet. */
export function countColors(css) {
  let count = 0;
  for (const [, value] of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(DECLARATION)) {
    for (const [token] of value.matchAll(LITERAL)) {
      if (/^(#|%23)|\($/.test(token) || NAMED.has(token.toLowerCase())) count++;
    }
  }
  return count;
}

/** @returns {string[]} problems, empty when every file is within its allowance */
export function checkColors(dir, allowed) {
  const problems = [];
  const files = fs.readdirSync(dir, { recursive: true })
    .map((f) => f.split(path.sep).join('/'))
    .filter((f) => f.endsWith('.css') && path.basename(f) !== 'tokens.css' && !f.split('/').includes('node_modules'));
  for (const file of files) {
    const count = countColors(fs.readFileSync(path.join(dir, file), 'utf8'));
    const limit = allowed[file] ?? 0; // eslint-disable-line security/detect-object-injection -- file comes from readdirSync
    if (count > limit) {
      problems.push(`${file}: ${count} colour literal(s), allowed ${limit}. Use a token from tokens.css (DESIGN_SYSTEM.md §4); a colour the tokens lack is added in voult-landing first (§16).`);
    } else if (count < limit) {
      problems.push(`${file}: ${count} colour literal(s), allowlist says ${limit}. Lower it to ${count} in ${ALLOWLIST}, so the removed ones can't come back.`);
    }
  }
  for (const file of Object.keys(allowed).filter((f) => !files.includes(f))) {
    problems.push(`${file}: no longer exists. Remove it from ${ALLOWLIST}.`);
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Usage: node scripts/check-css-colors.mjs <directory of CSS files>');
    process.exit(2);
  }
  const { files: allowed } = JSON.parse(fs.readFileSync(ALLOWLIST, 'utf8'));
  const problems = checkColors(dir, allowed);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log(`${dir}: no colour literals outside tokens.css beyond ${ALLOWLIST}`);
}
