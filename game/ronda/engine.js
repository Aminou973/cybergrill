/* ==========================================================================
   RONDA — and Makla, its café cousin.
   --------------------------------------------------------------------------
   Built from cybergrill/ronda-rules.md, which is Amin's own account of how his
   table plays it. That file is the source of truth: corrections go there
   first, and then here. Where the written rules did not cover a case I have
   said so in a comment rather than quietly inventing something — look for
   "EXTRAPOLATED" and check those against a real game.

   The one thing to hold in your head: the ranks run

        1 2 3 4 5 6 7 10 11 12

   with no 8 and no 9, so **7 and 10 are neighbours**. Sequences cross that
   join. Suits exist on the cards and mean nothing to the rules.
   ========================================================================== */

export const META = {
  id: 'ronda',
  name: 'Ronda',
  icon: '🃏',
  blurb: 'The Algerian card game. Match a rank, sweep the run behind it, count to 41.',
  min: 2,
  max: 4,
  exactCounts: [2, 4],          /* two head to head, or four in two pairs */
  evenOnly: true,
  path: 'ronda/'
};

/* the deck, in the only order that matters */
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
export const SUITS = ['o', 'c', 'e', 'b'];        /* oros, copas, espadas, bastos */
export const SUIT_NAME = { o: 'OROS', c: 'COPAS', e: 'ESPADAS', b: 'BASTOS' };
export const RANK_NAME = { 10: 'SOTA', 11: 'CABALLO', 12: 'REY' };
export const TARGET = 41;
export const BREAK_EVEN = 20;   /* forty cards, so twenty is nobody's */

export const ord = r => RANKS.indexOf(r);
export const nextRank = r => { const i = ord(r); return i >= 0 && i < RANKS.length - 1 ? RANKS[i + 1] : null; };

export const VARIANTS = ['ronda', 'makla'];
export const DEFAULT_HOUSE = {
  variant: 'ronda',
  darbaTalk: true,   /* Makla only: still call the darba, just for the insult */
  missaLastHand: false
};

export const SCORES = { ronda: 1, tringa: 5, darba: 1, khamsa: 5, ashra: 10, missa: 1 };

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clone = s => JSON.parse(JSON.stringify(s));

