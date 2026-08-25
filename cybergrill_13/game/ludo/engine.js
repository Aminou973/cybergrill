/* ==========================================================================
   LUDO — the rules, and nothing else.
   --------------------------------------------------------------------------
   No DOM, no network, no randomness that cannot be replayed. The same file
   runs in the browser and inside the Durable Object, so the referee is
   literally the same code on both sides and the rules can never drift apart.

   The board, in numbers rather than pictures:

     A token's `pos` is how many steps it has walked, not where it is sitting.

       -1        still in the yard
       0 .. 51   on the shared track, starting from its own colour's start
       52 .. 56  the five squares of its own home column
       57        home

     So every token needs exactly 57 steps, and the square a token is really
     standing on is (start + pos) mod 52. Two tokens of different colours with
     the same `pos` are nowhere near each other; two with the same absolute
     square are on top of each other. That distinction is the whole game.
   ========================================================================== */

export const META = {
  id: 'ludo',
  name: 'Ludo',
  icon: '🎲',
  blurb: 'Four tokens home before anyone else. Six to get out, exact roll to finish.',
  min: 2,
  max: 4,
  evenOnly: false,
  targets: [1, 2, 3],           /* how many rounds win the match */
  livePhases: ['playing'],
  defaultTarget: 1,
  path: 'ludo/'
};

export const TRACK = 52;          /* squares on the shared loop */
export const HOME_RUN = 5;        /* squares in your own column before the middle */
export const GOAL = TRACK + HOME_RUN;   /* 57 — the exact number of steps home */
export const TOKENS = 4;

/* where each colour joins the loop */
export const STARTS = [0, 13, 26, 39];
/* the squares nobody can be knocked off: the four starts and the four stars */
export const SAFE = [0, 8, 13, 21, 26, 34, 39, 47];
export const COLORS = ['r', 'g', 'y', 'b'];
export const COLOR_NAME = { r: 'RED', g: 'GREEN', y: 'YELLOW', b: 'BLUE' };

export const DEFAULT_HOUSE = {
  sixToLeave: true,     /* a six is needed to bring a token out */
  sixAgain: true,       /* and it earns another roll */
  exactFinish: true,    /* you must land on the middle exactly */
  capture: false,       /* landing on somebody sends them back to the yard */
  threeSixes: true      /* three sixes in a row and you lose the turn */
};

/* ---------- the dice, made replayable ----------
   The state carries a seed and a count of how many numbers have been drawn.
   Rolling means drawing the next one, so the same game replays identically
   anywhere — which is what makes the tests worth anything. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function drawDie(state) {
  const r = mulberry32(state.seed);
  for (let i = 0; i < state.rolls; i++) r();
  const v = 1 + Math.floor(r() * 6);
  return v > 6 ? 6 : v;
}

const clone = s => JSON.parse(JSON.stringify(s));

export function playerById(state, id) { return state.players.find(p => p.id === id); }
export function currentPlayer(state) { return playerById(state, state.order[state.turn]); }

/* the square a token is actually standing on, or null if it is not on the loop */
export function square(player, pos) {
  if (pos < 0 || pos >= TRACK) return null;
  return (STARTS[player.seat] + pos) % TRACK;
}
export function isSafe(sq) { return SAFE.indexOf(sq) !== -1; }
export function atHome(player) { return player.tokens.filter(t => t === GOAL).length; }
export function inYard(player) { return player.tokens.filter(t => t === -1).length; }

/* ==========================================================================
   a fresh board
   ========================================================================== */
export function createGame(opts = {}) {
  const list = (opts.players || []).slice(0, TOKENS);
  if (list.length < META.min) throw new Error('ludo needs at least two players');
  const house = { ...DEFAULT_HOUSE, ...(opts.house || {}) };
  const seed = (opts.seed === undefined ? 1 : opts.seed) >>> 0;

  const players = list.map((p, i) => ({
    id: p.id,
    name: p.name,
    seat: i,                       /* which corner, and so which start square */
    color: COLORS[i],
    tokens: [-1, -1, -1, -1],
    score: p.score || 0,
    connected: true
  }));

  return {
    game: 'ludo',
    players,
    order: players.map(p => p.id),
    turn: 0,
    dir: 1,
    phase: 'playing',
    house,
    seed,
    rolls: 0,                      /* how many dice have ever been drawn */
    die: null,                     /* the roll waiting to be used */
    sixes: 0,                      /* consecutive sixes this turn */
    finished: [],                  /* player ids, in the order they got all four home */
    round: opts.round || 1,
    target: opts.target || 1,      /* rounds to win the match */
    roundWinner: null,
    winner: null
  };
}

/* ==========================================================================
   what you may do
   ========================================================================== */
