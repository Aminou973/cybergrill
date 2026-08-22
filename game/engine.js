/* ==========================================================================
   CyberGrill — UNO rules engine
   --------------------------------------------------------------------------
   Pure ES module. No DOM, no network, no clock. The same file runs in the
   browser and inside the Cloudflare Durable Object, so the server can be the
   referee and the client can predict.

   Everything is a pure-ish transition:

     createGame(opts)            -> state
     legalMoves(state, playerId) -> [move]
     applyMove(state, pid, move) -> { state, events }   (throws on illegal)
     viewFor(state, playerId)    -> redacted state safe to send to that player

   Card ids are unique strings so a client can name exactly which card it means
   even when it holds two identical ones.
   ========================================================================== */

export const COLORS = ['r', 'g', 'b', 'y'];
export const COLOR_NAME = { r: 'RED', g: 'GREEN', b: 'BLUE', y: 'YELLOW' };

/* card kinds: '0'..'9' | 'skip' | 'rev' | 'd2' | 'wild' | 'wd4' */
export function cardValue(kind) {
  if (/^[0-9]$/.test(kind)) return +kind;
  if (kind === 'skip' || kind === 'rev' || kind === 'd2') return 20;
  return 50;                       /* wild, wd4 */
}
export function isWild(kind) { return kind === 'wild' || kind === 'wd4'; }
export function cardLabel(c) {
  const k = { skip: 'SKIP', rev: 'REV', d2: '+2', wild: 'WILD', wd4: '+4' };
  return k[c.kind] || c.kind;
}

/* ---------- deterministic RNG so games are reproducible and testable ---------- */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rnd) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---------- the 108-card deck ---------- */
export function buildDeck() {
  const deck = [];
  let n = 0;
  const add = (color, kind) => deck.push({ id: 'c' + (n++), color, kind });
  for (const c of COLORS) {
    add(c, '0');
    for (let v = 1; v <= 9; v++) { add(c, String(v)); add(c, String(v)); }
    for (const k of ['skip', 'rev', 'd2']) { add(c, k); add(c, k); }
  }
  for (let i = 0; i < 4; i++) { add('w', 'wild'); add('w', 'wd4'); }
  return deck;                       /* 4*(1+18+6) + 8 = 108 */
}

/* Game modes.
   classic     — the winner banks the losers' cards, first to the target wins.
   teams       — 2v2, partners opposite each other, the team banks together.
   elimination — nobody banks. Each round the biggest hand left is knocked out
                 and you keep dealing until one player is standing. */
export const MODES = ['classic', 'teams', 'elimination'];

export const DEFAULT_HOUSE = {
  stack: false,        /* answer a +2 with a +2 (or +4 with +4) */
  jumpIn: false,       /* identical card out of turn */
  seven0: false,       /* 7 swaps hands, 0 rotates all hands */
  drawUntil: false,    /* keep drawing until playable */
  noBluff: false,      /* +4 always legal, no challenge */
  randomDir: false     /* the draw also picks the direction */
};

/* ==========================================================================
   create
   ========================================================================== */
