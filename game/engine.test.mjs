/* ==========================================================================
   Engine tests.  node game/engine.test.mjs
   ========================================================================== */
import {
  createGame, applyMove, legalMoves, viewFor, buildDeck, cardValue, nextRound,
  botMove, mulberry32, handValue, playerById, topCard, cardPlayable, isWild, COLORS
} from './engine.js';

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; failures.push(name + (extra ? '  — ' + extra : '')); }
}
function eq(name, a, b) { ok(name, a === b, `got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); }

const P4 = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }, { id: 'd', name: 'D' }];
const P2 = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];

/* ---------------------------------------------------------------- deck ---- */
{
  const d = buildDeck();
  eq('deck has 108 cards', d.length, 108);
  eq('deck has 4 wilds', d.filter(c => c.kind === 'wild').length, 4);
  eq('deck has 4 wild draw fours', d.filter(c => c.kind === 'wd4').length, 4);
  eq('one zero per colour', d.filter(c => c.kind === '0').length, 4);
  eq('two fives per colour', d.filter(c => c.kind === '5').length, 8);
  eq('two skips per colour', d.filter(c => c.kind === 'skip').length, 8);
  eq('unique ids', new Set(d.map(c => c.id)).size, 108);
  eq('card values: 0', cardValue('0'), 0);
  eq('card values: 9', cardValue('9'), 9);
  eq('card values: skip', cardValue('skip'), 20);
  eq('card values: wd4', cardValue('wd4'), 50);
  /* 4 colours x (0 + 2x(1..9)=90) = 360, action cards 4x6x20 = 480, wilds 8x50 = 400 */
  const total = d.reduce((s, c) => s + cardValue(c.kind), 0);
  eq('whole deck is worth 1240', total, 1240);
}

/* ---------------------------------------------------------------- deal ---- */
{
  const g = createGame({ players: P4, seed: 7 });
  ok('everyone gets 7 cards', g.players.every(p => p.hand.length === 7));
  eq('one card on the discard', g.discard.length, 1);
  eq('draw pile holds the rest', g.draw.length, 108 - 28 - 1);
  ok('first card is never a +4', topCard(g).kind !== 'wd4');
  const seen = new Set();
  g.players.forEach(p => p.hand.forEach(c => seen.add(c.id)));
  g.draw.forEach(c => seen.add(c.id));
  g.discard.forEach(c => seen.add(c.id));
  eq('no card is lost or duplicated', seen.size, 108);
}

/* ------------------------------------------------- a rigged-hand helper ---- */
function rig(opts) {
  /* build a game then force hands / discard so a rule can be tested exactly */
  const g = createGame({ players: opts.players || P4, seed: opts.seed || 1, house: opts.house });
  const pool = buildDeck();
  const take = (color, kind) => {
    const i = pool.findIndex(c => c.color === color && c.kind === kind);
    if (i < 0) throw new Error('no such card ' + color + kind);
    return pool.splice(i, 1)[0];
  };
  if (opts.hands) {
    for (const [pid, list] of Object.entries(opts.hands)) {
      playerById(g, pid).hand = list.map(([c, k]) => take(c, k));
    }
  }
  if (opts.top) { const t = take(opts.top[0], opts.top[1]); g.discard = [t]; g.color = t.color === 'w' ? opts.color : t.color; }
  if (opts.color) g.color = opts.color;
  g.draw = pool;
  g.turn = g.order.indexOf(opts.turn || 'a');
  g.dir = opts.dir || 1;
  g.pending = 0; g.pendingKind = null; g.challenge = null; g.drawnThisTurn = null;
  g.players.forEach(p => { p.said = p.hand.length === 1 ? !!opts.said : false; });
  return g;
}
const idOf = (g, pid, color, kind) => playerById(g, pid).hand.find(c => c.color === color && c.kind === kind).id;

/* ------------------------------------------------------------- matching ---- */
{
  const g = rig({ hands: { a: [['r', '1'], ['b', '3'], ['g', '9'], ['w', 'wild']] }, top: ['r', '3'] });
  const me = playerById(g, 'a');
  ok('same colour is playable', cardPlayable(g, me.hand[0], me));
  ok('same number different colour is playable', cardPlayable(g, me.hand[1], me));
  ok('mismatched card is not playable', !cardPlayable(g, me.hand[2], me));
  ok('wild is always playable', cardPlayable(g, me.hand[3], me));
}

/* ----------------------------------------------------------------- skip ---- */
{
  const g = rig({ hands: { a: [['r', 'skip'], ['r', '1']] }, top: ['r', '3'] });
  const { state } = applyMove(g, 'a', { type: 'play', cardId: idOf(g, 'a', 'r', 'skip') });
  eq('skip jumps over B to C', state.order[state.turn], 'c');
}

/* -------------------------------------------------------------- reverse ---- */
{
  const g = rig({ hands: { a: [['r', 'rev'], ['r', '1']] }, top: ['r', '3'] });
  const { state } = applyMove(g, 'a', { type: 'play', cardId: idOf(g, 'a', 'r', 'rev') });
  eq('reverse flips direction', state.dir, -1);
  eq('reverse passes to D', state.order[state.turn], 'd');
}
{
  const g = rig({ players: P2, hands: { a: [['r', 'rev'], ['r', '1']] }, top: ['r', '3'] });
  const { state } = applyMove(g, 'a', { type: 'play', cardId: idOf(g, 'a', 'r', 'rev') });
  eq('two-player reverse acts as a skip', state.order[state.turn], 'a');
}
{
  const g = rig({ players: P2, hands: { a: [['r', 'skip'], ['r', '1']] }, top: ['r', '3'] });
  const { state } = applyMove(g, 'a', { type: 'play', cardId: idOf(g, 'a', 'r', 'skip') });
  eq('two-player skip returns the turn', state.order[state.turn], 'a');
}

/* --------------------------------------------------------------- draw 2 ---- */
{
  const g = rig({ hands: { a: [['r', 'd2'], ['r', '1']], b: [['g', '9']] }, top: ['r', '3'] });
  const { state } = applyMove(g, 'a', { type: 'play', cardId: idOf(g, 'a', 'r', 'd2') });
  eq('+2 makes B draw two', playerById(state, 'b').hand.length, 3);
  eq('+2 skips B', state.order[state.turn], 'c');
}

/* --------------------------------------------------- +4 legality & bluff ---- */
{
  const g = rig({ hands: { a: [['w', 'wd4'], ['r', '1']] }, top: ['r', '3'] });
  const me = playerById(g, 'a');
  ok('+4 can be put down even while holding the colour (that is the bluff)',
    cardPlayable(g, me.hand[0], me));
}
{
  /* honest +4: A holds no red. B challenges and is wrong -> B draws 6. */
  const g = rig({ hands: { a: [['w', 'wd4'], ['g', '1']], b: [['b', '2']] }, top: ['r', '3'] });
  const wd4 = playerById(g, 'a').hand[0].id;
  const r1 = applyMove(g, 'a', { type: 'play', cardId: wd4, color: 'y' });
  ok('a challenge window opens', !!r1.state.challenge);
  eq('the window belongs to B', r1.state.challenge.by, 'b');
  const ms = legalMoves(r1.state, 'b').map(m => m.type);
  ok('B may challenge or accept', ms.includes('challenge') && ms.includes('accept'));
  const r2 = applyMove(r1.state, 'b', { type: 'challenge' });
  eq('a wrong challenge costs six cards', playerById(r2.state, 'b').hand.length, 7);
  eq('the bluffer-who-was-not draws nothing', playerById(r2.state, 'a').hand.length, 1);
  eq('and the turn moves on', r2.state.order[r2.state.turn], 'c');
}
{
  /* bluffed +4: A holds a red while red is live. B challenges and is right. */
  const g = rig({ hands: { a: [['w', 'wd4'], ['r', '1'], ['r', '2']], b: [['b', '2']] }, top: ['r', '3'] });
  const wd4 = playerById(g, 'a').hand[0].id;
  const r1 = applyMove(g, 'a', { type: 'play', cardId: wd4, color: 'y' });
  const r2 = applyMove(r1.state, 'b', { type: 'challenge' });
  eq('a correct challenge makes the bluffer draw four', playerById(r2.state, 'a').hand.length, 6);
  eq('the challenger draws nothing', playerById(r2.state, 'b').hand.length, 1);
  eq('the challenger still loses the turn', r2.state.order[r2.state.turn], 'c');
}
{
  /* accepting takes the four */
  const g = rig({ hands: { a: [['w', 'wd4'], ['g', '1']], b: [['b', '2']] }, top: ['r', '3'] });
  const r1 = applyMove(g, 'a', { type: 'play', cardId: playerById(g, 'a').hand[0].id, color: 'y' });
  const r2 = applyMove(r1.state, 'b', { type: 'accept' });
  eq('accepting draws four', playerById(r2.state, 'b').hand.length, 5);
  eq('and skips the victim', r2.state.order[r2.state.turn], 'c');
}
{
  /* noBluff: no window at all, cards land immediately */
  const g = rig({ house: { noBluff: true }, hands: { a: [['w', 'wd4'], ['g', '1']], b: [['b', '2']] }, top: ['r', '3'] });
  const r = applyMove(g, 'a', { type: 'play', cardId: playerById(g, 'a').hand[0].id, color: 'y' });
  ok('noBluff opens no challenge', !r.state.challenge);
  eq('noBluff forces the four straight away', playerById(r.state, 'b').hand.length, 5);
  eq('and skips the victim', r.state.order[r.state.turn], 'c');
}

/* ------------------------------------------------------------ UNO calls ---- */
{
  const g = rig({ hands: { a: [['r', '1'], ['r', '2']], b: [['g', '9']] }, top: ['r', '3'] });
  const r1 = applyMove(g, 'a', { type: 'play', cardId: idOf(g, 'a', 'r', '1') });
  eq('A is down to one card', playerById(r1.state, 'a').hand.length, 1);
  ok('A has not called UNO', !playerById(r1.state, 'a').said);
  const canCatch = legalMoves(r1.state, 'c').some(m => m.type === 'catch' && m.targetId === 'a');
  ok('another player may catch A', canCatch);
  const r2 = applyMove(r1.state, 'c', { type: 'catch', targetId: 'a' });
  eq('being caught costs four cards', playerById(r2.state, 'a').hand.length, 5);
}
{
  const g = rig({ hands: { a: [['r', '1'], ['r', '2']] }, top: ['r', '3'] });
  const r1 = applyMove(g, 'a', { type: 'play', cardId: idOf(g, 'a', 'r', '1') });
  const r2 = applyMove(r1.state, 'a', { type: 'sayUno' });
  ok('A can call UNO', playerById(r2.state, 'a').said);
  ok('a player who called cannot be caught',
    !legalMoves(r2.state, 'c').some(m => m.type === 'catch' && m.targetId === 'a'));
}

/* --------------------------------------------------------------- 7 and 0 ---- */
{
  const g = rig({ house: { seven0: true }, hands: { a: [['r', '7'], ['b', '1']], b: [['g', '2'], ['g', '3'], ['g', '4']] }, top: ['r', '3'] });
  const r = applyMove(g, 'a', { type: 'play', cardId: idOf(g, 'a', 'r', '7'), target: 'b' });
  eq('playing a 7 swaps hands: A now holds 3', playerById(r.state, 'a').hand.length, 3);
  eq('and B holds 1', playerById(r.state, 'b').hand.length, 1);
}
{
  const g = rig({
    house: { seven0: true },
    hands: { a: [['r', '0'], ['b', '1']], b: [['g', '2'], ['g', '3']], c: [['y', '2'], ['y', '3'], ['y', '4']], d: [['b', '5']] },
    top: ['r', '3']
  });
  const before = g.order.map(id => playerById(g, id).hand.length);
  const r = applyMove(g, 'a', { type: 'play', cardId: idOf(g, 'a', 'r', '0') });
  const after = r.state.order.map(id => playerById(r.state, id).hand.length);
  ok('playing a 0 rotates every hand', JSON.stringify(after) !== JSON.stringify(before));
  eq('no cards vanish in the rotation', after.reduce((x, y) => x + y, 0), before.reduce((x, y) => x + y, 0) - 1);
}
{
  const g = rig({ hands: { a: [['r', '7'], ['b', '1']], b: [['g', '2'], ['g', '3'], ['g', '4']] }, top: ['r', '3'] });
  const r = applyMove(g, 'a', { type: 'play', cardId: idOf(g, 'a', 'r', '7') });
  eq('with 7-0 off a seven is just a seven', playerById(r.state, 'a').hand.length, 1);
}

/* ------------------------------------------------------------- stacking ---- */
{
  const g = rig({ house: { stack: true }, hands: { a: [['r', 'd2'], ['r', '1']], b: [['g', 'd2'], ['g', '5']] }, top: ['r', '3'] });
  const r1 = applyMove(g, 'a', { type: 'play', cardId: idOf(g, 'a', 'r', 'd2') });
  eq('the +2 is left pending for B', r1.state.pending, 2);
  eq('B is on turn', r1.state.order[r1.state.turn], 'b');
  const opts = legalMoves(r1.state, 'b');
  ok('B may stack another +2', opts.some(m => m.type === 'play'));
  ok('B may instead take the cards', opts.some(m => m.type === 'takeStack'));
  const r2 = applyMove(r1.state, 'b', { type: 'play', cardId: idOf(r1.state, 'b', 'g', 'd2') });
  eq('stacking raises the pile to 4', r2.state.pending, 4);
  const r3 = applyMove(r2.state, 'c', { type: 'takeStack' });
  eq('C takes all four', playerById(r3.state, 'c').hand.length, 7 + 4);
  eq('and the pile is cleared', r3.state.pending, 0);
}
{
  const g = rig({ house: { stack: false }, hands: { a: [['r', 'd2'], ['r', '1']], b: [['g', 'd2'], ['g', '5']] }, top: ['r', '3'] });
  const r = applyMove(g, 'a', { type: 'play', cardId: idOf(g, 'a', 'r', 'd2') });
  eq('with stacking off B just draws', playerById(r.state, 'b').hand.length, 4);
  eq('and is skipped', r.state.order[r.state.turn], 'c');
}

/* --------------------------------------------------------------- jump in ---- */
{
  const g = rig({ house: { jumpIn: true }, hands: { a: [['r', '5'], ['b', '1']], c: [['r', '3'], ['g', '2']] }, top: ['r', '3'] });
  const jump = legalMoves(g, 'c').find(m => m.jumpIn);
  ok('C can jump in with the identical card', !!jump);
  const r = applyMove(g, 'c', jump);
  eq('play continues from the jumper', r.state.order[r.state.turn], 'd');
}
{
  const g = rig({ house: { jumpIn: false }, hands: { c: [['r', '3'], ['g', '2']] }, top: ['r', '3'] });
  ok('with jump-in off there is no such move', !legalMoves(g, 'c').some(m => m.jumpIn));
}

/* ---------------------------------------------------------- draw & pass ---- */
{
  const g = rig({ hands: { a: [['g', '9'], ['b', '8']] }, top: ['r', '3'] });
  ok('with nothing playable the only move is draw', legalMoves(g, 'a').every(m => m.type === 'draw' || m.type === 'catch'));
  const r = applyMove(g, 'a', { type: 'draw' });
  ok('drawing adds a card', playerById(r.state, 'a').hand.length === 3);
}
{
  const g = rig({ house: { drawUntil: true }, hands: { a: [['g', '9'], ['b', '8']] }, top: ['r', '3'] });
  const r = applyMove(g, 'a', { type: 'draw' });
  const me = playerById(r.state, 'a');
  const last = me.hand[me.hand.length - 1];
  ok('drawUntil keeps drawing until something is playable',
    cardPlayable(r.state, last, me) || r.state.draw.length === 0);
}

/* ------------------------------------------------------ going out & score ---- */
{
  const g = rig({
    hands: { a: [['r', '5']], b: [['g', '9'], ['y', 'skip']], c: [['w', 'wild']], d: [['b', '0']] },
    top: ['r', '3'], said: true
  });
  const r = applyMove(g, 'a', { type: 'play', cardId: idOf(g, 'a', 'r', '5') });
  eq('the round ends', r.state.phase, 'roundEnd');
  eq('A wins it', r.state.roundWinner, 'a');
  /* 9 + 20 + 50 + 0 = 79 */
  eq('A banks every other hand', playerById(r.state, 'a').score, 79);
}
{
  const g = rig({ hands: { a: [['r', 'd2']], b: [['g', '9']] }, top: ['r', '3'], said: true });
  const r = applyMove(g, 'a', { type: 'play', cardId: idOf(g, 'a', 'r', 'd2') });
  eq('a last-card +2 still hits the next player', playerById(r.state, 'b').hand.length, 3);
  ok('and those cards count in the score', playerById(r.state, 'a').score > 9);
}
{
  const g = rig({ hands: { a: [['r', '5']], b: [['g', '9']] }, top: ['r', '3'], said: true });
  g.target = 5;
  g.players[0].score = 0;
  const r = applyMove(g, 'a', { type: 'play', cardId: idOf(g, 'a', 'r', '5') });
  eq('passing the target ends the game', r.state.phase, 'gameEnd');
  eq('and names the winner', r.state.winner, 'a');
}

/* --------------------------------------------------------------- views ---- */
{
  const g = createGame({ players: P4, seed: 11 });
  const v = viewFor(g, 'a');
  eq('you see your own hand', v.you.hand.length, 7);
  ok('you only see counts for everyone else', v.players.every(p => p.count === 7 && !('hand' in p)));
  const json = JSON.stringify(v);
  const others = g.players.filter(p => p.id !== 'a');
  const leaked = others.some(p => p.hand.some(c => json.includes('"' + c.id + '"')));
  ok('no other hand leaks into the view', !leaked);
}

/* ------------------------------------------------- illegal moves rejected ---- */
{
  const g = rig({ hands: { a: [['g', '9'], ['b', '8']] }, top: ['r', '3'] });
  let threw = false;
  try { applyMove(g, 'a', { type: 'play', cardId: playerById(g, 'a').hand[0].id }); } catch (e) { threw = true; }
  ok('playing an unplayable card throws', threw);
  let threw2 = false;
  try { applyMove(g, 'b', { type: 'draw' }); } catch (e) { threw2 = true; }
  ok('moving out of turn throws', threw2);
}

/* ------------------------------------------------------- full bot games ---- */
{
  let finished = 0, maxTurns = 0, errors = 0, reshuffles = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const rnd = mulberry32(seed * 7919);
    const house = {
      stack: seed % 2 === 0, jumpIn: seed % 3 === 0, seven0: seed % 5 === 0,
      drawUntil: seed % 7 === 0, noBluff: seed % 11 === 0, randomDir: seed % 4 === 0
    };
    let g = createGame({ players: seed % 6 === 0 ? P2 : P4, seed, house });
    let turns = 0;
    try {
      while (g.phase === 'playing' && turns < 4000) {
        /* whoever can act, acts — turn holder first, then catches/challenges */
        let acted = false;
        const ids = [g.order[g.turn], ...g.order.filter(x => x !== g.order[g.turn])];
        for (const id of ids) {
          const m = botMove(g, id, rnd);
          if (!m) continue;
          if (id !== g.order[g.turn] && m.type === 'catch' && rnd() < 0.5) continue;
          g = applyMove(g, id, m).state;
          acted = true;
          break;
        }
        if (!acted) break;
        turns++;
        /* invariant: cards are conserved */
        const total = g.players.reduce((s, p) => s + p.hand.length, 0) + g.draw.length + g.discard.length;
        if (total !== 108) { errors++; break; }
      }
      if (g.phase !== 'playing') finished++;
      maxTurns = Math.max(maxTurns, turns);
    } catch (e) { errors++; failures.push('bot game seed ' + seed + ': ' + e.message); }
  }
  eq('200 bot games all reach an end', finished, 200);
  eq('no errors in bot games', errors, 0);
  ok('games terminate in reasonable time', maxTurns < 4000, 'longest ' + maxTurns);
}

/* --------------------------------------------------------- next round ---- */
{
  let g = rig({ hands: { a: [['r', '5']], b: [['g', '9']] }, top: ['r', '3'], said: true });
  g = applyMove(g, 'a', { type: 'play', cardId: idOf(g, 'a', 'r', '5') }).state;
  const n = nextRound(g);
  eq('scores carry into the next round', playerById(n, 'a').score, playerById(g, 'a').score);
  eq('the round counter goes up', n.round, g.round + 1);
  ok('everyone is dealt a fresh seven', n.players.every(p => p.hand.length === 7));
}

/* ---------------------------------------------------------------- done ---- */
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) { console.log('\nFailures:'); failures.forEach(f => console.log('  ✗ ' + f)); }
process.exit(fail ? 1 : 0);
