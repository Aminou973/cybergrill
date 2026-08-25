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
  exactCounts: [2, 3, 4],       /* two head to head, three each for themselves, or four in two pairs */
  evenOnly: false,
  targets: [21, 41, 51],        /* the short game, the real one, and the long haul */
  /* phases in which somebody still owes the table a move: the calling phase
     is one, and a bot sitting in it will stall the room if nobody says so */
  livePhases: ['playing', 'calling'],
  defaultTarget: 41,
  path: 'ronda/'
};

/* the deck, in the only order that matters */
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
export const SUITS = ['o', 'c', 'e', 'b'];        /* oros, copas, espadas, bastos */
export const SUIT_NAME = { o: 'OROS', c: 'COPAS', e: 'ESPADAS', b: 'BASTOS' };
export const RANK_NAME = { 10: 'SOTA', 11: 'CABALLO', 12: 'REY' };
export const TARGET = 41;
/* Forty cards, so with two or four players twenty is nobody's. Three players
   split it three ways and thirteen is the neutral share. */
export const BREAK_EVEN = 20;
export const BREAK_EVEN_3 = 13;
export const breakEven = n => (n === 3 ? BREAK_EVEN_3 : BREAK_EVEN);

export const ord = r => RANKS.indexOf(r);
export const nextRank = r => { const i = ord(r); return i >= 0 && i < RANKS.length - 1 ? RANKS[i + 1] : null; };

export const VARIANTS = ['ronda', 'makla'];
export const DEFAULT_HOUSE = {
  variant: 'ronda',
  darbaTalk: true,     /* Makla only: still call the darba, just for the insult */
  missaLastHand: false,
  qaa: true,           /* the king-or-ace bonus on the very last card dealt */
  conceal: true        /* you may sit on a weak ronda — and pay if you are caught */
};

export const SCORES = {
  ronda: 1, tringa: 5,
  darba: 1, khamsa: 5, ashra: 10,
  missa: 1,
  qaaRey: 5, qaaAs: 5,       /* the last card of the deck, if it is a king or an ace */
  conceal: 1                 /* what your opponents get for a ronda you sat on */
};

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
  if (META.exactCounts.indexOf(list.length) === -1)
    throw new Error('ronda is played two-handed, three for themselves, or four in two pairs');
  const house = { ...DEFAULT_HOUSE, ...(opts.house || {}) };
  if (!VARIANTS.includes(house.variant)) house.variant = 'ronda';
  const seed = (opts.seed === undefined ? 1 : opts.seed) >>> 0;
  const rnd = mulberry32(seed);

  /* Seats alternate, so in a four-hander your partner sits opposite you. With
     two or three, everybody is their own team — the rest of the engine only
     ever talks about teams, so nothing else has to know the difference. */
  const TEAM_ID = ['A', 'B', 'C', 'D'];
  const players = list.map((p, i) => ({
    id: p.id, name: p.name, seat: i,
    team: list.length === 4 ? (i % 2 === 0 ? 'A' : 'B') : TEAM_ID[i],
    hand: [], pile: [], score: p.score || 0, connected: true
  }));
  const teams = [...new Set(players.map(p => p.team))];

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
    teams,
    lastCapture: null,           /* who sweeps at the end — Bawesh */
    lastPlay: null,              /* {who, card, captured} — a darba needs this */
    chain: null,                 /* {rank, stage} — darba, then b'khamsa, then b'ashra */
    hand: 0,                     /* which set of three we are on */
    round: opts.round || 1,
    target: house.variant === 'makla' ? 0
      : (META.targets.indexOf(opts.target) !== -1 ? opts.target : TARGET),
    teamScores: {},
    calls: [],                   /* the announcements of the current hand */
    pendingCalls: [],            /* who still has to speak up, or keep quiet */
    concealed: {},               /* pairs somebody decided to sit on */
    playTurn: 0,                 /* where play resumes once everybody has spoken */
    lastDeal: false,             /* the dealer has to say when the deck is finishing */
    roundWinner: null,
    winner: null
  };
  teams.forEach(t => { s.teamScores[t] = 0; });
  /* carry the match score in on the team, not the player */
  players.forEach(p => { s.teamScores[p.team] = Math.max(s.teamScores[p.team], p.score || 0); });

  const events = [];
  s.table = s.deck.splice(0, 4);
  cleanTable(s.deck, s.table, events);
  dealHands(s, events);
  s.openingEvents = events;
  return s;
}

/* Deal three each, going round to the dealer last. That matters: the very last
   card of the deck lands in the dealer's hand, and on the final deal it is
   worth five points to somebody. */
