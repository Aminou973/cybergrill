#!/usr/bin/env node
/* ==========================================================================
   Build everything the site needs from data/nights/*.json:

     site/index.html    the dashboard, fully self-contained (card.js inlined)
     site/bundle.json   every night + the all-time season table
     site/season.html   the season page
     README.md          the standings table between the two markers

   Nothing here talks to the network. Run it any time:

     node scripts/build.mjs           build
     node scripts/build.mjs --check   validate the night files and stop
   ========================================================================== */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/* Two worlds. 'friends' is the public board; 'family' is the same pipeline
   over its own folder, its own bundle and its own cards. The season page and
   the README table are built from friends only — they are the public face. */
const SCOPES = [
  { id: 'friends', dir: 'nights',        bundle: 'bundle.json',        cards: 'cards' },
  { id: 'family',  dir: 'nights-family', bundle: 'bundle-family.json', cards: 'cards-family' }
];
const NIGHTS = join(ROOT, 'data', 'nights');
const SITE = join(ROOT, 'site');
const CHECK_ONLY = process.argv.includes('--check');

/* ---------- config.yml: only the handful of flat keys we actually use ---------- */
function readConfig() {
  const cfg = { title: 'CyberGrill', subtitle: 'Game Night Arcade', site_url: '', points: [10, 6, 3, 1], tail: 1, draw: 5 };
  const f = join(ROOT, 'config.yml');
  if (!existsSync(f)) return cfg;
  for (const raw of readFileSync(f, 'utf8').split('\n')) {
    const line = raw.replace(/#.*$/, '').trimEnd();
    const m = /^([a-z_]+):\s*(.+)$/.exec(line);
    if (!m) continue;
    const k = m[1];
    let v = m[2].trim().replace(/^["']|["']$/g, '');
    if (k === 'points') { cfg.points = v.replace(/[[\]]/g, '').split(',').map(x => parseInt(x, 10)); continue; }
    if (k === 'tail' || k === 'draw') { cfg[k] = parseInt(v, 10); continue; }
    cfg[k] = v;
  }
  return cfg;
}
const CFG = readConfig();

const GAME_ICON = { uno: '🃏', domino: '🀄', fc25: '⚽', efoot: '🥅', topspin: '🎾' };
const GAME_NAME = { uno: 'UNO', domino: 'Dominos', fc25: 'FC 25', efoot: 'eFootball', topspin: 'TopSpin 2K' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function ptsFor(rank, draw) {
  if (draw) return CFG.draw;
  return rank < CFG.points.length ? CFG.points[rank] : CFG.tail;
}

/* ---------- load + validate ---------- */
function loadNights(scope) {
  const DIR = join(ROOT, 'data', scope.dir);
  if (!existsSync(DIR)) {
    if (scope.id === 'friends') { console.error(`✗ data/${scope.dir}/ does not exist`); process.exit(1); }
    return [];   /* family is optional until the first family night is played */
  }
  const files = readdirSync(DIR).filter(f => f.endsWith('.json')).sort();
  const nights = [];
  let problems = 0;

  for (const f of files) {
    let n;
    try { n = JSON.parse(readFileSync(join(DIR, f), 'utf8')); }
    catch (e) { console.error(`✗ ${f} is not valid JSON — ${e.message}`); problems++; continue; }

    if (!n.date) { console.error(`✗ ${f} has no "date"`); problems++; continue; }
    if (!Array.isArray(n.players) || !n.players.length) { console.error(`✗ ${f} has no players`); problems++; continue; }
    if (!Array.isArray(n.matches)) { console.error(`✗ ${f} has no matches array`); problems++; continue; }

    const known = new Set(n.players.map(p => p.id || p.name));
    const table = {};
    n.players.forEach(p => { table[p.id || p.name] = { pts: 0, played: 0, wins: 0 }; });

    n.matches.forEach((m, i) => {
      (m.ranking || []).forEach((id, r) => {
        if (!known.has(id)) { console.error(`✗ ${f} match ${i + 1} names "${id}", who is not in players[]`); problems++; return; }
        table[id].pts += ptsFor(r, m.draw);
        table[id].played++;
        if (r === 0 && !m.draw) table[id].wins++;
      });
    });

    /* if the file carries the numbers read off the dashboard, they must agree */
    if (Array.isArray(n.verifiedStandings)) {
      for (const v of n.verifiedStandings) {
        const c = table[v.id];
        if (!c) { console.error(`✗ ${f} verifiedStandings names unknown player "${v.id}"`); problems++; continue; }
        if (c.pts !== v.pts || c.played !== v.played || c.wins !== v.wins) {
          console.error(`✗ ${f} ${v.id}: matches give ${c.pts}pts/${c.played}p/${c.wins}w but verifiedStandings says ${v.pts}pts/${v.played}p/${v.wins}w`);
          problems++;
        }
      }
    }

    n._table = table;
    n._rows = Object.keys(table).map(id => ({
      id, name: (n.players.find(p => (p.id || p.name) === id) || {}).name || id,
      color: (n.players.find(p => (p.id || p.name) === id) || {}).color || '#22e6ff',
      ...table[id]
    })).sort((a, b) => b.pts - a.pts || b.wins - a.wins || a.played - b.played);
    nights.push(n);
    console.log(`✓ ${scope.id}/${f}  ${n._rows.length} players · ${n.matches.length} matches · winner ${n._rows[0] ? n._rows[0].name : '—'}`);
  }

  if (problems) { console.error(`\n✗ ${problems} problem${problems === 1 ? '' : 's'} — nothing was written.`); process.exit(1); }
  return nights;
}

/* ---------- season aggregate ---------- */
function buildSeason(nights) {
  const s = {};
  const touch = (id, name, color) => {
    if (!s[id]) s[id] = { id, name, color, pts: 0, played: 0, wins: 0, nights: 0, titles: 0, podiums: 0, byGame: {} };
    if (name) s[id].name = name;
    if (color) s[id].color = color;
    return s[id];
  };

  nights.forEach(n => {
    const nameOf = id => (n.players.find(p => (p.id || p.name) === id) || {}).name || id;
    const colorOf = id => (n.players.find(p => (p.id || p.name) === id) || {}).color;

    n._rows.forEach((r, i) => {
      const e = touch(r.id, r.name, r.color);
      e.pts += r.pts; e.played += r.played; e.wins += r.wins; e.nights++;
      if (i === 0 && r.pts > 0) e.titles++;
      if (i < 3 && r.pts > 0) e.podiums++;
    });

    n.matches.forEach(m => {
      const g = m.game || 'uno';
      (m.ranking || []).forEach((id, r) => {
        const e = touch(id, nameOf(id), colorOf(id));
        if (!e.byGame[g]) e.byGame[g] = { pts: 0, played: 0, wins: 0 };
        e.byGame[g].pts += ptsFor(r, m.draw);
        e.byGame[g].played++;
        if (r === 0 && !m.draw) e.byGame[g].wins++;
      });
    });
  });

  return Object.values(s).sort((a, b) => b.pts - a.pts || b.titles - a.titles || b.wins - a.wins);
}

/* ---------- site/index.html — inline shared/card.js so one file is enough ---------- */
function buildDashboard() {
  const src = join(ROOT, 'index.html');
  if (!existsSync(src)) { console.log('· no index.html at the root, skipping the dashboard'); return; }
  let html = readFileSync(src, 'utf8');
  const assets = ['i18n.js', 'i18n-prose.js', 'card.js']
    .map(f => '<script>\n' + readFileSync(join(ROOT, 'shared', f), 'utf8') + '\n</script>')
    .join('\n');
  const re = /<!-- ASSETS:BEGIN -->[\s\S]*?<!-- ASSETS:END -->/;
  if (re.test(html)) html = html.replace(re, assets);
  else console.log('· ASSETS markers missing — the dashboard will need shared/*.js beside it');

  /* bake the public config in: which repo the publish button writes to, and
     the admin passcode hash (empty = no lock, everyone can edit) */
  const pub = {
    title: CFG.title,
    repo: { owner: CFG.repo_owner || '', name: CFG.repo_name || '', branch: CFG.repo_branch || 'main' },
    admin: (CFG.admin_hash && CFG.admin_salt)
      ? { salt: CFG.admin_salt, hash: CFG.admin_hash, iter: 150000 }
      : {},
    unoTarget: parseInt(CFG.uno_target, 10) || 500
  };
  const cfgRe = /<!-- CONFIG:BEGIN -->[\s\S]*?<!-- CONFIG:END -->/;
  const cfgTag = '<script>window.CYBER_CFG=' + JSON.stringify(pub) + ';</script>';
  if (cfgRe.test(html)) html = html.replace(cfgRe, cfgTag);
  console.log(`· config: repo ${pub.repo.owner || '?'}/${pub.repo.name || '?'} · admin lock ${pub.admin.hash ? 'ON' : 'off'}`);
  writeFileSync(join(SITE, 'index.html'), html);
  console.log(`✓ site/index.html  (${(html.length / 1024).toFixed(0)} KB, self-contained)`);
}

/* ---------- the table pages ----------
   Each game is one self-contained file: its rules engine and the shared party
   code (sound, confetti, music) are inlined at build time, so a table works
   from GitHub Pages and from a file:// double-click alike — an external module
   src would be CORS-blocked from disk. */
const TABLES = [
  { id: 'uno',  page: ['game', 'index.html'],         engine: ['game', 'engine.js'],         out: ['game'] },
  { id: 'ludo', page: ['game', 'ludo', 'index.html'], engine: ['game', 'ludo', 'engine.js'], out: ['game', 'ludo'] }
];

function buildTables() {
  for (const t of TABLES) buildTable(t);
  copyAudio();
}

function buildTable(t) {
  const src = join(ROOT, ...t.page);
  const eng = join(ROOT, ...t.engine);
  if (!existsSync(src) || !existsSync(eng)) { console.log(`· no ${t.id} table, skipping`); return; }
  let html = readFileSync(src, 'utf8');
  const engine = readFileSync(eng, 'utf8');
  const re = /\/\* ENGINE:BEGIN \*\/[\s\S]*?\/\* ENGINE:END \*\//;
  if (re.test(html)) html = html.replace(re, `/* ---- ${t.id} engine, inlined at build time ---- */\n` + engine);
  else console.log(`· ENGINE markers missing in the ${t.id} table`);

  /* the shared table furniture: colours, the setup panel, chrome, overlays */
  const tcss = join(ROOT, 'shared', 'table.css');
  const tre = /\/\* TABLECSS:BEGIN \*\/[\s\S]*?\/\* TABLECSS:END \*\//;
  if (tre.test(html)) {
    if (!existsSync(tcss)) console.log('· shared/table.css is missing — tables will look bare');
    else html = html.replace(tre, readFileSync(tcss, 'utf8'));
  }

  /* the shared party code: sound, confetti, the music bed */
  const party = join(ROOT, 'shared', 'party.js');
  const pre = /\/\* PARTY:BEGIN \*\/[\s\S]*?\/\* PARTY:END \*\//;
  if (pre.test(html)) {
    if (!existsSync(party)) { console.log('· shared/party.js is missing — tables will be silent'); }
    else html = html.replace(pre, readFileSync(party, 'utf8'));
  }

  /* the multiplayer server address, so the table knows where to knock */
  const server = String(CFG.uno_server || '').trim().replace(/\/+$/, '');
  const cre = /\/\* GAMECFG:BEGIN \*\/[\s\S]*?\/\* GAMECFG:END \*\//;
  if (cre.test(html)) html = html.replace(cre,
    '/* GAMECFG — written by scripts/build.mjs from config.yml */\n' +
    'window.CG_SERVER = ' + JSON.stringify(server) + ';');

  const out = join(SITE, ...t.out);
  if (!existsSync(out)) mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'index.html'), html);
  console.log(`✓ site/${t.out.join('/')}/index.html  (${(html.length / 1024).toFixed(0)} KB, self-contained)`);
}

/* ---------- site/audio — real recordings, if any were dropped in ----------
   These are the one thing not inlined: audio does not belong in a base64
   string, and a missing file just means the generated sound is used. */
function copyAudio() {
  const from = join(ROOT, 'audio');
  const to = join(SITE, 'audio');
  const files = existsSync(from) ? readdirSync(from).filter(f => /\.(mp3|ogg|wav)$/i.test(f)) : [];
  if (!existsSync(to)) mkdirSync(to, { recursive: true });
  let bytes = 0;
  for (const f of files) {
    copyFileSync(join(from, f), join(to, f));
    bytes += readFileSync(join(from, f)).length;
  }
  /* Always write the list, even when it is empty. The tables read this first
     and then ask only for files that exist, so a project with no recordings
     produces no 404s in anybody's console. */
  writeFileSync(join(to, 'manifest.json'), JSON.stringify(files));
  console.log(files.length
    ? `✓ site/audio/  (${files.length} recordings, ${(bytes / 1024).toFixed(0)} KB)`
    : '· audio/: no recordings, using the generated sounds');
}

/* ---------- site/season.html ---------- */
function buildSeasonPage(nights, season) {
  const totalMatches = nights.reduce((a, n) => a + n.matches.length, 0);
  const games = [...new Set(nights.flatMap(n => n.matches.map(m => m.game || 'uno')))];
  const maxPts = Math.max(1, ...season.map(r => r.pts));

  const rows = season.map((r, i) => `
      <tr>
        <td class="rk">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
        <td class="pl"><span class="av" style="background:${esc(r.color)}">${esc(r.name.slice(0, 2).toUpperCase())}</span>${esc(r.name)}</td>
        <td>${r.nights}</td><td>${r.played}</td><td>${r.wins}</td>
        <td>${r.titles ? '👑 ' + r.titles : '—'}</td>
        <td class="pt"><span class="bar" style="width:${(r.pts / maxPts * 100).toFixed(1)}%;background:${esc(r.color)}"></span>${r.pts}</td>
      </tr>`).join('');

  const cards = nights.slice().reverse().map(n => `
      <article class="night">
        <header><h3>${esc(n.title || 'Game Night')}</h3><time>${esc(n.date)}</time></header>
        <p class="win">🏆 ${esc(n._rows[0] ? n._rows[0].name : '—')} <span>${n._rows[0] ? n._rows[0].pts : 0} pts</span></p>
        <p class="meta">${n.matches.length} matches · ${n._rows.length} players · ${(n.games || ['uno']).map(g => GAME_ICON[g] || '🎮').join(' ')}</p>
        <a href="cards/${esc(n.date)}.png" target="_blank" rel="noopener"><img src="cards/${esc(n.date)}.png" alt="${esc(n.date)} recap" loading="lazy"></a>
      </article>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(CFG.title)} — Season</title>
<style>
:root{--bg:#05060f;--panel:rgba(16,20,44,.72);--line:rgba(120,140,255,.18);--txt:#e8ecff;--dim:#8b93c4;--cyan:#22e6ff;--pink:#ff2fb9;--gold:#ffc93c;--violet:#a55bff}
*{box-sizing:border-box;margin:0;padding:0}
body{background:radial-gradient(1200px 700px at 12% -10%,rgba(34,230,255,.16),transparent 60%),radial-gradient(1000px 700px at 92% 8%,rgba(255,47,185,.14),transparent 60%),var(--bg);
 color:var(--txt);font-family:'Segoe UI',system-ui,-apple-system,Roboto,sans-serif;min-height:100vh;padding:26px 18px 60px}
.wrap{max-width:1060px;margin:0 auto}
h1{font-size:clamp(30px,7vw,58px);font-weight:900;letter-spacing:3px;line-height:1;
 background:linear-gradient(90deg,var(--cyan),var(--pink) 55%,var(--violet));-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{font-size:11px;letter-spacing:5px;color:var(--dim);font-weight:800;margin:8px 0 22px}
.nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px}
.nav a{padding:9px 15px;border-radius:11px;border:1px solid var(--line);background:var(--panel);color:var(--dim);
 text-decoration:none;font-size:11px;font-weight:800;letter-spacing:1.5px;transition:.15s}
.nav a:hover{color:#fff;border-color:var(--cyan);box-shadow:0 0 18px -6px var(--cyan)}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:9px;margin-bottom:22px}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:13px;text-align:center}
.stat b{display:block;font-size:26px;font-weight:900;color:var(--cyan)}
.stat span{font-size:9px;letter-spacing:1.6px;color:var(--dim);font-weight:800}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:22px;overflow-x:auto}
h2{font-size:11px;letter-spacing:3px;color:var(--dim);font-weight:800;margin-bottom:14px}
table{width:100%;border-collapse:collapse;font-size:13px;min-width:520px}
th{font-size:9px;letter-spacing:1.4px;color:var(--dim);font-weight:800;text-align:center;padding:7px 5px;border-bottom:1px solid var(--line)}
th:nth-child(2){text-align:left}
td{padding:10px 5px;text-align:center;font-weight:800;border-bottom:1px solid rgba(255,255,255,.05);font-variant-numeric:tabular-nums}
td.rk{width:44px;font-size:17px}
td.pl{text-align:left;display:flex;align-items:center;gap:9px;font-size:15px}
td.pl .av{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-size:11px;font-weight:900;color:#04060f;flex:0 0 auto}
td.pt{position:relative;font-size:19px;color:var(--gold);min-width:96px}
td.pt .bar{position:absolute;left:0;top:6px;bottom:6px;opacity:.17;border-radius:5px}
.nights{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.night{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:14px;transition:.18s}
.night:hover{transform:translateY(-3px);border-color:rgba(34,230,255,.45)}
.night header{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:7px}
.night h3{font-size:15px;font-weight:900;letter-spacing:.5px}
.night time{font-size:11px;color:var(--dim);font-weight:800}
.night .win{font-size:16px;font-weight:900;color:var(--gold);margin-bottom:4px}
.night .win span{font-size:12px;color:var(--dim)}
.night .meta{font-size:11px;color:var(--dim);font-weight:700;margin-bottom:11px}
.night img{width:100%;border-radius:11px;display:block;border:1px solid rgba(255,255,255,.08)}
footer{text-align:center;font-size:10px;letter-spacing:2px;color:var(--dim);font-weight:800;margin-top:34px}
</style></head><body><div class="wrap">
<h1>${esc(CFG.title)}</h1>
<p class="sub">S E A S O N &nbsp; A R C H I V E</p>
<nav class="nav"><a href="index.html">🎮 OPEN THE DASHBOARD</a><a href="bundle.json">📦 BUNDLE.JSON</a></nav>
<div class="stats">
  <div class="stat"><b>${nights.length}</b><span>NIGHTS</span></div>
  <div class="stat"><b>${totalMatches}</b><span>MATCHES</span></div>
  <div class="stat"><b>${season.length}</b><span>PLAYERS</span></div>
  <div class="stat"><b>${esc(season[0] ? season[0].name : '—')}</b><span>ALL-TIME LEADER</span></div>
</div>
<section class="panel"><h2>ALL-TIME TABLE</h2>
<table><tr><th></th><th>PLAYER</th><th>NIGHTS</th><th>MATCHES</th><th>WINS</th><th>TITLES</th><th>POINTS</th></tr>${rows}</table>
<p style="margin-top:12px;font-size:10px;letter-spacing:1.2px;color:var(--dim);font-weight:700">
GAMES PLAYED: ${games.map(g => (GAME_ICON[g] || '🎮') + ' ' + (GAME_NAME[g] || g)).join(' &nbsp;·&nbsp; ')}</p>
</section>
<h2 style="margin-bottom:12px">EVERY NIGHT</h2>
<div class="nights">${cards}</div>
<footer>BUILT BY GITHUB ACTIONS · ${esc(CFG.title.toLowerCase())}</footer>
</div></body></html>`;

  writeFileSync(join(SITE, 'season.html'), html);
  console.log(`✓ site/season.html  (${nights.length} nights)`);
}

/* ---------- README table between the markers ---------- */
function updateReadme(nights, season) {
  const f = join(ROOT, 'README.md');
  if (!existsSync(f)) return;
  const md = readFileSync(f, 'utf8');
  const A = '<!-- STANDINGS:BEGIN -->', B = '<!-- STANDINGS:END -->';
  if (!md.includes(A) || !md.includes(B)) { console.log('· README has no STANDINGS markers, leaving it alone'); return; }

  const last = nights[nights.length - 1];
  const rows = season.map((r, i) => {
    const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1);
    return `| ${medal} | **${r.name}** | ${r.pts} | ${r.nights} | ${r.played} | ${r.wins} | ${r.titles || '—'} |`;
  }).join('\n');

  const block = [
    A,
    '',
    `**${nights.length} night${nights.length === 1 ? '' : 's'} · ${nights.reduce((a, n) => a + n.matches.length, 0)} matches**` +
    (last ? ` · last played **${last.date}**, won by **${last._rows[0] ? last._rows[0].name : '—'}**` : ''),
    '',
    '| # | Player | Points | Nights | Matches | Wins | Night titles |',
    '|---|---|---:|---:|---:|---:|---:|',
    rows,
    '',
    last ? `![${last.date}](site/cards/${last.date}.png)` : '',
    '',
    B
  ].join('\n');

  const out = md.replace(new RegExp(A.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + B.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), block);
  if (out !== md) { writeFileSync(f, out); console.log('✓ README.md standings table'); }
  else console.log('· README already current');
}

/* ---------- go ---------- */
const loaded = SCOPES.map(sc => ({ scope: sc, nights: loadNights(sc) }));
const total = loaded.reduce((a, x) => a + x.nights.length, 0);
if (CHECK_ONLY) { console.log(`\n✓ ${total} night file${total === 1 ? '' : 's'} valid across ${loaded.filter(x => x.nights.length).length} board(s).`); process.exit(0); }

if (!existsSync(SITE)) mkdirSync(SITE, { recursive: true });

for (const { scope, nights } of loaded) {
  if (!existsSync(join(SITE, scope.cards))) mkdirSync(join(SITE, scope.cards), { recursive: true });
  const season = buildSeason(nights);

  writeFileSync(join(SITE, scope.bundle), JSON.stringify({
    generated: new Date().toISOString(),
    title: CFG.title,
    scope: scope.id,
    scoring: { points: CFG.points, tail: CFG.tail, draw: CFG.draw },
    season,
    nights: nights.map(n => ({
      date: n.date, title: n.title || '', games: n.games || [],
      startedAt: n.startedAt || '', endedAt: n.endedAt || '',
      matches: n.matches.length,
      standings: n._rows,
      card: `${scope.cards}/${n.date}.png`,
      uno: n.uno || null, cup: n.cup || null
    }))
  }, null, 2));
  console.log(`✓ site/${scope.bundle}  (${nights.length} nights, ${season.length} players)`);

  /* the public face is the friends board only */
  if (scope.id === 'friends') {
    buildSeasonPage(nights, season);
    updateReadme(nights, season);
    console.log(`  all-time leader: ${season[0] ? season[0].name + ' on ' + season[0].pts + ' points' : 'nobody yet'}`);
  }
}

buildDashboard();
buildTables();
console.log('\n✓ done');
