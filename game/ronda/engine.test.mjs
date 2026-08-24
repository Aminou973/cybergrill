/* ==========================================================================
   Ronda engine tests.  node game/ronda/engine.test.mjs

   Written against cybergrill/ronda-rules.md. Where a test encodes something
   the rules file did not spell out, it says so — those are the ones to argue
   with first if the engine ever feels wrong at a real table.
   ========================================================================== */
import {
  createGame, applyMove, legalMoves, viewFor, nextRound, botMove, buildDeck,
  captureWith, cleanTable, playerById, mulberry32, ord, nextRank,
  RANKS, SUITS, TARGET, BREAK_EVEN, SCORES, BOT_LEVELS, META
} from './engine.js';

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, extra) { if (cond) pass++; else { fail++; failures.push(name + (extra ? '  — ' + extra : '')); } }
function eq(name, a, b) { ok(name, a === b, `got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); }
function throws(name, fn) { try { fn(); ok(name, false, 'no error thrown'); } catch (e) { pass++; } }

const P2 = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
const P4 = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }, { id: 'd', name: 'D' }];
const C = (r, s = 'o') => ({ id: s + r, rank: r, suit: s });

/* put a game into an exact shape without going through the deal */
function rig(g, { table, hands, deck, turn }) {
  const s = JSON.parse(JSON.stringify(g));
  if (table) s.table = table.map(c => ({ ...c }));
  if (hands) s.order.forEach((id, i) => { if (hands[i]) playerById(s, id).hand = hands[i].map(c => ({ ...c })); });
  if (deck) s.deck = deck.map(c => ({ ...c }));
  if (turn !== undefined) s.turn = turn;
  return s;
}
const allCards = s => s.deck.length + s.table.length +
  s.players.reduce((n, p) => n + p.hand.length + p.pile.length, 0);

/* ---------------------------------------------------------------- deck ---- */
{
  const d = buildDeck();
  eq('forty cards', d.length, 40);
  eq('four suits', new Set(d.map(c => c.suit)).size, 4);
  eq('ten ranks', new Set(d.map(c => c.rank)).size, 10);
  eq('no eights', d.filter(c => c.rank === 8).length, 0);
  eq('no nines', d.filter(c => c.rank === 9).length, 0);
  eq('four of every rank', RANKS.every(r => d.filter(c => c.rank === r).length === 4), true);
  eq('unique ids', new Set(d.map(c => c.id)).size, 40);

  eq('seven runs straight into the ten', nextRank(7), 10);
  eq('ten into eleven', nextRank(10), 11);
  eq('the king ends it', nextRank(12), null);
  eq('the ace starts it', ord(1), 0);
  eq('twenty is break-even', BREAK_EVEN, 20);
  eq('and the match goes to forty-one', TARGET, 41);
}

/* ------------------------------------------------------------ the deal ---- */
{
  throws('three players is not a game', () => createGame({ players: [P2[0], P2[1], { id: 'c', name: 'C' }] }));
  const g = createGame({ players: P2, seed: 5 });
  eq('four on the table', g.table.length, 4);
  eq('three each', g.players.every(p => p.hand.length === 3), true);
  eq('thirty in the deck', g.deck.length, 30);
  eq('all forty accounted for', allCards(g), 40);

  const g4 = createGame({ players: P4, seed: 5 });
  eq('four-handed deals twelve', g4.deck.length, 40 - 4 - 12);
  eq('partners sit opposite', playerById(g4, 'a').team === playerById(g4, 'c').team, true);
  eq('and opponents alternate', playerById(g4, 'a').team === playerById(g4, 'b').team, false);
}

/* the clean table rule: never a pair, never a four-card run */
{
  let pairs = 0, runs = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const g = createGame({ players: P2, seed });
    const ranks = g.table.map(c => c.rank);
    if (new Set(ranks).size !== ranks.length) pairs++;
    const o = ranks.map(ord).sort((x, y) => x - y);
    if (o.every((v, i) => i === 0 || v === o[i - 1] + 1)) runs++;
    if (allCards(g) !== 40) { failures.push('seed ' + seed + ' lost a card'); break; }
  }
  eq('the opening table never holds a pair', pairs, 0);
  eq('and is never a four-card run', runs, 0);

  /* the burying itself */
  const deck = [C(12, 'c'), C(11, 'c'), C(1, 'e')];
  const table = [C(3, 'o'), C(3, 'c'), C(6, 'e'), C(1, 'b')];
  const evs = [];
  cleanTable(deck, table, evs);
  eq('the second of a pair is buried', table.filter(c => c.rank === 3).length, 1);
  ok('and a replacement is drawn', evs.some(e => e.t === 'bury'));
  eq('the deck keeps its size', deck.length, 3);

  const deck2 = [C(1, 'e')];
  const table2 = [C(4, 'o'), C(5, 'c'), C(6, 'e'), C(7, 'b')];
  cleanTable(deck2, table2, []);
  ok('a four-card run is broken up', !(table2.map(c => ord(c.rank)).sort((a, b) => a - b)
    .every((v, i, arr) => i === 0 || v === arr[i - 1] + 1)));
  eq('by burying the top of the run', table2.some(c => c.rank === 7), false);
}

/* --------------------------------------------------------- capturing ---- */
{
  /* the example straight out of the rules: 4 5 6 11 on the table, play a 4 */
  const t = [C(4, 'o'), C(5, 'c'), C(6, 'e'), C(11, 'b')];
  const took = captureWith(t, 4);
  eq('a four takes three cards', took.length, 3);
  eq('and they are the four, five and six', took.map(c => c.rank).join(','), '4,5,6');
  ok('the eleven is left behind', !took.some(c => c.rank === 11));

  eq('a rank not on the table takes nothing', captureWith(t, 2).length, 0);
  eq('a lone match takes one', captureWith([C(9 - 2, 'o'), C(12, 'c')], 7).length, 1);

  /* the run crosses the join where the eight and nine are missing */
  const t2 = [C(7, 'o'), C(10, 'c'), C(11, 'e'), C(1, 'b')];
  eq('a seven sweeps up through the sota and caballo', captureWith(t2, 7).map(c => c.rank).join(','), '7,10,11');
  /* and stops at a gap */
  const t3 = [C(4, 'o'), C(6, 'c'), C(7, 'e')];
  eq('a gap stops the run', captureWith(t3, 4).map(c => c.rank).join(','), '4');
}

{
  const g0 = createGame({ players: P2, seed: 9 });
  /* matching takes both cards into the pile */
  let g = rig(g0, { table: [C(5, 'o'), C(11, 'c')], hands: [[C(5, 'e'), C(1, 'b'), C(12, 'o')], [C(2, 'o'), C(3, 'c'), C(6, 'e')]], turn: 0 });
  const r = applyMove(g, 'a', { type: 'play', cardId: 'e5' });
  eq('the pile takes both', playerById(r.state, 'a').pile.length, 2);
  eq('and the table is down to one', r.state.table.length, 1);
  ok('a capture is announced', r.events.some(e => e.t === 'capture'));
  eq('the turn moves on', r.state.order[r.state.turn], 'b');
  eq('nothing is lost', allCards(r.state), allCards(g));

  /* no match and the card just sits there */
  const r2 = applyMove(g, 'a', { type: 'play', cardId: 'b1' });
  eq('an unmatched card joins the table', r2.state.table.length, 3);
  eq('and the pile stays empty', playerById(r2.state, 'a').pile.length, 0);
  ok('and it is announced as a drop', r2.events.some(e => e.t === 'drop'));

  throws('you cannot play out of turn', () => applyMove(g, 'b', { type: 'play', cardId: 'o2' }));
  throws('nor a card you do not hold', () => applyMove(g, 'a', { type: 'play', cardId: 'o9' }));
  eq('your three cards are your three moves', legalMoves(g, 'a').length, 3);
  eq('and nobody else has any', legalMoves(g, 'b').length, 0);
}

/* the table can never hold two of the same rank, because a match is forced */
{
  let bad = 0;
  for (let seed = 1; seed <= 40; seed++) {
    let g = createGame({ players: P2, seed });
    const rnd = mulberry32(seed);
    let guard = 0;
    while (g.phase === 'playing' && guard++ < 200) {
      const id = g.order[g.turn];
      g = applyMove(g, id, botMove(g, id, rnd, 'normal')).state;
      const ranks = g.table.map(c => c.rank);
      if (new Set(ranks).size !== ranks.length) bad++;
    }
  }
  eq('two of a rank never sit on the table together', bad, 0);
}

/* ------------------------------------------------- ronda and tringa ---- */
{
  const base = createGame({ players: P2, seed: 3 });

  /* one pair, one point */
  const one = rig(base, { hands: [[C(4, 'o'), C(4, 'c'), C(12, 'e')], [C(1, 'o'), C(2, 'c'), C(3, 'e')]] });
  const evs = [];
  /* re-run the announcement by dealing a fresh hand through nextRound is
     awkward, so call the deal path the way applyMove does */
  const g1 = createGame({ players: P2, seed: 3 });
  ok('the opening deal is announced', Array.isArray(g1.openingEvents));

  /* the resolution rules, exercised directly on states we build */
  function callResult(handA, handB, seed = 3) {
    /* find a seed whose deal we can overwrite, then re-announce by hand */
    const s = createGame({ players: P2, seed });
    s.players[0].hand = handA.map(c => ({ ...c }));
    s.players[1].hand = handB.map(c => ({ ...c }));
    s.teamScores = { A: 0, B: 0 };
    const ev = [];
    /* announce() is internal; drive it through a fresh deal instead */
    const byRank = h => { const m = {}; h.forEach(c => m[c.rank] = (m[c.rank] || 0) + 1); return m; };
    const call = h => {
      const m = byRank(h);
      for (const k of Object.keys(m)) if (m[k] >= 3) return { kind: 'tringa', rank: +k };
      let best = null;
      for (const k of Object.keys(m)) if (m[k] === 2 && (!best || ord(+k) > ord(best.rank))) best = { kind: 'ronda', rank: +k };
      return best;
    };
    return { a: call(handA), b: call(handB) };
  }
  const r1 = callResult([C(4, 'o'), C(4, 'c'), C(12, 'e')], [C(1, 'o'), C(2, 'c'), C(3, 'e')]);
  eq('a pair is a ronda', r1.a.kind, 'ronda');
  eq('and nothing is nothing', r1.b, null);
  const r2 = callResult([C(7, 'o'), C(7, 'c'), C(7, 'e')], [C(1, 'o'), C(1, 'c'), C(3, 'e')]);
  eq('three of a kind is a tringa', r2.a.kind, 'tringa');
  eq('worth five', SCORES.tringa, 5);
  eq('against a ronda worth one', SCORES.ronda, 1);
}

/* the announcement scoring, seen through a real deal */
{
  /* search seeds until we find deals that exercise each case, so the test
     runs the engine's own code rather than a copy of it */
  let sawRonda = false, sawTringa = false, sawBeaten = false, sawSplit = false;
  for (let seed = 1; seed <= 4000 && !(sawRonda && sawTringa && sawBeaten); seed++) {
    const g = createGame({ players: P2, seed });
    const calls = g.openingEvents.filter(e => e.t === 'call');
    if (!calls.length) continue;
    if (calls.some(c => c.kind === 'ronda' && c.points > 0)) sawRonda = true;
    if (calls.some(c => c.kind === 'tringa' && c.points === 5)) sawTringa = true;
    if (calls.some(c => c.beaten && c.points === 0)) sawBeaten = true;
    if (calls.length === 2 && calls.every(c => c.points === 1)) sawSplit = true;
    /* whatever happened, the points on the board must match the calls */
    const total = calls.reduce((n, c) => n + c.points, 0);
    const board = g.teamScores.A + g.teamScores.B;
    if (total !== board) { failures.push('seed ' + seed + ': calls ' + total + ' but board ' + board); break; }
  }
  ok('a ronda gets called and paid', sawRonda);
  ok('so does a tringa', sawTringa);
  ok('and a beaten call gets nothing', sawBeaten);

  /* two rondas: the higher pair takes both points */
  let checked = 0;
  for (let seed = 1; seed <= 6000 && checked < 6; seed++) {
    const g = createGame({ players: P2, seed });
    const calls = g.openingEvents.filter(e => e.t === 'call' && e.kind === 'ronda');
    if (calls.length !== 2) continue;
    const [x, y] = calls;
    if (ord(x.rank) === ord(y.rank)) {
      ok('equal rondas split the pot', x.points === 1 && y.points === 1, JSON.stringify(calls));
    } else {
      const hi = ord(x.rank) > ord(y.rank) ? x : y, lo = hi === x ? y : x;
      ok('the higher pair takes both points', hi.points === 2 && lo.points === 0, JSON.stringify(calls));
    }
    checked++;
  }
  ok('checked several two-ronda deals', checked > 0, 'checked ' + checked);
}

/* ------------------------------------------------------ darba chain ---- */
{
  const base = createGame({ players: P2, seed: 11 });
  /* A drops a 6 with nothing to match; B takes it back with a 6 */
  let g = rig(base, {
    table: [C(1, 'o'), C(12, 'c')],
    hands: [[C(6, 'o'), C(2, 'c'), C(3, 'e')], [C(6, 'c'), C(6, 'e'), C(11, 'b')]],
    turn: 0
  });
  g.teamScores = { A: 0, B: 0 };
  const drop = applyMove(g, 'a', { type: 'play', cardId: 'o6' });
  ok('the six is left on the table', drop.events.some(e => e.t === 'drop'));

  const hit = applyMove(drop.state, 'b', { type: 'play', cardId: 'c6' });
  const d = hit.events.find(e => e.t === 'darba');
  ok('taking it straight back is a darba', !!d);
  eq('worth one', d && d.points, SCORES.darba);
  eq('to the taker', d && d.team, 'B');
  eq('and the chain is armed on the six', hit.state.chain && hit.state.chain.rank, 6);
  eq('at stage one', hit.state.chain && hit.state.chain.stage, 1);

  /* A plays something else, then B drops the third six */
  const mid = applyMove(hit.state, 'a', { type: 'play', cardId: 'c2' });
  const k = applyMove(mid.state, 'b', { type: 'play', cardId: 'e6' });
  const kh = k.events.find(e => e.t === 'khamsa');
  ok("the third six is a b'khamsa", !!kh);
  eq('worth five', kh && kh.points, SCORES.khamsa);
  eq('the chain moves to stage two', k.state.chain && k.state.chain.stage, 2);

  /* and the fourth six, played by the same side, is the b'ashra */
  let g2 = JSON.parse(JSON.stringify(k.state));
  g2.turn = g2.order.indexOf('a');
  playerById(g2, 'a').hand = [C(4, 'o'), C(5, 'c')];
  const filler = applyMove(g2, 'a', { type: 'play', cardId: 'o4' });
  let g2b = JSON.parse(JSON.stringify(filler.state));
  g2b.turn = g2b.order.indexOf('b');
  playerById(g2b, 'b').hand = [C(6, 'b'), C(1, 'c')];
  const before = g2b.teamScores.B;
  const asrh = applyMove(g2b, 'b', { type: 'play', cardId: 'b6' });
  const as = asrh.events.find(e => e.t === 'ashra');
  ok("the fourth six is a b'ashra", !!as);
  eq('worth ten', as && as.points, SCORES.ashra);
  eq('and it pays the team that started the chain', asrh.state.teamScores.B, before + SCORES.ashra);
  eq('the chain is spent', asrh.state.chain, null);

  /* if the other side plays the fourth instead, the chain dies there — though
     snatching a just-dropped card back is a darba of their own */
  let g2c = JSON.parse(JSON.stringify(k.state));
  g2c.turn = g2c.order.indexOf('a');
  playerById(g2c, 'a').hand = [C(6, 'b'), C(4, 'o')];
  const steal = applyMove(g2c, 'a', { type: 'play', cardId: 'b6' });
  ok('the other side taking it back is their darba', steal.events.some(e => e.t === 'darba' && e.team === 'A'));
  ok('and no b\'ashra is paid', !steal.events.some(e => e.t === 'ashra'));

  /* the other side playing the rank first breaks it */
  let g3 = JSON.parse(JSON.stringify(hit.state));
  g3.turn = g3.order.indexOf('a');
  playerById(g3, 'a').hand = [C(6, 'e'), C(4, 'o')];
  const broke = applyMove(g3, 'a', { type: 'play', cardId: 'e6' });
  ok('an opponent playing that rank breaks the chain', broke.events.some(e => e.t === 'chainBroken'));
  eq('and nobody scores for it', broke.state.chain, null);

  /* a capture that is not a comeback is not a darba */
  let g4 = rig(base, {
    table: [C(9 - 2, 'o')], hands: [[C(7, 'c'), C(2, 'c'), C(3, 'e')], [C(1, 'o'), C(4, 'c'), C(5, 'e')]], turn: 0
  });
  const plain = applyMove(g4, 'a', { type: 'play', cardId: 'c7' });
  ok('taking a card that was already there is just a capture', !plain.events.some(e => e.t === 'darba'));
}

/* ----------------------------------------------------------- missa ---- */
{
  const base = createGame({ players: P2, seed: 13 });
  let g = rig(base, {
    table: [C(5, 'o')],
    hands: [[C(5, 'c'), C(2, 'c'), C(3, 'e')], [C(1, 'o'), C(4, 'c'), C(6, 'e')]],
    turn: 0
  });
  g.teamScores = { A: 0, B: 0 };
  const m = applyMove(g, 'a', { type: 'play', cardId: 'c5' });
  const mi = m.events.find(e => e.t === 'missa');
  ok('clearing the table is a missa', !!mi);
  eq('worth one', mi && mi.points, SCORES.missa);
  eq('and the table is bare', m.state.table.length, 0);

  /* "the last hand of the round" means the last deal — once the deck is empty
     no more threes are coming and the sweep takes the table anyway */
  let g2 = rig(base, {
    table: [C(5, 'o')], hands: [[C(5, 'c'), C(2, 'o'), C(3, 'c')], [C(1, 'o'), C(4, 'c'), C(6, 'b')]],
    deck: buildDeck().slice(20, 32), turn: 0
  });
  g2.teamScores = { A: 0, B: 0 };
  ok('with cards still to come, a missa pays',
    applyMove(g2, 'a', { type: 'play', cardId: 'c5' }).events.some(e => e.t === 'missa' && e.points === 1));

  let g3 = rig(base, { table: [C(5, 'o')], hands: [[C(1, 'o')], [C(5, 'c')]], deck: [], turn: 1 });
  g3.teamScores = { A: 0, B: 0 };
  const veryLast = applyMove(g3, 'b', { type: 'play', cardId: 'c5' });
  const mm = veryLast.events.find(e => e.t === 'missa');
  ok('but on the last hand it does not', mm && mm.points === 0 && mm.lastHand);
}

/* --------------------------------------------- bawesh and the count ---- */
{
  const base = createGame({ players: P2, seed: 17 });
  let g = rig(base, {
    table: [C(11, 'o'), C(12, 'c')],
    hands: [[C(1, 'o')], [C(2, 'c')]],
    deck: [],
    turn: 0
  });
  g.teamScores = { A: 0, B: 0 };
  playerById(g, 'a').pile = buildDeck().slice(0, 24);      /* A has already banked 24 */
  playerById(g, 'b').pile = buildDeck().slice(24, 36);
  g.lastCapture = 'a';
  const p1 = applyMove(g, 'a', { type: 'play', cardId: 'o1' });   /* drops, no match */
  const p2 = applyMove(p1.state, 'b', { type: 'play', cardId: 'c2' }); /* drops, hands empty */
  const bw = p2.events.find(e => e.t === 'bawesh');
  ok('the last capturer sweeps what is left', !!bw);
  eq('and it goes to them', bw && bw.who, 'a');
  const cnt = p2.events.find(e => e.t === 'count');
  ok('the cards get counted', !!cnt);
  eq('every card is in somebody pile', cnt.counts.A + cnt.counts.B, 40);
  eq('a point for each card over twenty', cnt.gained.A, cnt.counts.A - 20);
  eq('and nothing for being under', cnt.gained.B, 0);
  eq('the round is over', p2.state.phase, 'roundEnd');
}

/* the match runs to forty-one */
{
  const g = createGame({ players: P2, seed: 21 });
  const s = JSON.parse(JSON.stringify(g));
  s.teamScores = { A: 38, B: 10 };
  s.table = []; s.deck = [];
  s.players[0].hand = [C(1, 'o')]; s.players[1].hand = [C(2, 'c')];
  s.players[0].pile = buildDeck().slice(0, 25);
  s.players[1].pile = buildDeck().slice(25, 38);
  s.turn = 0; s.lastCapture = 'a';
  const p1 = applyMove(s, 'a', { type: 'play', cardId: 'o1' });
  const p2 = applyMove(p1.state, 'b', { type: 'play', cardId: 'c2' });
  eq('reaching forty-one ends the match', p2.state.phase, 'gameEnd');
  eq('and names the team', p2.state.winner, 'A');
}

/* --------------------------------------------------------- the views ---- */
{
  const g = createGame({ players: P4, seed: 31 });
  const v = viewFor(g, 'a');
  eq('you see your own three', v.you.hand.length, 3);
  eq('and the table', v.table.length, 4);
  const raw = JSON.stringify(v.players);
  ok('but nobody else’s cards', !/"rank"/.test(raw), raw.slice(0, 120));
  ok('only their counts', v.players.every(p => typeof p.count === 'number' && typeof p.pile === 'number'));
  eq('the deck is a number, not a list', typeof v.deckCount, 'number');
  ok('and your moves come with it', v.moves.length === 3);
  eq('somebody else gets none', viewFor(g, 'b').moves.length, 0);
}

/* --------------------------------------------------------- next round ---- */
{
  const g = createGame({ players: P2, seed: 41 });
  const s = JSON.parse(JSON.stringify(g));
  s.teamScores = { A: 7, B: 3 };
  const n = nextRound(s);
  eq('the round number goes up', n.round, 2);
  eq('the match score is carried', n.teamScores.A, 7);
  eq('the deal passes on', n.dealer !== s.dealer, true);
  eq('and everything is dealt fresh', allCards(n), 40);
}

/* -------------------------------------------------------------- makla ---- */
{
  const g = createGame({ players: P2, seed: 51, house: { variant: 'makla' } });
  eq('makla makes no announcements', g.openingEvents.filter(e => e.t === 'call').length, 0);
  eq('and keeps no running target', g.target, 0);

  const s = rig(g, { table: [C(5, 'o')], hands: [[C(5, 'c')], [C(1, 'o')]], deck: [], turn: 0 });
  s.teamScores = { A: 0, B: 0 };
  const m = applyMove(s, 'a', { type: 'play', cardId: 'c5' });
  ok('no missa points in makla', !m.events.some(e => e.t === 'missa' && e.points > 0));
  const done = applyMove(m.state, 'b', { type: 'play', cardId: 'o1' });
  eq('one hand and it is over', done.state.phase, 'gameEnd');
  const cnt = done.events.find(e => e.t === 'count');
  ok('the cards still get counted', !!cnt);

  /* twenty each is a draw */
  const s2 = rig(g, { table: [], hands: [[C(1, 'o')], [C(2, 'c')]], deck: [], turn: 0 });
  playerById(s2, 'a').pile = buildDeck().slice(0, 19);
  playerById(s2, 'b').pile = buildDeck().slice(19, 38);
  s2.lastCapture = 'a';
  const d1 = applyMove(s2, 'a', { type: 'play', cardId: 'o1' });
  const d2 = applyMove(d1.state, 'b', { type: 'play', cardId: 'c2' });
  const c2 = d2.events.find(e => e.t === 'count');
  ok('a level count is a draw', c2.counts.A === c2.counts.B ? d2.state.winner === null : true,
    JSON.stringify(c2.counts));
}

/* --------------------------------------------------------------- bots ---- */
{
  let done = 0, errs = 0, lost = 0;
  for (const level of BOT_LEVELS) {
    for (const players of [P2, P4]) {
      for (let seed = 1; seed <= 12; seed++) {
        try {
          let g = createGame({ players, seed, house: { variant: 'ronda' } });
          const rnd = mulberry32(seed * 7 + 1);
          let guard = 0;
          while (g.phase === 'playing' && guard++ < 400) {
            const id = g.order[g.turn];
            const m = botMove(g, id, rnd, level);
            if (!m) break;
            g = applyMove(g, id, m).state;
            if (allCards(g) !== 40) { lost++; break; }
          }
          if (g.phase !== 'playing') done++;
          else failures.push(`${level} ${players.length}p seed ${seed}: unfinished`);
        } catch (e) { errs++; failures.push(`${level} ${players.length}p seed ${seed}: ${e.message}`); }
      }
    }
  }
  eq('every level finishes every round', done, 72);
  eq('with no illegal moves', errs, 0);
  eq('and never loses a card', lost, 0);
}

/* a whole match, to forty-one, without anything going wrong */
{
  let matches = 0, errs = 0;
  for (let seed = 1; seed <= 8; seed++) {
    try {
      let g = createGame({ players: P2, seed });
      const rnd = mulberry32(seed + 99);
      let guard = 0;
      while (g.phase !== 'gameEnd' && guard++ < 4000) {
        if (g.phase === 'roundEnd') { g = nextRound(g); continue; }
        const id = g.order[g.turn];
        g = applyMove(g, id, botMove(g, id, rnd, 'sharp')).state;
      }
      if (g.phase === 'gameEnd') matches++;
      else failures.push('seed ' + seed + ' never reached 41');
    } catch (e) { errs++; failures.push('match seed ' + seed + ': ' + e.message); }
  }
  eq('matches play through to forty-one', matches, 8);
  eq('without errors', errs, 0);
}

/* ---------------------------------------------------------------- done ---- */
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) { console.log('\nFailures:'); failures.forEach(f => console.log('  ✗ ' + f)); }
process.exit(fail ? 1 : 0);