function dealHands(s, events) {
  s.hand++;
  const d = s.order.indexOf(s.dealer);
  const round = [];
  for (let k = 1; k <= s.order.length; k++) round.push(s.order[(d + k) % s.order.length]);
  s.lastDeal = s.deck.length <= s.order.length * 3;
  if (s.lastDeal) events.push({ t: 'lastDeal', who: s.dealer });   /* the dealer's warning */

  let last = null;
  for (const id of round) {
    const p = playerById(s, id);
    p.hand = s.deck.splice(0, 3);
    if (p.hand.length) last = { card: p.hand[p.hand.length - 1], who: id };
  }
  events.push({ t: 'deal', hand: s.hand, left: s.deck.length, lastDeal: s.lastDeal });

  /* Qa'a — the bottom of the deck. A king for the dealer's side, an ace
     against them. Only on the deal that empties the deck. */
  if (s.variant === 'ronda' && s.house.qaa && s.lastDeal && s.deck.length === 0 && last && last.who === s.dealer) {
    const c = last.card;
    if (c.rank === 12) {
      const t = playerById(s, s.dealer).team;
      s.teamScores[t] += SCORES.qaaRey;
      events.push({ t: 'qaa', kind: 'rey', who: s.dealer, team: t, card: c, points: SCORES.qaaRey });
    } else if (c.rank === 1) {
      /* against the dealer. Two or four players means the other side; with
         three there is no "other side", so it goes to whoever leads the round
         — the seat to the dealer's right. EXTRAPOLATED. */
      const dealerTeam = playerById(s, s.dealer).team;
      const others = s.teams.filter(t => t !== dealerTeam);
      const to = others.length === 1 ? others : [playerById(s, round[0]).team];
      to.forEach(t => { s.teamScores[t] += SCORES.qaaAs; });
      events.push({ t: 'qaa', kind: 'as', who: s.dealer, team: to.join('+'), card: c, points: SCORES.qaaAs });
    }
  }

  s.calls = [];
  s.pendingCalls = [];
  if (s.variant === 'ronda') openCalls(s, events, round);
}

/* what is in a hand worth calling */
export function callable(hand) {
  const byRank = {};
  hand.forEach(c => { byRank[c.rank] = (byRank[c.rank] || 0) + 1; });
  let best = null;
  for (const r of Object.keys(byRank)) {
    const n = byRank[r], rank = +r;
    if (n >= 3) { best = { kind: 'tringa', rank }; break; }
    if (n === 2 && (!best || ord(rank) > ord(best.rank))) best = { kind: 'ronda', rank };
  }
  if (!best) return null;
  best.ids = hand.filter(c => c.rank === best.rank).map(c => c.id);
  return best;
}

/* ==========================================================================
   Ronda and Tringa
   --------------------------------------------------------------------------
   You must say it out loud before the first card of the hand — and you may
   choose not to. Sitting on a weak pair keeps a point away from somebody
   holding a better one, and costs you nothing unless you are caught playing
   it, which is what makes it worth doing.
   ========================================================================== */
function openCalls(s, events, round) {
  s.playTurn = s.turn;
  const pending = round.filter(id => callable(playerById(s, id).hand));
  if (!pending.length) return;
  s.pendingCalls = pending;
  s.phase = 'calling';
  s.turn = s.order.indexOf(pending[0]);
  events.push({ t: 'callTime', who: pending.slice() });
}

