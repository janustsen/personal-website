// Adds ?v=<content hash> to every stylesheet, script and drawing URL in dist/**/*.html,
// so a deploy that changes one of them gives returning visitors a new URL instead of a cached copy.
// `node stamp.mjs` rewrites the HTML; `node stamp.mjs --check` fails if any stamp is stale (run in CI).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, globSync } from 'node:fs';

const check = process.argv.includes('--check');
const asset = /((?:href|src)=")(\/(?:[\w-]+\.(?:css|js)|assets\/drawings\/[\w-]+\.svg))(?:\?v=\w*)?"/g;
const hash = path => createHash('sha256').update(readFileSync(`dist${path}`)).digest('hex').slice(0, 10);
const stale = [];
for (const file of globSync('dist/**/*.html')) {
  const html = readFileSync(file, 'utf8');
  const out = html.replace(asset, (_, attr, path) => `${attr}${path}?v=${hash(path)}"`);
  if (out === html) continue;
  stale.push(file);
  if (!check) writeFileSync(file, out);
}
if (check && stale.length) {
  console.error(`Stale asset versions in ${stale.join(', ')}; run npm run stamp and commit.`);
  process.exit(1);
}