export function buildDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ id: s + r, rank: r, suit: s });
  return d;
}
function shuffle(cards, rnd) {
  const a = cards.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function playerById(state, id) { return state.players.find(p => p.id === id); }
export function currentPlayer(state) { return playerById(state, state.order[state.turn]); }
export function teamOf(state, id) { const p = playerById(state, id); return p ? p.team : null; }
export function teamMates(state, team) { return state.players.filter(p => p.team === team); }

/* ==========================================================================
   the deal
   ========================================================================== */

/* The clean table rule. The four face-up cards must not contain a pair, and
   must not be a four-card run. Whichever it is, the offending card goes back
   into the deck and a fresh one comes out. Repeat until the table is dead. */
export function cleanTable(deck, table, events) {
  let guard = 0;
  while (guard++ < 60) {
    /* a pair — the second one of the two goes back */
    let cut = -1;
    outer:
    for (let i = 0; i < table.length; i++) {
      for (let j = i + 1; j < table.length; j++) {
        if (table[i].rank === table[j].rank) { cut = j; break outer; }
      }
    }
    /* otherwise, four in an unbroken run — the last one of the run goes back */
    if (cut < 0 && table.length === 4) {
      const byOrd = table.map((c, i) => ({ i, o: ord(c.rank) })).sort((a, b) => a.o - b.o);
      let run = true;
      for (let k = 1; k < byOrd.length; k++) if (byOrd[k].o !== byOrd[k - 1].o + 1) { run = false; break; }
      if (run) cut = byOrd[byOrd.length - 1].i;
    }
    if (cut < 0) return;
    if (!deck.length) return;
    const buried = table[cut];
    table[cut] = deck.shift();
    deck.push(buried);                       /* back into the deck, at the bottom */
    if (events) events.push({ t: 'bury', card: buried, drew: table[cut] });
  }
}

export function createGame(opts = {}) {
  const list = (opts.players || []).slice(0, META.max);
  if (list.length !== 2 && list.length !== 4) throw new Error('ronda is played two-handed or four in two pairs');
  const house = { ...DEFAULT_HOUSE, ...(opts.house || {}) };
  if (!VARIANTS.includes(house.variant)) house.variant = 'ronda';
  const seed = (opts.seed === undefined ? 1 : opts.seed) >>> 0;
  const rnd = mulberry32(seed);

  /* seats alternate, so in a four-hander your partner is opposite you */
  const players = list.map((p, i) => ({
    id: p.id, name: p.name, seat: i,
    team: list.length === 4 ? (i % 2 === 0 ? 'A' : 'B') : (i === 0 ? 'A' : 'B'),
    hand: [], pile: [], score: p.score || 0, connected: true
  }));

  const s = {
    game: 'ronda',
    variant: house.variant,
    players,
    order: players.map(p => p.id),
    /* Play starts to the dealer's right and goes anti-clockwise. We put the
       seats in that order to begin with, so "the next seat" is simply +1 and
       the board can draw them the way they sit. */
    turn: 0,
    dir: 1,
    dealer: players[players.length - 1].id,
    deck: shuffle(buildDeck(), rnd),
    table: [],
    pending: [],                 /* what the last capture took, for the animation */
    phase: 'playing',
    house,
    seed,
    lastCapture: null,           /* who sweeps at the end — Bawesh */
    lastPlay: null,              /* {who, card, captured} — a darba needs this */
    chain: null,                 /* {rank, team, stage} — darba, then b'khamsa, then b'ashra */
    hand: 0,                     /* which set of three we are on */
    round: opts.round || 1,
    target: house.variant === 'makla' ? 0 : (opts.target || TARGET),
    teamScores: { A: 0, B: 0 },
    calls: [],                   /* the announcements of the current hand */
    roundWinner: null,
    winner: null
  };
  /* carry the match score in on the team, not the player */
  players.forEach(p => { s.teamScores[p.team] = Math.max(s.teamScores[p.team], p.score || 0); });

  const events = [];
  s.table = s.deck.splice(0, 4);
  cleanTable(s.deck, s.table, events);
  dealHands(s, events);
  s.openingEvents = events;
  return s;
}

function dealHands(s, events) {
  s.hand++;
  for (const p of s.players) p.hand = s.deck.splice(0, 3);
  events.push({ t: 'deal', hand: s.hand, left: s.deck.length });
  s.calls = [];
  if (s.variant === 'ronda') announce(s, events);
}

/* ==========================================================================
   Ronda and Tringa, called the moment a hand is dealt
   --------------------------------------------------------------------------
   The rules cover: a pair is 1, three of a kind is 5, opposing Rondas mean the
   higher pair takes both points, equal rank splits, and a Tringa always beats
   a Ronda.

   EXTRAPOLATED, because the rules do not say and it cannot come up often:
     * two Tringas of different ranks — the higher scores its 5, the other
       nothing. It does not double the way Rondas do, because "takes both
       points" was said of Rondas specifically.
     * three or more Rondas — the pot is one point per caller and the highest
       rank takes the lot, which is the same rule stretched.
   ========================================================================== */
function announce(s, events) {
  const calls = [];
  for (const p of s.players) {
    const byRank = {};
    p.hand.forEach(c => { byRank[c.rank] = (byRank[c.rank] || 0) + 1; });
    let best = null;
    for (const r of Object.keys(byRank)) {
      const n = byRank[r], rank = +r;
      if (n >= 3) { best = { kind: 'tringa', rank }; break; }
      if (n === 2 && (!best || ord(rank) > ord(best.rank))) best = { kind: 'ronda', rank };
    }
    if (best) calls.push({ who: p.id, team: p.team, ...best });
  }
  s.calls = calls;
  if (!calls.length) return;

  const tringas = calls.filter(c => c.kind === 'tringa');
  if (tringas.length) {
    const top = tringas.slice().sort((a, b) => ord(b.rank) - ord(a.rank))[0];
    s.teamScores[top.team] += SCORES.tringa;
    events.push({ t: 'call', kind: 'tringa', who: top.who, team: top.team, rank: top.rank, points: SCORES.tringa });
    calls.filter(c => c !== top).forEach(c =>
      events.push({ t: 'call', kind: c.kind, who: c.who, team: c.team, rank: c.rank, points: 0, beaten: true }));
    return;
  }

  const pot = calls.length;                       /* one point per caller */
  const topOrd = Math.max(...calls.map(c => ord(c.rank)));
  const winners = calls.filter(c => ord(c.rank) === topOrd);
  const each = Math.floor(pot / winners.length);
  calls.forEach(c => {
    const won = winners.indexOf(c) !== -1;
    const pts = won ? each : 0;
    if (pts) s.teamScores[c.team] += pts;
    events.push({ t: 'call', kind: 'ronda', who: c.who, team: c.team, rank: c.rank, points: pts, beaten: !won });
  });
}

/* ==========================================================================
   what you may do
   ========================================================================== */
export function legalMoves(state, playerId) {
  if (state.phase !== 'playing') return [];
  if (state.order[state.turn] !== playerId) return [];
  const me = playerById(state, playerId);
  if (!me) return [];
  /* You play exactly one card. There is never a choice about whether to
     capture — if the rank is on the table, it comes to you. */
  return me.hand.map(c => ({ type: 'play', cardId: c.id }));
}

/* what a card of this rank would take off this table */
export function captureWith(table, rank) {
  const i = table.findIndex(c => c.rank === rank);
  if (i < 0) return [];
  const taken = [table[i]];
  let r = rank;
  for (; ;) {
    r = nextRank(r);
    if (r === null) break;
    const j = table.findIndex(c => c.rank === r && taken.indexOf(c) === -1);
    if (j < 0) break;
    taken.push(table[j]);
  }
  return taken;
}

/* ==========================================================================
   playing a card
   ========================================================================== */
export function applyMove(state, playerId, move) {
  const s = clone(state);
  const events = [];
  if (s.phase !== 'playing') throw new Error('the round is over');
  if (s.order[s.turn] !== playerId) throw new Error('not your turn');
  if (!move || move.type !== 'play') throw new Error('play a card');
  const me = playerById(s, playerId);
  const idx = me.hand.findIndex(c => c.id === move.cardId);
  if (idx < 0) throw new Error('that card is not in your hand');
  const card = me.hand.splice(idx, 1)[0];

  const taken = captureWith(s.table, card.rank);
  const beforeCount = s.table.length;
  let justDarba = false;

  if (taken.length) {
    s.table = s.table.filter(c => taken.indexOf(c) === -1);
    me.pile.push(card, ...taken);
    s.lastCapture = me.id;
    s.pending = [card, ...taken];
    events.push({ t: 'capture', who: me.id, card, taken, run: taken.length > 1 });

    /* Darba — the player right before you left this exact card, and you have
       just taken it back with the same rank. */
    const lp = s.lastPlay;
    const darba = lp && !lp.captured && lp.card.rank === card.rank &&
      taken.some(c => c.id === lp.card.id) && teamOf(s, lp.who) !== me.team;
    if (darba) {
      justDarba = true;
      const pts = s.variant === 'ronda' ? SCORES.darba : 0;
      if (pts) s.teamScores[me.team] += pts;
      s.chain = { rank: card.rank, team: me.team, stage: 1 };
      events.push({ t: 'darba', who: me.id, team: me.team, rank: card.rank, points: pts });
    }

    /* Missa — the capture cleared the table. Not on the last hand, when the
       sweep would have taken it anyway. */
    if (s.table.length === 0 && beforeCount > 0 && s.variant === 'ronda') {
      /* "the last hand of the round" is the last *deal*, not the last play:
         once the deck is empty no more threes are coming, and whatever is left
         on the table goes to the sweep anyway. */
      const lastHand = s.deck.length === 0;
      if (!lastHand || s.house.missaLastHand) {
        s.teamScores[me.team] += SCORES.missa;
        events.push({ t: 'missa', who: me.id, team: me.team, points: SCORES.missa });
      } else {
        events.push({ t: 'missa', who: me.id, team: me.team, points: 0, lastHand: true });
      }
    }
  } else {
    s.table.push(card);
    s.pending = [];
    events.push({ t: 'drop', who: me.id, card });
  }

  /* the chain that runs on from a darba: the third card of that rank, then the
     fourth. It is the darba team's chain; if the other side plays that rank
     first, it is broken. */
  /* The chain that runs on from a darba, and it is one side's chain: they took
     the second card of the rank, they drop the third, they play the fourth.
     If the other side gets in first the chain is dead — though taking a
     just-dropped card back is a darba of their own, which is handled above and
     starts a new chain rather than continuing this one.

     EXTRAPOLATED: the rules say the b'ashra is "the fourth card of that rank
     straight after a b'khamsa" without saying who plays it. Requiring the same
     team is what makes the b'khamsa a gamble worth taking, so that is what
     this does. Worth checking at a real table. */
  if (s.chain && card.rank === s.chain.rank && !justDarba) {
    if (me.team !== s.chain.team) {
      events.push({ t: 'chainBroken', rank: s.chain.rank, by: me.id });
      s.chain = null;
    } else if (s.chain.stage === 1) {
      const pts = s.variant === 'ronda' ? SCORES.khamsa : 0;
      s.teamScores[me.team] += pts;
      events.push({ t: 'khamsa', who: me.id, team: me.team, rank: card.rank, points: pts });
      s.chain.stage = 2;
    } else {
      const pts = s.variant === 'ronda' ? SCORES.ashra : 0;
      s.teamScores[me.team] += pts;
      events.push({ t: 'ashra', who: me.id, team: me.team, rank: card.rank, points: pts });
      s.chain = null;
    }
  }

  s.lastPlay = { who: me.id, card, captured: taken.length > 0 };

  /* everybody out of cards? three more each, and nothing new on the table */
  if (s.players.every(p => p.hand.length === 0)) {
    if (s.deck.length >= s.players.length * 3) {
      dealHands(s, events);
    } else {
      endRound(s, events);
      return { state: s, events };
    }
  }

  s.turn = (s.turn + 1) % s.order.length;
  return { state: s, events };
}

/* ==========================================================================
   the end of a round
   ========================================================================== */
function endRound(s, events) {
  /* Bawesh — whoever captured last sweeps what is left */
  if (s.table.length) {
    const who = s.lastCapture || s.order[s.turn];
    const p = playerById(s, who);
    p.pile.push(...s.table);
    events.push({ t: 'bawesh', who, cards: s.table.slice() });
    s.table = [];
  }

  const counts = { A: 0, B: 0 };
  s.players.forEach(p => { counts[p.team] += p.pile.length; });

  const gained = { A: Math.max(0, counts.A - BREAK_EVEN), B: Math.max(0, counts.B - BREAK_EVEN) };
  if (s.variant === 'ronda') {
    s.teamScores.A += gained.A;
    s.teamScores.B += gained.B;
  }
  events.push({ t: 'count', counts, gained, teamScores: { ...s.teamScores } });

  /* mirror the team score onto each player so the shared table code can show it */
  s.players.forEach(p => { p.score = s.teamScores[p.team]; });

  s.phase = 'roundEnd';
  s.roundWinner = counts.A === counts.B ? null : (counts.A > counts.B ? 'A' : 'B');

  if (s.variant === 'makla') {
    /* one hand, count, done — no running total */
    s.winner = s.roundWinner;
    s.phase = 'gameEnd';
    events.push({ t: 'gameEnd', team: s.winner, counts, draw: s.roundWinner === null });
    return;
  }
  const top = s.teamScores.A >= s.teamScores.B ? 'A' : 'B';
  if (s.teamScores[top] >= s.target) {
    s.winner = top;
    s.phase = 'gameEnd';
    events.push({ t: 'gameEnd', team: top, score: s.teamScores[top] });
  }
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
  s.teamScores = { ...state.teamScores };
  s.players.forEach(p => { p.score = s.teamScores[p.team]; });
  /* the deal passes on */
  const d = state.order.indexOf(state.dealer);
  s.dealer = s.order[(d + 1) % s.order.length];
  return s;
}

/* ==========================================================================
   what a player is allowed to see
   --------------------------------------------------------------------------
   Your own three cards, the table, and everybody's counts. Captured piles are
   face down and stay that way — a player may remember what went into them,
   which is part of the game, but the server will not do the remembering for
   them.
   ========================================================================== */
export function viewFor(state, playerId) {
  const me = playerById(state, playerId);
  return {
    game: 'ronda',
    variant: state.variant,
    round: state.round,
    hand: state.hand,
    phase: state.phase,
    target: state.target,
    house: state.house,
    turn: state.order[state.turn],
    dir: state.dir,
    dealer: state.dealer,
    table: state.table.slice(),
    deckCount: state.deck.length,
    teamScores: { ...state.teamScores },
    calls: state.calls.slice(),
    chain: state.chain ? { ...state.chain } : null,
    lastPlay: state.lastPlay ? { who: state.lastPlay.who, card: state.lastPlay.card, captured: state.lastPlay.captured } : null,
    lastCapture: state.lastCapture,
    you: me ? { id: me.id, name: me.name, team: me.team, seat: me.seat, hand: me.hand.slice(), pile: me.pile.length } : null,
    players: state.order.map(id => {
      const p = playerById(state, id);
      return {
        id: p.id, name: p.name, team: p.team, seat: p.seat,
        count: p.hand.length, pile: p.pile.length, score: p.score, connected: p.connected
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
  if (!BOT_LEVELS.includes(level)) level = 'normal';
  const me = playerById(state, playerId);
  const card = id => me.hand.find(c => c.id === id);
  if (level === 'easy') return ms[Math.floor(rnd() * ms.length)];

  const scored = ms.map(m => {
    const c = card(m.cardId);
    if (!c) return null;
    const taken = captureWith(state.table, c.rank);
    let sc = taken.length * 12;
    if (taken.length && state.table.length === taken.length && state.variant === 'ronda') sc += 9;   /* missa */

    /* a darba is worth taking the moment it is on offer */
    const lp = state.lastPlay;
    if (taken.length && lp && !lp.captured && lp.card.rank === c.rank && teamOf(state, lp.who) !== me.team) sc += 10;
    /* and so is carrying on a chain we started */
    if (state.chain && state.chain.rank === c.rank && state.chain.team === me.team) sc += 14;

    if (!taken.length) {
      /* Leaving a card is a gift if the rank is still out there. Count what we
         can honestly see — our own hand and the table — and drop the rank that
         is least likely to be sitting in somebody else's three. */
      const seen = me.hand.filter(x => x.rank === c.rank).length + state.table.filter(x => x.rank === c.rank).length;
      sc -= 6 - seen * 2;
      /* and a low card left behind is a smaller loss than a high one, because
         a run sweeps upward from wherever it starts */
      sc -= (RANKS.length - ord(c.rank)) * 0.25;
    }
    if (level === 'normal') sc += rnd() * 7;
    return { m, sc };
  }).filter(Boolean).sort((a, b) => b.sc - a.sc);

  return scored.length ? scored[0].m : ms[0];
}