export function createGame(opts = {}) {
  const players = (opts.players || []).map((p, i) => ({
    id: p.id || 'p' + i,
    name: p.name || ('Player ' + (i + 1)),
    hand: [],
    said: false,          /* has called UNO for the current 1-card state */
    connected: true,
    score: p.score || 0
  }));
  if (players.length < 2) throw new Error('need at least 2 players');
  if (players.length > 10) throw new Error('at most 10 players');

  const mode = MODES.includes(opts.mode) ? opts.mode : 'classic';
  if (mode === 'teams' && players.length % 2 !== 0) throw new Error('teams needs an even number of players');
  if (mode === 'teams' && players.length < 4) throw new Error('teams needs at least 4 players');
  const house = Object.assign({}, DEFAULT_HOUSE, opts.house || {});
  const seed = (opts.seed === undefined ? 1 : opts.seed) | 0;
  const rnd = mulberry32(seed);

  const state = {
    seed,
    rnd: seed,                 /* current rng cursor is re-derived, see nextRnd */
    rngCalls: 0,
    house,
    mode,
    /* seats alternate, so partners always sit opposite each other */
    teamOf: mode === 'teams'
      ? players.reduce((m, p, i) => { m[p.id] = i % 2 === 0 ? 'A' : 'B'; return m; }, {})
      : null,
    teamScores: mode === 'teams' ? { A: opts.teamScores ? opts.teamScores.A : 0, B: opts.teamScores ? opts.teamScores.B : 0 } : null,
    eliminated: (opts.eliminated || []).slice(),
    target: opts.target || 500,
    players,
    order: players.map(p => p.id),
    turn: 0,
    dir: house.randomDir ? (rnd() < 0.5 ? 1 : -1) : 1,
    draw: [],
    discard: [],
    color: null,
    pending: 0,               /* accumulated +2/+4 waiting to be taken */
    pendingKind: null,        /* 'd2' | 'wd4' — what may be stacked on it */
    drawnThisTurn: null,      /* card id the current player just drew */
    challenge: null,          /* { by, from, cardId } while a +4 can be challenged */
    phase: 'playing',
    roundWinner: null,
    winner: null,
    round: opts.round || 1,
    log: []
  };

  /* deal */
  const deck = shuffle(buildDeck(), rnd);
  for (let i = 0; i < 7; i++) for (const p of players) p.hand.push(deck.pop());

  /* first card — a +4 goes back and we flip another */
  let first = deck.pop();
  while (first.kind === 'wd4') {
    deck.unshift(first);
    shuffle(deck, rnd);
    first = deck.pop();
  }
  state.draw = deck;
  state.discard = [first];
  state.color = first.color === 'w' ? null : first.color;
  state.rngCalls = 0;
  state._rndState = seed ^ 0x9e3779b9;   /* separate stream for later reshuffles */

  const ev = [{ t: 'deal', first: first.id }];

  /* the very first card applies immediately */
  switch (first.kind) {
    case 'skip':
      ev.push({ t: 'skip', who: state.order[state.turn] });
      advance(state, 1);
      break;
    case 'rev':
      state.dir *= -1;
      ev.push({ t: 'reverse' });
      /* with the direction flipped, play starts at the dealer's other side */
      state.turn = (players.length + (state.dir === 1 ? -1 : 1)) % players.length;
      if (state.turn < 0) state.turn += players.length;
      break;
    case 'd2':
      ev.push({ t: 'forceDraw', who: state.order[state.turn], n: 2 });
      drawCards(state, currentPlayer(state), 2);
      advance(state, 1);
      break;
    case 'wild':
      state.color = null;            /* first player names it before playing */
      ev.push({ t: 'needColor', who: state.order[state.turn] });
      break;
  }
  state.log = ev;
  return state;
}

/* ---------- helpers ---------- */
function rndFor(state) {
  /* a fresh stream seeded from the state so reshuffles stay deterministic */
  const r = mulberry32((state._rndState ^ (state.rngCalls * 2654435761)) >>> 0);
  state.rngCalls++;
  return r;
}
export function currentPlayer(state) { return state.players.find(p => p.id === state.order[state.turn]); }
export function playerById(state, id) { return state.players.find(p => p.id === id); }
export function topCard(state) { return state.discard[state.discard.length - 1]; }
function seatOf(state, id) { return state.order.indexOf(id); }
function advance(state, steps = 1) {
  const n = state.order.length;
  state.turn = (((state.turn + state.dir * steps) % n) + n) % n;
}
function peekNext(state, steps = 1) {
  const n = state.order.length;
  return state.order[(((state.turn + state.dir * steps) % n) + n) % n];
}
function reshuffleIfNeeded(state) {
  if (state.draw.length) return;
  const top = state.discard.pop();
  const rest = state.discard;
  state.discard = [top];
  if (!rest.length) return;                 /* genuinely nothing left */
  state.draw = shuffle(rest.map(c => (isWild(c.kind) ? { ...c, color: 'w' } : c)), rndFor(state));
}
function drawCards(state, player, n) {
  const got = [];
  for (let i = 0; i < n; i++) {
    reshuffleIfNeeded(state);
    if (!state.draw.length) break;
    const c = state.draw.pop();
    player.hand.push(c);
    got.push(c);
  }
  if (player.hand.length > 1) player.said = false;
  return got;
}