export function legalMoves(state, playerId) {
  const out = [];
  if (state.phase !== 'playing') return out;
  if (state.order[state.turn] !== playerId) return out;
  const me = playerById(state, playerId);
  if (!me) return out;

  if (state.die === null) { out.push({ type: 'roll' }); return out; }

  me.tokens.forEach((pos, i) => {
    if (canMove(state, me, i)) out.push({ type: 'move', token: i });
  });
  if (!out.length) out.push({ type: 'pass' });
  return out;
}

export function canMove(state, player, i) {
  const pos = player.tokens[i];
  const die = state.die;
  if (die === null) return false;
  if (pos === GOAL) return false;                         /* already home */
  if (pos === -1) return state.house.sixToLeave ? die === 6 : true;
  const next = pos + die;
  if (next > GOAL) return state.house.exactFinish ? false : true;
  return true;
}

/* ==========================================================================
   doing it
   ========================================================================== */
export function applyMove(state, playerId, move) {
  const s = clone(state);
  const events = [];
  const me = playerById(s, playerId);
  if (!me) throw new Error('no such player');
  if (s.phase !== 'playing') throw new Error('the game is over');
  if (s.order[s.turn] !== playerId) throw new Error('not your turn');
  if (!move || !move.type) throw new Error('no move given');

  switch (move.type) {
    case 'roll': {
      if (s.die !== null) throw new Error('you have already rolled — move a token');
      const v = drawDie(s);
      s.rolls++;
      s.die = v;
      events.push({ t: 'roll', who: me.id, die: v });

      if (v === 6) {
        s.sixes++;
        if (s.house.threeSixes && s.sixes >= 3) {
          events.push({ t: 'threeSixes', who: me.id });
          s.die = null; s.sixes = 0;
          advance(s);
          break;
        }
      } else {
        s.sixes = 0;
      }
      /* rolled, but nothing on the board can use it */
      if (!me.tokens.some((_, i) => canMove(s, me, i))) {
        events.push({ t: 'stuck', who: me.id, die: v });
      }
      break;
    }

    case 'pass': {
      if (s.die === null) throw new Error('roll first');
      if (me.tokens.some((_, i) => canMove(s, me, i))) throw new Error('you have a move — take it');
      events.push({ t: 'passed', who: me.id, die: s.die });
      const wasSix = s.die === 6;
      s.die = null;
      if (!(wasSix && s.house.sixAgain)) { s.sixes = 0; advance(s); }
      break;
    }

    case 'move': {
      if (s.die === null) throw new Error('roll first');
      const i = move.token;
      if (!(i >= 0 && i < TOKENS)) throw new Error('no such token');
      if (!canMove(s, me, i)) throw new Error('that token cannot move');

      const from = me.tokens[i];
      let to;
      if (from === -1) {
        to = 0;
        events.push({ t: 'leave', who: me.id, token: i, square: square(me, 0) });
      } else {
        to = Math.min(from + s.die, GOAL);
      }
      me.tokens[i] = to;
      events.push({ t: 'step', who: me.id, token: i, from, to, die: s.die });

      /* landing on somebody */
      const sq = square(me, to);
      if (sq !== null && s.house.capture && !isSafe(sq)) {
        for (const other of s.players) {
          if (other.id === me.id) continue;
          other.tokens.forEach((p2, j) => {
            if (p2 >= 0 && p2 < TRACK && square(other, p2) === sq) {
              other.tokens[j] = -1;
              events.push({ t: 'capture', who: me.id, victim: other.id, token: j, square: sq });
            }
          });
        }
      }

      if (to === GOAL) {
        events.push({ t: 'home', who: me.id, token: i, count: atHome(me) });
        if (atHome(me) === TOKENS) {
          s.finished.push(me.id);
          events.push({ t: 'allHome', who: me.id, place: s.finished.length });
        }
      }

      /* is the round over? it ends when only one player is still going */
      const stillGoing = s.players.filter(p => atHome(p) < TOKENS);
      if (stillGoing.length <= 1) {
        stillGoing.forEach(p => { if (s.finished.indexOf(p.id) === -1) s.finished.push(p.id); });
        endRound(s, events);
        return { state: s, events };
      }

      const wasSix = s.die === 6;
      s.die = null;
      if (wasSix && s.house.sixAgain) {
        events.push({ t: 'rollAgain', who: me.id });
      } else {
        s.sixes = 0;
        advance(s);
      }
      break;
    }

    default:
      throw new Error('unknown move: ' + move.type);
  }

  return { state: s, events };
}

/* the next seat that still has a token to move */
function advance(s) {
  for (let k = 1; k <= s.order.length; k++) {
    const idx = ((s.turn + k * s.dir) % s.order.length + s.order.length) % s.order.length;
    const p = playerById(s, s.order[idx]);
    if (atHome(p) < TOKENS) { s.turn = idx; return; }
  }
  s.turn = (s.turn + 1) % s.order.length;
}

