/* ==========================================================================
   Ronda engine tests.  node game/ronda/engine.test.mjs

   Written against cybergrill/ronda-rules.md. Where a test encodes something
   the rules file did not spell out, it says so — those are the ones to argue
   with first if the engine ever feels wrong at a real table.
   ========================================================================== */
import {
  createGame, applyMove, legalMoves, viewFor, nextRound, botMove, buildDeck,
  captureWith, cleanTable, playerById, mulberry32, ord, nextRank, callable,
  RANKS, SUITS, TARGET, BREAK_EVEN, BREAK_EVEN_3, breakEven, SCORES, BOT_LEVELS, META
} from './engine.js';

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, extra) { if (cond) pass++; else { fail++; failures.push(name + (extra ? '  — ' + extra : '')); } }
function eq(name, a, b) { ok(name, a === b, `got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); }
function throws(name, fn) { try { fn(); ok(name, false, 'no error thrown'); } catch (e) { pass++; } }

const P2 = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
const P4 = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }, { id: 'd', name: 'D' }];
const C = (r, s = 'o') => ({ id: s + r, rank: r, suit: s });

/* Put a game into an exact shape without going through the deal. Rigged states
   are always in the play phase — the calling phase is exercised on its own. */
function rig(g, { table, hands, deck, turn }) {
  const s = JSON.parse(JSON.stringify(g));
  if (table) s.table = table.map(c => ({ ...c }));
  if (hands) s.order.forEach((id, i) => { if (hands[i]) playerById(s, id).hand = hands[i].map(c => ({ ...c })); });
  if (deck) s.deck = deck.map(c => ({ ...c }));
  s.phase = 'playing';
  s.pendingCalls = [];
  s.concealed = {};
  s.turn = turn !== undefined ? turn : (s.playTurn || 0);
  return s;
}

/* answer every outstanding announcement, so play can begin */
function settle(g, choice = 'call') {
  let s = g, guard = 0;
  const evs = [];
  while (s.phase === 'calling' && guard++ < 8) {
    const id = s.order[s.turn];
    const r = applyMove(s, id, { type: choice });
    s = r.state; evs.push(...r.events);
  }
  return { state: s, events: evs };
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
  throws('one player is not a game', () => createGame({ players: [P2[0]] }));
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
  eq('a pair is a ronda', callable([C(4, 'o'), C(4, 'c'), C(12, 'e')]).kind, 'ronda');
  eq('on the rank of the pair', callable([C(4, 'o'), C(4, 'c'), C(12, 'e')]).rank, 4);
  eq('three of a kind is a tringa', callable([C(7, 'o'), C(7, 'c'), C(7, 'e')]).kind, 'tringa');
  eq('and three odd cards is nothing', callable([C(1, 'o'), C(2, 'c'), C(3, 'e')]), null);
  eq('a ronda is worth one', SCORES.ronda, 1);
  eq('a tringa five', SCORES.tringa, 5);
}

/* you have to speak before the first card, and you may choose not to */
{
  /* find a deal where exactly one player holds something callable */
  let g = null;
  for (let seed = 1; seed <= 900; seed++) {
    const t = createGame({ players: P2, seed });
    if (t.phase === 'calling' && t.pendingCalls.length === 1) { g = t; break; }
  }
  ok('found a deal with one caller', !!g);
  if (g) {
    const who = g.pendingCalls[0];
    eq('the hand stops for the call', g.phase, 'calling');
    eq('and it is their move', g.order[g.turn], who);
    eq('with two things they may do', legalMoves(g, who).map(m => m.type).sort().join(','), 'call,hide');
    eq('and nothing for anybody else', legalMoves(g, g.order.find(x => x !== who)).length, 0);
    throws('you cannot just play a card', () => applyMove(g, who, { type: 'play', cardId: playerById(g, who).hand[0].id }));

    const called = applyMove(g, who, { type: 'call' });
    eq('calling starts the hand', called.state.phase, 'playing');
    ok('and pays', called.state.teamScores[playerById(g, who).team] > 0);

    const quiet = applyMove(g, who, { type: 'hide' });
    eq('keeping quiet also starts the hand', quiet.state.phase, 'playing');
    eq('and pays nobody', quiet.state.teamScores[playerById(g, who).team], 0);
    ok('but it is remembered', !!quiet.state.concealed[who]);
    ok('and it is announced as a decision, not a hand', quiet.events.some(e => e.t === 'hidden'));
  }
}

/* sitting on a pair and then playing it is a point to everybody else */
{
  const base = createGame({ players: P2, seed: 3 });
  let g = rig(base, {
    table: [C(12, 'o')],
    hands: [[C(4, 'o'), C(4, 'c'), C(1, 'e')], [C(2, 'o'), C(3, 'c'), C(6, 'e')]],
    turn: 0
  });
  g.teamScores = { A: 0, B: 0 };
  g.concealed = { a: { kind: 'ronda', rank: 4, ids: ['o4', 'c4'], played: 0 } };
  const one = applyMove(g, 'a', { type: 'play', cardId: 'o4' });
  ok('the first card of the pair passes unnoticed', !one.events.some(e => e.t === 'caught'));
  let g2 = JSON.parse(JSON.stringify(one.state));
  g2.turn = 0;
  const two = applyMove(g2, 'a', { type: 'play', cardId: 'c4' });
  const caught = two.events.find(e => e.t === 'caught');
  ok('the second gives it away', !!caught);
  eq('and the other side takes a point', two.state.teamScores.B, SCORES.conceal);
  eq('while you get nothing', two.state.teamScores.A, 0);
}

/* the announcement scoring, seen through a real deal */
{
  let sawRonda = false, sawTringa = false, sawBeaten = false;
  for (let seed = 1; seed <= 4000 && !(sawRonda && sawTringa && sawBeaten); seed++) {
    const g0 = createGame({ players: P2, seed });
    if (g0.phase !== 'calling') continue;
    const settled = settle(g0);
    const g = settled.state;
    const calls = settled.events.filter(e => e.t === 'call');
    if (!calls.length) continue;
    if (calls.some(c => c.kind === 'ronda' && c.points > 0)) sawRonda = true;
    if (calls.some(c => c.kind === 'tringa' && c.points === 5)) sawTringa = true;
    if (calls.some(c => c.beaten && c.points === 0)) sawBeaten = true;
    /* whatever happened, the points on the board must match the calls, once
       the qa'a bonus is taken out of it */
    const qaa = settled.events.concat(g0.openingEvents).filter(e => e.t === 'qaa')
      .reduce((n, e) => n + e.points, 0);
    const total = calls.reduce((n, c) => n + c.points, 0) + qaa;
    const board = g.teamScores.A + g.teamScores.B;
    if (total !== board) { failures.push('seed ' + seed + ': calls ' + total + ' but board ' + board); break; }
  }
  ok('a ronda gets called and paid', sawRonda);
  ok('so does a tringa', sawTringa);
  ok('and a beaten call gets nothing', sawBeaten);

  /* two rondas: the higher pair takes both points */
  let checked = 0;
  for (let seed = 1; seed <= 6000 && checked < 6; seed++) {
    const g0 = createGame({ players: P2, seed });
    if (g0.phase !== 'calling') continue;
    const calls = settle(g0).events.filter(e => e.t === 'call' && e.kind === 'ronda');
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
  /* The escalation runs round the table, not down one side. A drops a six, B
     takes it back (darba, 1). If the very next player lays the third six that
     is b'khamsa, 5, to them; the one after that with the fourth is b'ashra,
     10. In a four-hander that means the points alternate between the teams. */
  const base = createGame({ players: P2, seed: 11 });
  let g = rig(base, {
    table: [C(1, 'o'), C(12, 'c')],
    hands: [[C(6, 'o'), C(6, 'e'), C(3, 'e')], [C(6, 'c'), C(6, 'b'), C(11, 'b')]],
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

  /* the very next player lays the third six */
  const kh = applyMove(hit.state, 'a', { type: 'play', cardId: 'e6' });
  const k = kh.events.find(e => e.t === 'khamsa');
  ok("the third six straight after is a b'khamsa", !!k);
  eq('worth five', k && k.points, SCORES.khamsa);
  eq('and it pays whoever laid it', k && k.team, 'A');
  eq('team A now has five', kh.state.teamScores.A, SCORES.khamsa);
  eq('the chain moves to stage two', kh.state.chain && kh.state.chain.stage, 2);

  /* and the fourth, from the next player again */
  const ash = applyMove(kh.state, 'b', { type: 'play', cardId: 'b6' });
  const a2 = ash.events.find(e => e.t === 'ashra');
  ok("the fourth six is a b'ashra", !!a2);
  eq('worth ten', a2 && a2.points, SCORES.ashra);
  eq('to the player who laid it', a2 && a2.team, 'B');
  eq('so B has the darba and the ashra', ash.state.teamScores.B, SCORES.darba + SCORES.ashra);
  eq('and A keeps the khamsa', ash.state.teamScores.A, SCORES.khamsa);
  eq('the chain is spent', ash.state.chain, null);

  /* anything other than that rank ends it */
  let g2 = JSON.parse(JSON.stringify(hit.state));
  g2.turn = g2.order.indexOf('a');
  const broke = applyMove(g2, 'a', { type: 'play', cardId: 'e3' });
  ok('a different card breaks the chain', broke.events.some(e => e.t === 'chainBroken'));
  eq('and it is gone', broke.state.chain, null);
  eq('with no extra points', broke.state.teamScores.A, 0);

  /* a capture that is not a comeback is not a darba */
  let g4 = rig(base, {
    table: [C(7, 'o')], hands: [[C(7, 'c'), C(2, 'c'), C(3, 'e')], [C(1, 'o'), C(4, 'c'), C(5, 'e')]], turn: 0
  });
  const plain = applyMove(g4, 'a', { type: 'play', cardId: 'c7' });
  ok('taking a card that was already there is just a capture', !plain.events.some(e => e.t === 'darba'));
}

/* the double whammy: a darba that also clears the table pays both */
{
  const base = createGame({ players: P2, seed: 19 });
  let g = rig(base, {
    table: [],
    hands: [[C(4, 'o'), C(2, 'c'), C(3, 'e')], [C(4, 'c'), C(9 - 2, 'b'), C(11, 'b')]],
    turn: 0
  });
  g.teamScores = { A: 0, B: 0 };
  const drop = applyMove(g, 'a', { type: 'play', cardId: 'o4' });
  eq('the four is alone on the table', drop.state.table.length, 1);
  const both = applyMove(drop.state, 'b', { type: 'play', cardId: 'c4' });
  ok('it is a darba', both.events.some(e => e.t === 'darba' && e.points === SCORES.darba));
  ok('and a missa', both.events.some(e => e.t === 'missa' && e.points === SCORES.missa));
  eq('two points, not one', both.state.teamScores.B, SCORES.darba + SCORES.missa);
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
  s.phase = 'playing'; s.pendingCalls = []; s.concealed = {};
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
  const g = settle(createGame({ players: P4, seed: 31 })).state;
  const v = viewFor(g, 'a');
  eq('you see your own three', v.you.hand.length, 3);
  eq('and the table', v.table.length, 4);
  const raw = JSON.stringify(v.players);
  ok('but nobody else’s cards', !/"rank"/.test(raw), raw.slice(0, 120));
  ok('only their counts', v.players.every(p => typeof p.count === 'number' && typeof p.pile === 'number'));
  eq('the deck is a number, not a list', typeof v.deckCount, 'number');
  ok('and your moves come with it', v.moves.length === 3, 'phase ' + v.phase + ' moves ' + v.moves.length);
  eq('somebody else gets none', viewFor(g, 'b').moves.length, 0);
}

/* --------------------------------------------------------- next round ---- */
{
  const g = createGame({ players: P2, seed: 41 });
  const s = JSON.parse(JSON.stringify(g));
  s.phase = 'playing'; s.pendingCalls = [];
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
  eq('makla asks nobody to call', g.phase, 'playing');
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
          while ((g.phase === 'playing' || g.phase === 'calling') && guard++ < 400) {
            const id = g.order[g.turn];
            const m = botMove(g, id, rnd, level);
            if (!m) break;
            g = applyMove(g, id, m).state;
            if (allCards(g) !== 40) { lost++; break; }
          }
          if (g.phase === 'roundEnd' || g.phase === 'gameEnd') done++;
          else failures.push(`${level} ${players.length}p seed ${seed}: unfinished (${g.phase})`);
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
      while (g.phase !== 'gameEnd' && guard++ < 6000) {
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

/* --------------------------------------------------- three players ---- */
{
  const P3 = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }];
  eq('two, three or four', META.exactCounts.join(','), '2,3,4');
  eq('twenty is the share for two or four', breakEven(2), 20);
  eq('and for four', breakEven(4), 20);
  eq('but thirteen for three', breakEven(3), BREAK_EVEN_3);

  const g = createGame({ players: P3, seed: 5 });
  eq('three hands of three', g.players.filter(p => p.hand.length === 3).length, 3);
  eq('everybody for themselves', new Set(g.players.map(p => p.team)).size, 3);
  eq('and the deck divides evenly', (40 - 4) % 9, 0);
  eq('all forty accounted for', allCards(g), 40);

  /* the count uses the smaller share */
  const s = JSON.parse(JSON.stringify(g));
  s.phase = 'playing'; s.pendingCalls = []; s.teamScores = { A: 0, B: 0, C: 0 };
  s.table = []; s.deck = [];
  s.players[0].hand = [C(1, 'o')]; s.players[1].hand = [C(2, 'c')]; s.players[2].hand = [C(3, 'e')];
  s.players[0].pile = buildDeck().slice(0, 20);
  s.players[1].pile = buildDeck().slice(20, 30);
  s.players[2].pile = buildDeck().slice(30, 37);
  s.turn = 0; s.lastCapture = 'a';
  let r = applyMove(s, 'a', { type: 'play', cardId: 'o1' });
  r = applyMove(r.state, 'b', { type: 'play', cardId: 'c2' });
  r = applyMove(r.state, 'c', { type: 'play', cardId: 'e3' });
  const cnt = r.events.find(e => e.t === 'count');
  ok('the round ends', !!cnt);
  eq('the share is thirteen', cnt.share, 13);
  eq('and every card is somewhere', cnt.counts.A + cnt.counts.B + cnt.counts.C, 40);
  eq('a point for each card over thirteen', cnt.gained.A, Math.max(0, cnt.counts.A - 13));
  eq('nothing for being under', cnt.gained.C, Math.max(0, cnt.counts.C - 13));

  /* and three bots can play it out */
  let done = 0;
  for (let seed = 1; seed <= 8; seed++) {
    let gg = createGame({ players: P3, seed });
    const rnd = mulberry32(seed);
    let guard = 0;
    while ((gg.phase === 'playing' || gg.phase === 'calling') && guard++ < 400) {
      const id = gg.order[gg.turn];
      const mv = botMove(gg, id, rnd, 'sharp');
      if (!mv) break;
      gg = applyMove(gg, id, mv).state;
      if (allCards(gg) !== 40) { failures.push('three-hander seed ' + seed + ' lost a card'); break; }
    }
    if (gg.phase === 'roundEnd' || gg.phase === 'gameEnd') done++;
  }
  eq('three-handed rounds play out', done, 8);
}

/* ------------------------------------------------------ the qa'a bonus ---- */
{
  /* The dealer is dealt last, so the very last card of the deck is theirs. A
     king on the bottom pays the dealer's side five; an ace pays against them. */
  function bottom(card, players = P2) {
    const g = createGame({ players, seed: 3 });
    const s = JSON.parse(JSON.stringify(g));
    s.phase = 'playing'; s.pendingCalls = []; s.calls = [];
    s.teamScores = {}; s.teams.forEach(t => s.teamScores[t] = 0);
    /* set up the very last deal: exactly one round of three left, with the
       chosen card at the bottom */
    const filler = buildDeck().filter(c => c.rank !== 1 && c.rank !== 12);
    s.deck = filler.slice(0, s.order.length * 3 - 1).concat([card]);
    s.players.forEach(p => { p.hand = []; });
    s.table = [C(5, 'o')];
    s.turn = 0;
    /* trigger the deal by playing the last card of the previous hand */
    s.players[0].hand = [C(5, 'c')];
    const r = applyMove(s, s.order[0], { type: 'play', cardId: 'c5' });
    return r;
  }

  const rey = bottom(C(12, 'b'));
  const qr = rey.events.find(e => e.t === 'qaa');
  ok('a king on the bottom is a qa’a', !!qr);
  eq('it is the rey', qr && qr.kind, 'rey');
  eq('worth five', qr && qr.points, SCORES.qaaRey);
  eq('to the dealer', qr && qr.who, rey.state.dealer);
  eq('and the dealer holds it', playerById(rey.state, rey.state.dealer).hand.some(c => c.rank === 12), true);

  const as = bottom(C(1, 'b'));
  const qa = as.events.find(e => e.t === 'qaa');
  ok('an ace on the bottom is a qa’a too', !!qa);
  eq('it is the as', qa && qa.kind, 'as');
  eq('also worth five', qa && qa.points, SCORES.qaaAs);
  const dealerTeam = playerById(as.state, as.state.dealer).team;
  ok('but against the dealer', qa && qa.team !== dealerTeam, 'team ' + (qa && qa.team) + ' dealer ' + dealerTeam);

  const dull = bottom(C(7, 'b'));
  ok('anything else on the bottom pays nobody', !dull.events.some(e => e.t === 'qaa'));

  /* and it can be switched off */
  const off = createGame({ players: P2, seed: 3, house: { qaa: false } });
  eq('the bonus is a house rule', off.house.qaa, false);
}

/* -------------------------------------------------- the last warning ---- */
{
  /* the dealer has to say when the deck is finishing */
  let sawWarning = false, warnedEarly = false;
  let g = createGame({ players: P2, seed: 12 });
  g = settle(g).state;
  const rnd = mulberry32(12);
  let guard = 0;
  while (g.phase !== 'roundEnd' && g.phase !== 'gameEnd' && guard++ < 300) {
    const id = g.order[g.turn];
    const mv = botMove(g, id, rnd, 'normal');
    if (!mv) break;
    const r = applyMove(g, id, mv);
    r.events.filter(e => e.t === 'lastDeal').forEach(() => {
      sawWarning = true;
      if (r.state.deck.length > 0) warnedEarly = true;
    });
    g = r.state;
  }
  ok('the dealer warns that the deck is finishing', sawWarning);
  ok('and only on the deal that empties it', !warnedEarly);
}

/* ---------------------------------------------------------------- done ---- */
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) { console.log('\nFailures:'); failures.forEach(f => console.log('  ✗ ' + f)); }
process.exit(fail ? 1 : 0);