/* ---------- legality ---------- */
export function cardPlayable(state, card, player) {
  const top = topCard(state);
  /* a pending draw stack narrows everything down */
  if (state.pending > 0) {
    if (!state.house.stack) return false;
    if (state.pendingKind === 'd2') return card.kind === 'd2';
    return card.kind === 'wd4';
  }
  /* A Wild Draw Four can always be put down. Official rules say you should
     only play it with no card of the current colour — but they also give the
     next player a challenge, which only makes sense if bluffing is possible.
     So we allow the play and let the challenge settle it. */
  if (card.kind === 'wd4') return true;
  if (card.kind === 'wild') return true;
  if (state.color === null) return true;              /* colour not yet named */
  if (card.color === state.color) return true;
  return card.kind === top.kind && !isWild(top.kind);
}

export function legalMoves(state, playerId) {
  const out = [];
  if (state.phase !== 'playing') return out;
  const me = playerById(state, playerId);
  if (!me) return out;

  /* anyone may catch a player who failed to call UNO */
  for (const p of state.players) {
    if (p.id !== playerId && p.hand.length === 1 && !p.said) out.push({ type: 'catch', targetId: p.id });
  }
  /* you shout UNO as you play your second-to-last card — and the shout is
     still valid a beat later, as long as nobody has caught you yet. So this
     is deliberately not gated on whose turn it is. */
  if (me.hand.length === 1 && !me.said) out.push({ type: 'sayUno' });
  /* the +4 challenge belongs to the player it was aimed at */
  if (state.challenge && state.challenge.by === playerId) {
    out.push({ type: 'challenge' });
    out.push({ type: 'accept' });
    return out;
  }
  /* jump-in: exact same colour and kind, out of turn */
  if (state.house.jumpIn && state.order[state.turn] !== playerId && state.pending === 0) {
    const top = topCard(state);
    for (const c of me.hand) {
      if (c.color === top.color && c.kind === top.kind && !isWild(c.kind)) {
        out.push({ type: 'play', cardId: c.id, jumpIn: true });
      }
    }
  }
  if (state.order[state.turn] !== playerId) return out;

  /* my turn */
  if (state.pending > 0) {
    for (const c of me.hand) if (cardPlayable(state, c, me)) out.push({ type: 'play', cardId: c.id });
    out.push({ type: 'takeStack' });
    return out;
  }
  if (state.drawnThisTurn) {
    const c = me.hand.find(x => x.id === state.drawnThisTurn);
    if (c && cardPlayable(state, c, me)) out.push({ type: 'play', cardId: c.id });
    out.push({ type: 'pass' });
    return out;
  }
  for (const c of me.hand) if (cardPlayable(state, c, me)) out.push({ type: 'play', cardId: c.id });
  out.push({ type: 'draw' });
  return out;
}

function hasLegal(state, player) {
  return player.hand.some(c => cardPlayable(state, c, player));
}

/* ---------- scoring ---------- */
export function handValue(player) {
  return player.hand.reduce((s, c) => s + cardValue(c.kind), 0);
}
function endRound(state, winner, events) {
  const detail = {};
  for (const p of state.players) if (p.id !== winner.id) detail[p.id] = handValue(p);
  state.roundWinner = winner.id;
  state.phase = 'roundEnd';

  if (state.mode === 'elimination') {
    /* nobody banks — whoever is left holding the most goes out */
    let worst = null, worstV = -1;
    for (const p of state.players) {
      if (p.id === winner.id) continue;
      const v = handValue(p);
      if (v > worstV || (v === worstV && worst && p.hand.length > worst.hand.length)) { worst = p; worstV = v; }
    }
    if (worst) {
      state.eliminated.push(worst.id);
      events.push({ t: 'eliminated', who: worst.id, value: worstV });
    }
    const left = state.players.filter(p => state.eliminated.indexOf(p.id) === -1);
    events.push({ t: 'roundEnd', winner: winner.id, total: 0, detail, eliminated: worst ? worst.id : null });
    if (left.length <= 1) {
      state.winner = left.length ? left[0].id : winner.id;
      state.phase = 'gameEnd';
      events.push({ t: 'gameEnd', winner: state.winner });
    }
    return;
  }

  if (state.mode === 'teams') {
    const team = state.teamOf[winner.id];
    let total = 0;
    for (const p of state.players) if (state.teamOf[p.id] !== team) total += handValue(p);
    state.teamScores[team] += total;
    /* mirror it onto the members so existing score displays keep working */
    for (const p of state.players) if (state.teamOf[p.id] === team) p.score = state.teamScores[team];
    events.push({ t: 'roundEnd', winner: winner.id, team, total, detail });
    if (state.teamScores[team] >= state.target) {
      state.winner = winner.id;
      state.winningTeam = team;
      state.phase = 'gameEnd';
      events.push({ t: 'gameEnd', winner: winner.id, team, score: state.teamScores[team] });
    }
    return;
  }

  let total = 0;
  for (const id of Object.keys(detail)) total += detail[id];
  winner.score += total;
  events.push({ t: 'roundEnd', winner: winner.id, total, detail });
  if (winner.score >= state.target) {
    state.winner = winner.id;
    state.phase = 'gameEnd';
    events.push({ t: 'gameEnd', winner: winner.id, score: winner.score });
  }
}