/* ---------- scoring ----------
   Placement, the way a race scores: first home takes the round. Points are
   handed out by finishing position so a night of Ludo slots straight into the
   same table as everything else. */
export const PLACE_POINTS = [10, 6, 3, 1];

function endRound(s, events) {
  s.phase = 'roundEnd';
  s.roundWinner = s.finished[0] || null;
  const detail = {};
  s.finished.forEach((id, i) => {
    const p = playerById(s, id);
    const pts = PLACE_POINTS[i] === undefined ? 1 : PLACE_POINTS[i];
    p.score += pts;
    detail[id] = pts;
  });
  events.push({ t: 'roundEnd', winner: s.roundWinner, detail, order: s.finished.slice() });

  const best = s.players.slice().sort((a, b) => b.score - a.score)[0];
  const wins = s.players.filter(p => p.id === s.roundWinner).length;
  if (s.round >= s.target) {
    s.winner = best ? best.id : s.roundWinner;
    s.phase = 'gameEnd';
    events.push({ t: 'gameEnd', winner: s.winner, score: best ? best.score : 0 });
  }
  return wins;
}

export function nextRound(state, opts = {}) {
  const roster = (opts.players || state.players).map(p => ({ id: p.id, name: p.name, score: p.score || 0 }));
  const s = createGame({
    players: roster,
    seed: (state.seed * 1103515245 + 12345) >>> 0,
    house: state.house,
    target: state.target,
    round: state.round + 1
  });
  /* the winner of the last round sits out the first throw */
  if (state.roundWinner) {
    const w = s.order.indexOf(state.roundWinner);
    if (w >= 0) s.turn = (w + 1) % s.order.length;
  }
  return s;
}

/* ==========================================================================
   what a player is allowed to see
   --------------------------------------------------------------------------
   Everything. Ludo is played face up — the board is the whole truth, and
   hiding any of it would be lying about the game rather than protecting
   anybody. The shape still matches UNO's so the table code can be shared.
   ========================================================================== */
export function viewFor(state, playerId) {
  return {
    game: 'ludo',
    round: state.round,
    phase: state.phase,
    target: state.target,
    house: state.house,
    turn: state.order[state.turn],
    dir: state.dir,
    die: state.die,
    sixes: state.sixes,
    finished: state.finished.slice(),
    you: playerById(state, playerId) || null,
    players: state.order.map(id => {
      const p = playerById(state, id);
      return {
        id: p.id, name: p.name, seat: p.seat, color: p.color,
        tokens: p.tokens.slice(), score: p.score, connected: p.connected,
        home: atHome(p), yard: inYard(p)
      };
    }),
    roundWinner: state.roundWinner,
    winner: state.winner,
    moves: legalMoves(state, playerId)
  };
}

/* ==========================================================================
   the machines
   ========================================================================== */
export const BOT_LEVELS = ['easy', 'normal', 'sharp'];

export function botMove(state, playerId, rnd = Math.random, level = 'normal') {
  const ms = legalMoves(state, playerId);
  if (!ms.length) return null;
  if (ms.length === 1) return ms[0];              /* roll, or pass — no choice */
  if (!BOT_LEVELS.includes(level)) level = 'normal';
  if (level === 'easy') return ms[Math.floor(rnd() * ms.length)];

  const me = playerById(state, playerId);
  const die = state.die;
  const scored = ms.map(m => {
    if (m.type !== 'move') return { m, sc: -1 };
    const pos = me.tokens[m.token];
    const to = pos === -1 ? 0 : Math.min(pos + die, GOAL);
    let sc = 0;

    if (to === GOAL) sc += 100;                                  /* finish one */
    if (pos === -1) sc += 55;                                    /* get out */
    if (to >= TRACK && pos < TRACK) sc += 45;                    /* into the column */

    /* land on somebody, if this table allows it */
    if (state.house.capture) {
      const sq = square(me, to);
      if (sq !== null && !isSafe(sq)) {
        for (const other of state.players) {
          if (other.id === me.id) continue;
          if (other.tokens.some(p2 => p2 >= 0 && p2 < TRACK && square(other, p2) === sq)) sc += 80;
        }
      }
      /* and try not to stop somewhere you can be taken */
      const land = square(me, to);
      if (land !== null && !isSafe(land)) sc -= 8;
    }
    sc += to * 0.35;                                             /* progress is progress */
    if (level === 'normal') sc += rnd() * 26;                    /* not machine-perfect */
    return { m, sc };
  }).sort((a, b) => b.sc - a.sc);

  return scored[0].m;
}