/* everybody has spoken; work out what the calls are worth */
function resolveCalls(s, events) {
  const calls = s.calls;
  s.phase = 'playing';
  s.turn = s.playTurn;
  s.pendingCalls = [];
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
  const me = playerById(state, playerId);
  if (!me) return [];
  if (state.order[state.turn] !== playerId) return [];

  /* before the first card, anybody holding a pair has to speak — or not */
  if (state.phase === 'calling') {
    const has = callable(me.hand);
    if (!has) return [];
    return [
      { type: 'call', kind: has.kind, rank: has.rank },
      { type: 'hide' }
    ];
  }
  if (state.phase !== 'playing') return [];
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
  if (s.order[s.turn] !== playerId) throw new Error('not your turn');
  if (!move || !move.type) throw new Error('no move given');
  const me = playerById(s, playerId);
  if (!me) throw new Error('no such player');

  /* ---- speaking up, or deciding not to ---- */
  if (s.phase === 'calling') {
    const has = callable(me.hand);
    if (!has) throw new Error('you have nothing to call');
    if (move.type === 'call') {
      s.calls.push({ who: me.id, team: me.team, kind: has.kind, rank: has.rank });
      events.push({ t: 'called', who: me.id, kind: has.kind, rank: has.rank });
    } else if (move.type === 'hide') {
      if (!s.house.conceal) throw new Error('you have to call it at this table');
      s.concealed[me.id] = { kind: has.kind, rank: has.rank, ids: has.ids.slice(), played: 0 };
      events.push({ t: 'hidden', who: me.id });
    } else throw new Error('call it or keep quiet');

    s.pendingCalls = s.pendingCalls.filter(id => id !== me.id);
    if (s.pendingCalls.length) s.turn = s.order.indexOf(s.pendingCalls[0]);
    else resolveCalls(s, events);
    return { state: s, events };
  }

  if (s.phase !== 'playing') throw new Error('the round is over');
  if (move.type !== 'play') throw new Error('play a card');
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
    const darba = !s.chain && lp && !lp.captured && lp.card.rank === card.rank &&
      taken.some(c => c.id === lp.card.id) && teamOf(s, lp.who) !== me.team;
    if (darba) {
      justDarba = true;
      const pts = s.variant === 'ronda' ? SCORES.darba : 0;
      if (pts) s.teamScores[me.team] += pts;
      s.chain = { rank: card.rank, stage: 1 };
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
  /* The escalation, and it runs round the table rather than belonging to one
     side. A drops a four; B takes it back and calls darba, 1. If the very next
     player lays the third four, that is b'khamsa, 5, to them. If the one after
     that lays the fourth, b'ashra, 10, to them. Anything else and it is over.
     Each step pays whoever played the card, which is why in a four-hander the
     points alternate between the teams. */
  if (s.chain && !justDarba) {
    if (card.rank !== s.chain.rank) {
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

  /* Caught sitting on a ronda. Play the second card of a pair you kept quiet
     about and the table can see it — a point to everybody else. */
  const hid = s.concealed[me.id];
  if (hid && hid.ids.indexOf(card.id) !== -1) {
    hid.played++;
    if (hid.played >= 2) {
      const pts = SCORES.conceal;
      s.teams.filter(t => t !== me.team).forEach(t => { s.teamScores[t] += pts; });
      events.push({ t: 'caught', who: me.id, kind: hid.kind, rank: hid.rank, points: pts });
      delete s.concealed[me.id];
    }
  }

  s.lastPlay = { who: me.id, card, captured: taken.length > 0 };

  /* Move the turn on FIRST, then deal if the hands are out. Dealing can put
     the game into the calling phase and point the turn at whoever has to
     speak; advancing afterwards would walk straight past them. */
  const handsOut = s.players.every(p => p.hand.length === 0);
  s.turn = (s.turn + 1) % s.order.length;

  if (handsOut) {
    if (s.deck.length >= s.players.length * 3) {
      dealHands(s, events);
    } else {
      endRound(s, events);
      return { state: s, events };
    }
  }
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

  const counts = {}, gained = {};
  s.teams.forEach(t => { counts[t] = 0; });
  s.players.forEach(p => { counts[p.team] += p.pile.length; });
  const share = breakEven(s.players.length);
  s.teams.forEach(t => {
    gained[t] = Math.max(0, counts[t] - share);
    if (s.variant === 'ronda') s.teamScores[t] += gained[t];
  });
  events.push({ t: 'count', counts, gained, share, teamScores: { ...s.teamScores } });

  /* mirror the team score onto each player so the shared table code can show it */
  s.players.forEach(p => { p.score = s.teamScores[p.team]; });

  s.phase = 'roundEnd';
  const best = s.teams.slice().sort((a, b) => counts[b] - counts[a]);
  s.roundWinner = (best.length > 1 && counts[best[0]] === counts[best[1]]) ? null : best[0];

  if (s.variant === 'makla') {
    /* one hand, count, done — no running total */
    s.winner = s.roundWinner;
    s.phase = 'gameEnd';
    events.push({ t: 'gameEnd', team: s.winner, counts, draw: s.roundWinner === null });
    return;
  }
  const top = s.teams.slice().sort((a, b) => s.teamScores[b] - s.teamScores[a])[0];
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
  s.teams.forEach(t => { if (s.teamScores[t] === undefined) s.teamScores[t] = 0; });
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
    teams: state.teams.slice(),
    teamScores: { ...state.teamScores },
    share: breakEven(state.players.length),
    calls: state.calls.slice(),
    pendingCalls: state.pendingCalls.slice(),
    /* what YOU are sitting on is yours to know; what other people hid is not */
    hiding: !!state.concealed[playerId],
    lastDeal: state.lastDeal,
    chain: state.chain ? { ...state.chain } : null,
    lastPlay: state.lastPlay ? { who: state.lastPlay.who, card: state.lastPlay.card, captured: state.lastPlay.captured } : null,
    lastCapture: state.lastCapture,
    you: me ? {
      id: me.id, name: me.name, team: me.team, seat: me.seat,
      hand: me.hand.slice(), pile: me.pile.length,
      canCall: state.phase === 'calling' ? callable(me.hand) : null
    } : null,
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

  /* Speaking up. A tringa is always worth calling. A pair is a judgement:
     a low one hands the point to anybody holding a better pair, so a sharp
     player sits on it and risks the penalty. */
  if (state.phase === 'calling') {
    const call = ms.find(m => m.type === 'call'), hide = ms.find(m => m.type === 'hide');
    if (!call) return hide || ms[0];
    if (call.kind === 'tringa' || !hide) return call;
    if (level === 'easy') return call;
    const high = ord(call.rank) >= 6;               /* a seven or better */
    if (level === 'sharp') return high ? call : (rnd() < 0.35 ? call : hide);
    return high || rnd() < 0.7 ? call : hide;
  }
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