/* ==========================================================================
   apply
   ========================================================================== */
export function applyMove(state, playerId, move) {
  const s = clone(state);
  const events = [];
  const me = playerById(s, playerId);
  if (!me) throw new Error('no such player');
  if (s.phase !== 'playing') throw new Error('round is over');

  const ok = legalMoves(s, playerId).some(m => sameMove(m, move));
  if (!ok) throw new Error('illegal move: ' + JSON.stringify(move));

  switch (move.type) {

    case 'sayUno':
      me.said = true;
      events.push({ t: 'uno', who: me.id });
      break;

    case 'catch': {
      const victim = playerById(s, move.targetId);
      drawCards(s, victim, 4);
      victim.said = false;
      events.push({ t: 'caught', who: victim.id, by: me.id, n: 4 });
      break;
    }

    case 'challenge': {
      const ch = s.challenge;
      const accused = playerById(s, ch.from);
      /* was it a bluff? we kept the colour that was live when it was played */
      const bluffed = accused._preWd4Hand.some(c => c.color === ch.colorAtPlay);
      s.challenge = null;
      if (bluffed) {
        drawCards(s, accused, 4);
        events.push({ t: 'challengeWon', by: me.id, from: accused.id });
      } else {
        drawCards(s, me, 6);
        events.push({ t: 'challengeLost', by: me.id, from: accused.id });
      }
      s.pending = 0; s.pendingKind = null;
      advance(s, 1);                      /* the +4 target loses their turn either way */
      break;
    }

    case 'accept': {
      s.challenge = null;
      drawCards(s, me, s.pending || 4);
      events.push({ t: 'forceDraw', who: me.id, n: s.pending || 4 });
      s.pending = 0; s.pendingKind = null;
      advance(s, 1);
      break;
    }

    case 'takeStack': {
      drawCards(s, me, s.pending);
      events.push({ t: 'forceDraw', who: me.id, n: s.pending });
      s.pending = 0; s.pendingKind = null;
      advance(s, 1);
      break;
    }

    case 'draw': {
      const got = drawCards(s, me, 1);
      events.push({ t: 'drew', who: me.id, n: got.length });
      if (s.house.drawUntil) {
        let guard = 0;
        while (got.length && !cardPlayable(s, got[got.length - 1], me) && guard++ < 200) {
          const more = drawCards(s, me, 1);
          if (!more.length) break;
          got.push(more[0]);
        }
        events.push({ t: 'drewUntil', who: me.id, n: got.length });
      }
      const last = got[got.length - 1];
      if (last && cardPlayable(s, last, me)) s.drawnThisTurn = last.id;
      else { s.drawnThisTurn = null; advance(s, 1); }
      break;
    }

    case 'pass':
      s.drawnThisTurn = null;
      events.push({ t: 'passed', who: me.id });
      advance(s, 1);
      break;

    case 'play': {
      const idx = me.hand.findIndex(c => c.id === move.cardId);
      const card = me.hand[idx];
      if (move.jumpIn) {
        s.turn = seatOf(s, me.id);        /* play continues from the jumper */
        events.push({ t: 'jumpIn', who: me.id });
      }
      /* remember the hand before a +4 leaves it, for the challenge */
      if (card.kind === 'wd4') me._preWd4Hand = me.hand.filter(c => c.id !== card.id).map(c => ({ ...c }));

      me.hand.splice(idx, 1);
      s.drawnThisTurn = null;
      const played = isWild(card.kind) ? { ...card, color: 'w' } : card;
      s.discard.push(played);
      events.push({ t: 'played', who: me.id, card: played.id, kind: card.kind, color: card.color });

      if (isWild(card.kind)) {
        const chosen = COLORS.includes(move.color) ? move.color : COLORS[0];
        s.color = chosen;
        events.push({ t: 'color', who: me.id, color: chosen });
      } else {
        s.color = card.color;
      }

      /* going out */
      if (me.hand.length === 0) {
        /* a +2 or +4 as the last card still hits the next player */
        if (card.kind === 'd2') { drawCards(s, playerById(s, peekNext(s, 1)), 2); events.push({ t: 'forceDraw', who: peekNext(s, 1), n: 2 }); }
        if (card.kind === 'wd4') { drawCards(s, playerById(s, peekNext(s, 1)), 4); events.push({ t: 'forceDraw', who: peekNext(s, 1), n: 4 }); }
        endRound(s, me, events);
        return { state: s, events };
      }
      if (me.hand.length !== 1) me.said = false;

      /* effects */
      const twoPlayer = s.order.length === 2;
      switch (card.kind) {
        case 'skip':
          events.push({ t: 'skip', who: peekNext(s, 1) });
          advance(s, 2);
          break;
        case 'rev':
          if (twoPlayer) { events.push({ t: 'skip', who: peekNext(s, 1) }); advance(s, 2); }
          else { s.dir *= -1; events.push({ t: 'reverse' }); advance(s, 1); }
          break;
        case 'd2':
          s.pending += 2; s.pendingKind = 'd2';
          advance(s, 1);
          if (!s.house.stack || !hasStackable(s)) {
            const v = currentPlayer(s);
            drawCards(s, v, s.pending);
            events.push({ t: 'forceDraw', who: v.id, n: s.pending });
            s.pending = 0; s.pendingKind = null;
            advance(s, 1);
          }
          break;
        case 'wd4':
          s.pending += 4; s.pendingKind = 'wd4';
          advance(s, 1);
          if (!s.house.noBluff) {
            s.challenge = { by: s.order[s.turn], from: me.id, cardId: card.id, colorAtPlay: colorBefore(s) };
            events.push({ t: 'challengeOpen', by: s.order[s.turn], from: me.id });
          } else if (!s.house.stack || !hasStackable(s)) {
            const v = currentPlayer(s);
            drawCards(s, v, s.pending);
            events.push({ t: 'forceDraw', who: v.id, n: s.pending });
            s.pending = 0; s.pendingKind = null;
            advance(s, 1);
          }
          break;
        case '7':
          if (s.house.seven0) {
            const other = playerById(s, move.target) || playerById(s, peekNext(s, 1));
            const tmp = me.hand; me.hand = other.hand; other.hand = tmp;
            events.push({ t: 'swap', a: me.id, b: other.id });
            advance(s, 1);
          } else advance(s, 1);
          break;
        case '0':
          if (s.house.seven0) {
            const hands = s.order.map(id => playerById(s, id).hand);
            const rotated = s.dir === 1 ? [hands[hands.length - 1], ...hands.slice(0, -1)]
                                        : [...hands.slice(1), hands[0]];
            s.order.forEach((id, i) => { playerById(s, id).hand = rotated[i]; });
            events.push({ t: 'rotate', dir: s.dir });
            advance(s, 1);
          } else advance(s, 1);
          break;
        default:
          advance(s, 1);
      }
      break;
    }

    default:
      throw new Error('unknown move');
  }
  return { state: s, events };
}

