#!/usr/bin/env node
/* ==========================================================================
   File tonight's export into the repo and push it.

     npm run night                    newest YYYY-MM-DD.json from Downloads
     npm run night -- path\to\file.json

   Copies it into data/nights/, revalidates, commits, pushes. The publish
   Action takes it from there.
   ========================================================================== */
import { readdirSync, statSync, copyFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NIGHTS = join(ROOT, 'data', 'nights');
const NIGHT_RE = /^\d{4}-\d{2}-\d{2}\.json$/;

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: opts.quiet ? 'pipe' : 'inherit' });
}

let src = process.argv[2];

if (!src) {
  const dirs = [join(homedir(), 'Downloads'), join(homedir(), 'Desktop'), process.cwd()];
  const found = [];
  for (const d of dirs) {
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) {
      if (!NIGHT_RE.test(f)) continue;
      const p = join(d, f);
      try { found.push({ p, f, m: statSync(p).mtimeMs }); } catch {}
    }
  }
  if (!found.length) {
    console.error('✗ no YYYY-MM-DD.json found in Downloads, Desktop or here.');
    console.error('  Press S on the dashboard, hit "Download night JSON", then run this again.');
    process.exit(1);
  }
  found.sort((a, b) => b.m - a.m);
  src = found[0].p;
  console.log(`· picked the newest: ${src}`);
}

if (!existsSync(src)) { console.error(`✗ ${src} does not exist`); process.exit(1); }

let night;
try { night = JSON.parse(readFileSync(src, 'utf8')); }
catch (e) { console.error(`✗ ${src} is not valid JSON — ${e.message}`); process.exit(1); }
if (!night.date) { console.error('✗ that file has no "date" field — is it a night export?'); process.exit(1); }

const dest = join(NIGHTS, `${night.date}.json`);
const existed = existsSync(dest);
copyFileSync(src, dest);
console.log(`${existed ? '· replaced' : '✓ added'} data/nights/${night.date}.json`);

console.log('· validating…');
try { run(process.execPath, [join(ROOT, 'scripts', 'build.mjs'), '--check'], { quiet: true }); }
catch (e) {
  console.error('✗ the night file did not validate — nothing was committed.');
  console.error(String(e.stdout || '') + String(e.stderr || ''));
  process.exit(1);
}
console.log('✓ valid');

try {
  run('git', ['add', 'data/nights'], { quiet: true });
  const staged = run('git', ['diff', '--staged', '--name-only'], { quiet: true }).trim();
  if (!staged) { console.log('· nothing changed, already up to date'); process.exit(0); }
  run('git', ['commit', '-m', `night: ${night.date}`], { quiet: true });
  console.log('· pushing…');
  run('git', ['push']);
  console.log(`\n✓ pushed. Watch it build:  gh run watch`);
} catch (e) {
  console.error('✗ git failed — commit and push by hand:');
  console.error('    git add data/nights && git commit -m "night" && git push');
  process.exit(1);
}
