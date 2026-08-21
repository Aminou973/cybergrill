#!/usr/bin/env node
/* ==========================================================================
   Render every night in data/nights/ to a PNG in site/cards/.
   Uses headless Chromium + the exact same shared/card.js the dashboard uses,
   so the committed PNG is identical to the one the export button produces.

     node scripts/render-card.mjs            # all nights
     node scripts/render-card.mjs 2026-08-20 # one night
   ========================================================================== */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NIGHTS = join(ROOT, 'data', 'nights');
const OUT = join(ROOT, 'site', 'cards');

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  try { ({ chromium } = await import('playwright-core')); }
  catch {
    console.error('✗ playwright is not installed. Run: npm i -D playwright && npx playwright install --with-deps chromium');
    process.exit(1);
  }
}

const only = process.argv[2];
const files = readdirSync(NIGHTS).filter(f => f.endsWith('.json')).filter(f => !only || f === only + '.json').sort();
if (!files.length) { console.error('✗ no night files matched'); process.exit(1); }
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const cardJs = readFileSync(join(ROOT, 'shared', 'card.js'), 'utf8');
/* Prefer a plain launch (CI installs its own browser). Fall back to a
   pre-provisioned Chromium if this machine ships one at a fixed path. */
async function launch() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'
  ].filter(Boolean);
  try { return await chromium.launch(); }
  catch (err) {
    const { existsSync } = await import('node:fs');
    for (const exe of candidates) {
      if (existsSync(exe)) {
        console.log('· using local chromium at ' + exe);
        return await chromium.launch({ executablePath: exe });
      }
    }
    throw err;
  }
}
const browser = await launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><meta charset="utf-8"><body style="margin:0"><canvas id="c"></canvas>');
await page.addScriptTag({ content: cardJs });
await page.evaluate(() => document.fonts.ready);

for (const f of files) {
  const night = JSON.parse(readFileSync(join(NIGHTS, f), 'utf8'));
  const dataUrl = await page.evaluate((n) => {
    const cv = document.getElementById('c');
    globalThis.CyberCard.drawNightCard(cv, n);
    return cv.toDataURL('image/png');
  }, night);
  const png = Buffer.from(dataUrl.split(',')[1], 'base64');
  const name = `${night.date}.png`;
  writeFileSync(join(OUT, name), png);
  console.log(`✓ site/cards/${name}  (${(png.length / 1024).toFixed(0)} KB)`);
}

await browser.close();