function colorBefore(s) {
  /* the colour that was in force just before the +4 landed */
  for (let i = s.discard.length - 2; i >= 0; i--) {
    const c = s.discard[i];
    if (c.color !== 'w') return c.color;
  }
  return null;
}
function hasStackable(s) {
  const p = currentPlayer(s);
  if (!p) return false;
  return p.hand.some(c => (s.pendingKind === 'd2' ? c.kind === 'd2' : c.kind === 'wd4'));
}
function sameMove(a, b) {
  if (!b || a.type !== b.type) return false;
  if (a.type === 'play') return a.cardId === b.cardId && !!a.jumpIn === !!b.jumpIn;
  if (a.type === 'catch') return a.targetId === b.targetId;
  return true;
}
function clone(s) {
  return JSON.parse(JSON.stringify(s));
}

/* ==========================================================================
   start the next round — same players, scores carried, fresh deal
   ========================================================================== */
export function nextRound(state, opts = {}) {
  /* winner-stays-on hands us a new roster; elimination just drops the fallen */
  let roster = opts.players
    ? opts.players.map(p => ({ id: p.id, name: p.name, score: p.score || 0 }))
    : state.players
        .filter(p => state.eliminated.indexOf(p.id) === -1)
        .map(p => ({ id: p.id, name: p.name, score: p.score }));
  const s = createGame({
    players: roster,
    seed: (state.seed * 1103515245 + 12345) >>> 0,
    house: state.house,
    mode: opts.players ? 'classic' : state.mode,
    teamScores: state.teamScores,
    target: state.target,
    round: state.round + 1
  });
  /* the previous round's winner deals, so the seat after them starts */
  if (state.roundWinner) {
    const w = s.order.indexOf(state.roundWinner);
    if (w >= 0) s.turn = (w + (s.dir === 1 ? 1 : s.order.length - 1)) % s.order.length;
  }
  return s;
}

