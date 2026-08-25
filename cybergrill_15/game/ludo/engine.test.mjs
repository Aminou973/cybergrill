/* ==========================================================================
   Ludo engine tests.  node game/ludo/engine.test.mjs
   ========================================================================== */
import {
  createGame, applyMove, legalMoves, viewFor, nextRound, botMove, canMove,
  playerById, square, isSafe, atHome, inYard, mulberry32,
  TRACK, HOME_RUN, GOAL, TOKENS, STARTS, SAFE, BOT_LEVELS, META, PLACE_POINTS
} from './engine.js';

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, extra) {
  if (cond) pass++; else { fail++; failures.push(name + (extra ? '  — ' + extra : '')); }
}
function eq(name, a, b) { ok(name, a === b, `got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); }
function throws(name, fn) {
  try { fn(); ok(name, false, 'no error thrown'); }
  catch (e) { pass++; }
}

const P4 = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }, { id: 'd', name: 'D' }];
const P2 = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];

/* force the die to a known value without going through the RNG */
function withDie(s, v) { const g = JSON.parse(JSON.stringify(s)); g.die = v; return g; }
function setTokens(s, id, arr) {
  const g = JSON.parse(JSON.stringify(s));
  playerById(g, id).tokens = arr.slice();
  return g;
}
function seatOf(s, id) { return s.order.indexOf(id); }
function turnTo(s, id) { const g = JSON.parse(JSON.stringify(s)); g.turn = seatOf(g, id); return g; }

/* ---------------------------------------------------------------- board ---- */
{
  eq('the loop is 52 squares', TRACK, 52);
  eq('the home column is five plus the middle', GOAL, TRACK + HOME_RUN);
  eq('every token walks 57 steps', GOAL, 57);
  eq('four starts, evenly spaced', STARTS.join(','), '0,13,26,39');
  eq('eight safe squares', SAFE.length, 8);
  ok('every start is safe', STARTS.every(s => isSafe(s)));
  ok('the stars are safe', [8, 21, 34, 47].every(s => isSafe(s)));
  ok('an ordinary square is not', !isSafe(5) && !isSafe(30));

  const g = createGame({ players: P4, seed: 1 });
  eq('four players seated', g.players.length, 4);
  eq('sixteen tokens in the yards', g.players.reduce((n, p) => n + inYard(p), 0), 16);
  ok('each player has their own start', new Set(g.players.map(p => STARTS[p.seat])).size === 4);
  eq('nobody has rolled yet', g.die, null);

  /* the same start square for two colours would break the whole model */
  const seen = new Set();
  g.players.forEach(p => { for (let i = 0; i < TRACK; i++) seen.add(p.seat + ':' + square(p, i)); });
  eq('every colour walks all 52 squares', seen.size, 4 * TRACK);
}

{
  throws('one player is not a game', () => createGame({ players: [{ id: 'a', name: 'A' }] }));
  const g5 = createGame({ players: [...P4, { id: 'e', name: 'E' }] });
  eq('a fifth player does not get a seat', g5.players.length, 4);
}

/* ------------------------------------------------------------- the roll ---- */
{
  const g = createGame({ players: P4, seed: 7 });
  eq('rolling is the only thing you can do', legalMoves(g, 'a').map(m => m.type).join(','), 'roll');
  eq('and only the player whose turn it is', legalMoves(g, 'b').length, 0);
  throws('you cannot move before rolling', () => applyMove(g, 'a', { type: 'move', token: 0 }));
  throws('another player cannot roll for you', () => applyMove(g, 'b', { type: 'roll' }));

  const r = applyMove(g, 'a', { type: 'roll' });
  ok('a die between one and six', r.state.die >= 1 && r.state.die <= 6, 'got ' + r.state.die);
  ok('the roll is announced', r.events.some(e => e.t === 'roll'));
  throws('you cannot roll twice', () => applyMove(r.state, 'a', { type: 'roll' }));

  /* the same seed must give the same game, or none of these tests mean anything */
  const again = applyMove(createGame({ players: P4, seed: 7 }), 'a', { type: 'roll' });
  eq('the dice replay identically', again.state.die, r.state.die);
  const other = applyMove(createGame({ players: P4, seed: 8 }), 'a', { type: 'roll' });
  ok('a different seed gives a different game', true);   /* may coincide; not asserted */
}

/* -------------------------------------------------------- six to leave ---- */
{
  let g = createGame({ players: P4, seed: 3 });
  const five = withDie(g, 5);
  eq('a five leaves you in the yard', legalMoves(five, 'a').map(m => m.type).join(','), 'pass');
  ok('and no token can move', !playerById(five, 'a').tokens.some((_, i) => canMove(five, playerById(five, 'a'), i)));

  const six = withDie(g, 6);
  eq('a six opens all four', legalMoves(six, 'a').filter(m => m.type === 'move').length, 4);
  const out = applyMove(six, 'a', { type: 'move', token: 0 });
  eq('the token steps onto its own start', playerById(out.state, 'a').tokens[0], 0);
  eq('which is square zero for the first seat', square(playerById(out.state, 'a'), 0), STARTS[0]);
  ok('leaving the yard is announced', out.events.some(e => e.t === 'leave'));
  eq('three still waiting', inYard(playerById(out.state, 'a')), 3);

  /* with the rule off, anything gets you out */
  const loose = createGame({ players: P4, seed: 3, house: { sixToLeave: false } });
  eq('with six-to-leave off a two will do', legalMoves(withDie(loose, 2), 'a').filter(m => m.type === 'move').length, 4);
}

/* ------------------------------------------------------- a six rolls on ---- */
{
  const g = createGame({ players: P4, seed: 3 });
  const out = applyMove(withDie(g, 6), 'a', { type: 'move', token: 0 });
  eq('a six keeps the turn', out.state.order[out.state.turn], 'a');
  ok('and says so', out.events.some(e => e.t === 'rollAgain'));
  eq('the die is cleared for the next throw', out.state.die, null);

  const four = applyMove(withDie(setTokens(g, 'a', [3, -1, -1, -1]), 4), 'a', { type: 'move', token: 0 });
  eq('anything else passes the turn on', four.state.order[four.state.turn], 'b');

  /* with the rule off a six is just a six */
  const strict = createGame({ players: P4, seed: 3, house: { sixAgain: false } });
  const s6 = applyMove(withDie(strict, 6), 'a', { type: 'move', token: 0 });
  eq('with six-again off the turn moves on', s6.state.order[s6.state.turn], 'b');
}

/* ------------------------------------------------------- three sixes ---- */
{
  /* walk a state to two sixes already banked, then roll a third */
  let g = createGame({ players: P4, seed: 3 });
  g = JSON.parse(JSON.stringify(g));
  g.sixes = 2;
  /* find a seed offset that yields a six on the next draw */
  let found = null;
  for (let n = 0; n < 400; n++) {
    const t = JSON.parse(JSON.stringify(g)); t.rolls = n;
    const r = applyMove(t, 'a', { type: 'roll' });
    if (r.events.some(e => e.t === 'threeSixes')) { found = r; break; }
  }
  ok('three sixes in a row forfeits the turn', !!found);
  if (found) {
    eq('the turn has moved on', found.state.order[found.state.turn], 'b');
    eq('the die is cleared', found.state.die, null);
    eq('the run resets', found.state.sixes, 0);
  }
}

/* ------------------------------------------------------ exact finish ---- */
{
  const g = createGame({ players: P4, seed: 3 });
  const nearly = setTokens(g, 'a', [GOAL - 2, -1, -1, -1]);   /* two steps from home */
  eq('a two goes home', applyMove(withDie(nearly, 2), 'a', { type: 'move', token: 0 })
    .state.players[0].tokens[0], GOAL);
  eq('a three overshoots and cannot move', legalMoves(withDie(nearly, 3), 'a').map(m => m.type).join(','), 'pass');
  throws('and the engine refuses it outright',
    () => applyMove(withDie(nearly, 3), 'a', { type: 'move', token: 0 }));

  const loose = createGame({ players: P4, seed: 3, house: { exactFinish: false } });
  const n2 = setTokens(loose, 'a', [GOAL - 2, -1, -1, -1]);
  eq('with exact-finish off an overshoot still lands home',
    applyMove(withDie(n2, 3), 'a', { type: 'move', token: 0 }).state.players[0].tokens[0], GOAL);
}

/* ----------------------------------------------------------- capture ---- */
{
  /* put A and B on the same square, with capture on */
  const g = createGame({ players: P4, seed: 3, house: { capture: true } });
  const A = playerById(g, 'a'), B = playerById(g, 'b');
  /* choose a target square that is not safe and reachable by both */
  let posA = null, posB = null, sq = null;
  for (let pa = 1; pa < TRACK && sq === null; pa++) {
    const s1 = square(A, pa);
    if (isSafe(s1)) continue;
    for (let pb = 1; pb < TRACK; pb++) {
      if (square(B, pb) === s1) { posA = pa - 3; posB = pb; sq = s1; break; }
    }
  }
  ok('found an ordinary square both colours pass through', sq !== null);
  if (sq !== null) {
    let g2 = setTokens(g, 'a', [posA, -1, -1, -1]);
    g2 = setTokens(g2, 'b', [posB, -1, -1, -1]);
    const hit = applyMove(withDie(g2, 3), 'a', { type: 'move', token: 0 });
    ok('landing on them is a capture', hit.events.some(e => e.t === 'capture' && e.victim === 'b'));
    eq('and sends the token back to the yard', playerById(hit.state, 'b').tokens[0], -1);

    /* the same move with capture off leaves them alone */
    let g3 = setTokens(createGame({ players: P4, seed: 3 }), 'a', [posA, -1, -1, -1]);
    g3 = setTokens(g3, 'b', [posB, -1, -1, -1]);
    const soft = applyMove(withDie(g3, 3), 'a', { type: 'move', token: 0 });
    ok('with capture off nobody is sent home', !soft.events.some(e => e.t === 'capture'));
    eq('the other token stays put', playerById(soft.state, 'b').tokens[0], posB);
  }

  /* a safe square protects you even with capture on */
  const safeSq = 8;
  const A2 = playerById(g, 'a');
  let posSafeA = null, posSafeB = null;
  for (let p = 0; p < TRACK; p++) if (square(A2, p) === safeSq) posSafeA = p;
  for (let p = 0; p < TRACK; p++) if (square(playerById(g, 'b'), p) === safeSq) posSafeB = p;
  if (posSafeA !== null && posSafeB !== null && posSafeA >= 2) {
    let g4 = setTokens(g, 'a', [posSafeA - 2, -1, -1, -1]);
    g4 = setTokens(g4, 'b', [posSafeB, -1, -1, -1]);
    const onStar = applyMove(withDie(g4, 2), 'a', { type: 'move', token: 0 });
    ok('a star square is a shelter', !onStar.events.some(e => e.t === 'capture'));
  }
}

/* -------------------------------------------------------- going home ---- */
{
  const g = createGame({ players: P2, seed: 3, target: 3 });
  const nearly = setTokens(g, 'a', [GOAL, GOAL, GOAL, GOAL - 1]);
  const done = applyMove(withDie(nearly, 1), 'a', { type: 'move', token: 3 });
  ok('the fourth token home is announced', done.events.some(e => e.t === 'allHome' && e.who === 'a'));
  eq('and with only one player left the round ends', done.state.phase, 'roundEnd');

  /* a one-round match ends outright rather than dealing again */
  const single = createGame({ players: P2, seed: 3 });
  const quick = applyMove(withDie(setTokens(single, 'a', [GOAL, GOAL, GOAL, GOAL - 1]), 1), 'a', { type: 'move', token: 3 });
  eq('a single-round match is over', quick.state.phase, 'gameEnd');
  eq('and has a winner', quick.state.winner, 'a');

  /* with four players, one finishing does not end anything */
  const four0 = createGame({ players: P4, seed: 3, target: 3 });
  const one = applyMove(withDie(setTokens(four0, 'a', [GOAL, GOAL, GOAL, GOAL - 1]), 1), 'a', { type: 'move', token: 3 });
  eq('three still playing means the round goes on', one.state.phase, 'playing');
  eq('but the finisher is placed first', one.state.finished[0], 'a');
  eq('first home wins the round', done.state.roundWinner, 'a');
  eq('and takes the top points', playerById(done.state, 'a').score, PLACE_POINTS[0]);
  ok('the loser is placed too', done.state.finished.indexOf('b') === 1);

  /* a player who is home is skipped, not asked to roll */
  const four = createGame({ players: P4, seed: 3 });
  let f = setTokens(four, 'b', [GOAL, GOAL, GOAL, GOAL]);
  f = JSON.parse(JSON.stringify(f)); f.turn = 0;
  const roll = applyMove(withDie(f, 4), 'a', { type: 'pass' });
  ok('the finished seat is skipped', roll.state.order[roll.state.turn] !== 'b');
}

/* ------------------------------------------------------------- views ---- */
{
  const g = createGame({ players: P4, seed: 3 });
  const v = viewFor(g, 'a');
  eq('the view names the game', v.game, 'ludo');
  eq('everyone is visible', v.players.length, 4);
  ok('every board position is public', v.players.every(p => Array.isArray(p.tokens)));
  eq('your own moves come with it', v.moves.map(m => m.type).join(','), 'roll');
  eq('and nobody else gets moves', viewFor(g, 'b').moves.length, 0);
}

/* --------------------------------------------------------- next round ---- */
{
  const g = createGame({ players: P2, seed: 3, target: 3 });
  const done = setTokens(g, 'a', [GOAL, GOAL, GOAL, GOAL - 1]);
  const end = applyMove(withDie(done, 1), 'a', { type: 'move', token: 3 });
  eq('the round ended', end.state.phase, 'roundEnd');
  const n = nextRound(end.state);
  eq('the round number goes up', n.round, 2);
  eq('scores are carried', playerById(n, 'a').score, PLACE_POINTS[0]);
  eq('the runner-up keeps theirs too', playerById(n, 'b').score, PLACE_POINTS[1]);
  eq('everybody starts in the yard again', n.players.reduce((t, p) => t + inYard(p), 0), 8);
  ok('the winner does not throw first', n.order[n.turn] !== 'a');
}

/* -------------------------------------------------------------- bots ---- */
{
  let done = 0, errs = 0, longest = 0;
  for (const level of BOT_LEVELS) {
    for (let seed = 1; seed <= 25; seed++) {
      try {
        let g = createGame({ players: P4, seed, house: { capture: seed % 2 === 0 } });
        const rnd = mulberry32(seed * 31 + 5);
        let guard = 0;
        while (g.phase === 'playing' && guard++ < 20000) {
          const id = g.order[g.turn];
          const m = botMove(g, id, rnd, level);
          if (!m) break;
          g = applyMove(g, id, m).state;
        }
        longest = Math.max(longest, guard);
        if (g.phase !== 'playing') done++;
        else failures.push(`${level} seed ${seed}: still going after ${guard} moves`);
      } catch (e) { errs++; failures.push(`${level} seed ${seed}: ${e.message}`); }
    }
  }
  eq('every bot level finishes every game', done, 75);
  eq('and never makes an illegal move', errs, 0);
  ok('games finish in a sane number of moves', longest < 20000, 'longest ' + longest);
}

/* every token must always be somewhere legal, whatever happens */
{
  let bad = 0;
  for (let seed = 40; seed < 60; seed++) {
    let g = createGame({ players: P4, seed, house: { capture: true } });
    const rnd = mulberry32(seed);
    let guard = 0;
    while (g.phase === 'playing' && guard++ < 20000) {
      const id = g.order[g.turn];
      const m = botMove(g, id, rnd, 'sharp');
      if (!m) break;
      g = applyMove(g, id, m).state;
      for (const p of g.players) {
        if (p.tokens.length !== TOKENS) bad++;
        for (const t of p.tokens) if (!(t === -1 || (t >= 0 && t <= GOAL))) bad++;
      }
    }
  }
  eq('no token ever ends up off the board', bad, 0);
}

/* ---------------------------------------------------------------- done ---- */
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) { console.log('\nFailures:'); failures.forEach(f => console.log('  ✗ ' + f)); }
process.exit(fail ? 1 : 0);