/* ==========================================================================
   what one player is allowed to see
   ========================================================================== */
export function viewFor(state, playerId) {
  const me = playerById(state, playerId);
  return {
    round: state.round,
    phase: state.phase,
    target: state.target,
    house: state.house,
    mode: state.mode,
    teamOf: state.teamOf,
    teamScores: state.teamScores,
    eliminated: state.eliminated,
    winningTeam: state.winningTeam || null,
    turn: state.order[state.turn],
    dir: state.dir,
    color: state.color,
    pending: state.pending,
    pendingKind: state.pendingKind,
    challenge: state.challenge ? { by: state.challenge.by, from: state.challenge.from } : null,
    drawnThisTurn: state.order[state.turn] === playerId ? state.drawnThisTurn : null,
    drawCount: state.draw.length,
    top: topCard(state),
    you: me ? { id: me.id, name: me.name, hand: me.hand, said: me.said, score: me.score } : null,
    players: state.order.map(id => {
      const p = playerById(state, id);
      return { id: p.id, name: p.name, count: p.hand.length, said: p.said, score: p.score, connected: p.connected };
    }),
    roundWinner: state.roundWinner,
    winner: state.winner,
    moves: legalMoves(state, playerId)
  };
}

/* a tiny bot, handy for testing and for filling an empty seat */
export function botMove(state, playerId, rnd = Math.random) {
  const ms = legalMoves(state, playerId);
  if (!ms.length) return null;
  const plays = ms.filter(m => m.type === 'play');
  const say = ms.find(m => m.type === 'sayUno');
  if (say) return say;                                  /* never forget UNO */
  if (plays.length) {
    const m = plays[Math.floor(rnd() * plays.length)];
    const me = playerById(state, playerId);
    const card = me.hand.find(c => c.id === m.cardId);
    if (card && isWild(card.kind)) {
      const counts = {};
      me.hand.forEach(c => { if (c.color !== 'w') counts[c.color] = (counts[c.color] || 0) + 1; });
      const best = COLORS.slice().sort((a, b) => (counts[b] || 0) - (counts[a] || 0))[0];
      return { ...m, color: best };
    }
    if (card && card.kind === '7' && state.house.seven0) {
      const others = state.players.filter(p => p.id !== playerId).sort((a, b) => a.hand.length - b.hand.length);
      return { ...m, target: others[0] && others[0].id };
    }
    return m;
  }
  const order = ['accept', 'takeStack', 'draw', 'pass', 'catch', 'challenge'];
  for (const t of order) { const m = ms.find(x => x.type === t); if (m) return m; }
  return ms[0];
}
