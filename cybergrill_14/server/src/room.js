/* ===========================================================================
   One room = one Durable Object.

   The DO holds the only complete copy of the game. Players never receive a
   full state, only `viewFor(game, theirId)` — so a hand cannot be read out of
   the network tab. Every move is re-validated here; the client is a screen.

   Sockets are hibernatable: an idle room costs nothing and wakes up with its
   state intact when somebody reconnects.
   =========================================================================== */
import { GAMES, gameById, seatCheck, turnOf } from '../../game/registry.js';
import { MODES, BOT_LEVELS } from '../../game/engine.js';

/* The room does not know what game it is hosting. It knows a game is a module
   with five functions on it, and it asks the registry which one. Everything
   below — bots, the turn clock, reconnection, redacted views — works the same
   whether the table is dealing cards or throwing dice. */
const DEFAULT_GAME = 'uno';

const BOT_NAMES = ['KAMEL', 'ILYES', 'ABDOU', 'BILLAL', 'SARA', 'YOUCEF'];
const MAX_PLAYERS = 8;
/* How long a bot pretends to think. Instant replies make the table feel like a
   spreadsheet, so even the fast setting pauses. */
const BOT_SPEED = { slow: 1500, normal: 800, fast: 380 };
const GONE_GRACE = 25000;       /* ms before a dropped player is played for */
const ROOM_TTL = 1000 * 60 * 60 * 12;

const rid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);

function blankRoom(code) {
  return {
    code,
    createdAt: Date.now(),
    gameId: DEFAULT_GAME,
    hostId: null,
    players: [],           /* {id, name, token, bot, connected, goneAt} */
    cfg: { mode: 'classic', target: 500, blitz: 0, house: {}, skill: 'normal', speed: 'normal' },
    game: null,
    turnStartedAt: 0,
    lastActivity: Date.now()
  };
}

export class Room {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.room = null;
  }

  async load() {
    if (!this.room) this.room = (await this.ctx.storage.get('room')) || null;
    return this.room;
  }
  async save() {
    this.room.lastActivity = Date.now();
    await this.ctx.storage.put('room', this.room);
  }

  /* ---------------------------------------------------------------- routing */
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/claim') {
      await this.load();
      if (this.room) return new Response('taken', { status: 409 });
      this.room = blankRoom(url.searchParams.get('code'));
      await this.save();
      return new Response('ok');
    }

    if (url.pathname === '/peek') {
      await this.load();
      if (!this.room) return Response.json({ error: 'no such room' }, { status: 404 });
      return Response.json({
        code: this.room.code,
        gameId: this.room.gameId || DEFAULT_GAME,
        players: this.room.players.map(p => ({ name: p.name, bot: !!p.bot, connected: !!p.connected })),
        started: !!this.room.game,
        cfg: this.room.cfg
      });
    }

    if (url.pathname === '/ws') {
      await this.load();
      if (!this.room) {
        /* Somebody typed a code for a room that was never made. Rather than a
           dead socket, create it — the first person in becomes the host. */
        this.room = blankRoom(url.searchParams.get('code'));
        await this.save();
      }
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    return new Response('not found', { status: 404 });
  }

  /* the module that knows the rules of whatever is being played here */
  get E() { return gameById(this.room.gameId || DEFAULT_GAME) || GAMES[DEFAULT_GAME]; }

  /* ------------------------------------------------------------- socket i/o */
  who(ws) {
    try { return ws.deserializeAttachment(); } catch (e) { return null; }
  }
  sendTo(ws, msg) {
    try { ws.send(JSON.stringify(msg)); } catch (e) { }
  }
  err(ws, msg) { this.sendTo(ws, { t: 'error', msg }); }

  sockets() { return this.ctx.getWebSockets(); }

  broadcastLobby() {
    const payload = {
      t: 'lobby',
      code: this.room.code,
      gameId: this.room.gameId || DEFAULT_GAME,
      hostId: this.room.hostId,
      cfg: this.room.cfg,
      started: !!this.room.game,
      players: this.room.players.map(p => ({
        id: p.id, name: p.name, bot: !!p.bot, connected: !!p.connected,
        voice: !!p.voice, muted: !!p.muted
      }))
    };
    for (const ws of this.sockets()) this.sendTo(ws, payload);
  }

  broadcastState(events) {
    const g = this.room.game;
    if (!g) return;
    for (const ws of this.sockets()) {
      const a = this.who(ws);
      if (!a) continue;
      this.sendTo(ws, {
        t: 'state',
        gameId: this.room.gameId || DEFAULT_GAME,
        v: this.E.viewFor(g, a.id),
        events: events || [],
        deadline: this.room.cfg.blitz
          ? this.room.turnStartedAt + this.room.cfg.blitz * 1000
          : 0,
        serverNow: Date.now()
      });
    }
  }

  async webSocketMessage(ws, raw) {
    await this.load();
    let m;
    try { m = JSON.parse(raw); } catch (e) { return this.err(ws, 'bad message'); }
    try {
      await this.handle(ws, m);
    } catch (e) {
      this.err(ws, e.message || 'something went wrong');
    }
  }

  async webSocketClose(ws) { await this.dropped(ws); }
  async webSocketError(ws) { await this.dropped(ws); }

  async dropped(ws) {
    await this.load();
    if (!this.room) return;
    const a = this.who(ws);
    if (!a) return;
    const p = this.room.players.find(x => x.id === a.id);
    if (!p) return;
    /* another tab of the same player may still be open */
    const stillHere = this.sockets().some(s => {
      const b = this.who(s);
      return b && b.id === a.id && s !== ws && s.readyState === WebSocket.READY_STATE_OPEN;
    });
    if (stillHere) return;
    p.connected = false;
    p.goneAt = Date.now();
    /* a closed tab is out of the voice room too, or everybody keeps trying to
       call a browser that is not there any more */
    p.voice = false; p.muted = false;
    if (!this.room.game) {
      /* nothing has started — just take the empty chair away */
      this.room.players = this.room.players.filter(x => x.id !== p.id);
    }
    /* the room must never be left without somebody who can deal */
    if (this.room.hostId === p.id) {
      const heir = this.room.players.find(x => !x.bot && x.connected && x.id !== p.id);
      this.room.hostId = heir ? heir.id : (this.room.game ? this.room.hostId : null);
    }
    await this.save();
    this.broadcastLobby();
    if (this.room.game) { this.broadcastState([{ t: 'left', who: p.id }]); await this.schedule(); }
  }

  /* ------------------------------------------------------------- the actions */
  async handle(ws, m) {
    const R = this.room;

    /* ---- hello: join or come back ------------------------------------- */
    if (m.t === 'hello') {
      const name = String(m.name || 'PLAYER').trim().slice(0, 14).toUpperCase() || 'PLAYER';
      let p = null;

      if (m.playerId && m.token) {
        const claimed = R.players.find(x => x.id === m.playerId);
        if (claimed && claimed.token !== m.token) return this.err(ws, 'that seat belongs to somebody else');
        p = claimed && claimed.token === m.token ? claimed : null;
      }

      if (p) {                                   /* reconnect */
        p.connected = true; p.goneAt = 0; p.bot = false; p.name = name;
        if (R.game) {
          const gp = (R.game.players || []).find(x => x.id === p.id);
          if (gp) { gp.name = name; gp.connected = true; }
        }
      } else {
        if (R.game) return this.err(ws, 'that game has already started');
        if (R.players.length >= MAX_PLAYERS) return this.err(ws, 'the room is full');
        p = { id: rid(), name, token: rid() + rid(), bot: false, connected: true, goneAt: 0 };
        R.players.push(p);
        if (!R.hostId) R.hostId = p.id;
      }

      /* if the host walked off, the seat passes to whoever is actually here */
      const host = R.players.find(x => x.id === R.hostId);
      if (!host || host.bot || !host.connected) R.hostId = p.id;

      ws.serializeAttachment({ id: p.id });
      await this.save();
      this.sendTo(ws, { t: 'joined', you: { id: p.id, name: p.name, token: p.token }, code: R.code, hostId: R.hostId });
      this.broadcastLobby();
      if (R.game) this.broadcastState([]);
      await this.schedule();
      return;
    }

    const a = this.who(ws);
    if (!a) return this.err(ws, 'say hello first');
    const me = R.players.find(x => x.id === a.id);
    if (!me) return this.err(ws, 'you are not in this room');
    const isHost = R.hostId === me.id;

    /* ---- lobby management --------------------------------------------- */
    if (m.t === 'cfg') {
      if (!isHost) return this.err(ws, 'only the host changes the settings');
      if (R.game) return this.err(ws, 'the game has started');
      const c = m.cfg || {};
      if (m.gameId && GAMES[m.gameId]) R.gameId = m.gameId;
      R.cfg = {
        mode: MODES.includes(c.mode) || c.mode === 'stayson' || c.mode === 'blitz' ? c.mode : 'classic',
        /* each game says what a sensible target is; UNO's 500 means nothing
           to Ronda, which plays to 41 */
        target: (this.E.META.targets || []).indexOf(c.target) !== -1
          ? c.target : (this.E.META.defaultTarget || 500),
        blitz: [0, 5, 7, 12, 20].includes(c.blitz) ? c.blitz : 0,
        house: Object(c.house),
        /* whether the result of this room lands on everybody's scoreboard as
           part of the night, or is just a friendly */
        count: !!c.count,
        skill: BOT_LEVELS.includes(c.skill) ? c.skill : 'normal',
        speed: BOT_SPEED[c.speed] ? c.speed : 'normal'
      };
      await this.save(); this.broadcastLobby(); return;
    }

    /* ---- the voice room ------------------------------------------------
       The audio never comes through here. All the server does is carry the
       introductions -- who wants to talk, and the offer/answer/ICE traffic
       that lets two browsers find each other -- and then get out of the way. */
    if (m.t === 'voice') {
      me.voice = !!m.on;
      me.muted = !!m.muted;
      await this.save();
      this.broadcastLobby();
      return;
    }

    if (m.t === 'rtc') {
      if (!m.to || typeof m.to !== 'string') return;
      const target = R.players.find(p => p.id === m.to);
      if (!target || target.bot) return;
      for (const ws2 of this.sockets()) {
        const a2 = this.who(ws2);
        if (a2 && a2.id === m.to) this.sendTo(ws2, { t: 'rtc', from: me.id, data: m.data });
      }
      return;
    }

    if (m.t === 'addBot') {
      if (!isHost) return this.err(ws, 'only the host adds bots');
      if (R.game) return this.err(ws, 'the game has started');
      if (R.players.length >= MAX_PLAYERS) return this.err(ws, 'the room is full');
      const used = new Set(R.players.map(p => p.name));
      const name = BOT_NAMES.find(n => !used.has(n)) || ('BOT' + R.players.length);
      R.players.push({ id: rid(), name, token: rid(), bot: true, connected: true, goneAt: 0 });
      await this.save(); this.broadcastLobby(); return;
    }

    if (m.t === 'kick') {
      if (!isHost) return this.err(ws, 'only the host can remove a player');
      if (R.game) return this.err(ws, 'the game has started');
      R.players = R.players.filter(p => p.id !== m.id || p.id === R.hostId);
      await this.save(); this.broadcastLobby(); return;
    }

    /* ---- start --------------------------------------------------------- */
    if (m.t === 'start') {
      if (!isHost) return this.err(ws, 'only the host deals');
      if (R.game) return this.err(ws, 'already dealt');
      const seatErr = seatCheck(R.gameId || DEFAULT_GAME, R.players.length);
      if (seatErr) return this.err(ws, seatErr);
      const engineMode = R.cfg.mode === 'teams' ? 'teams'
        : R.cfg.mode === 'elimination' ? 'elimination' : 'classic';
      /* Every engine takes the same bag of options and ignores what it does not
         understand, so this call does not have to know which game it is. */
      R.game = this.E.createGame({
        players: R.players.map(p => ({ id: p.id, name: p.name })),
        seed: (crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0,
        house: R.cfg.house,
        target: R.cfg.target,
        mode: engineMode
      });
      R.turnStartedAt = Date.now();
      await this.save();
      this.broadcastLobby();
      this.broadcastState([{ t: 'dealt' }]);
      await this.schedule();
      return;
    }

    /* ---- a move --------------------------------------------------------- */
    if (m.t === 'move') {
      if (!R.game) return this.err(ws, 'nothing has been dealt yet');
      const live = this.E.META.livePhases || ['playing'];
      if (live.indexOf(R.game.phase) === -1) return this.err(ws, 'the round is over');
      const r = this.E.applyMove(R.game, me.id, m.move);   /* throws on anything illegal */
      R.game = r.state;
      R.turnStartedAt = Date.now();
      await this.save();
      this.broadcastState(r.events);
      await this.schedule();
      return;
    }

    /* ---- next round ------------------------------------------------------ */
    if (m.t === 'next') {
      if (!isHost) return this.err(ws, 'the host starts the next round');
      if (!R.game || R.game.phase !== 'roundEnd') return this.err(ws, 'the round is still going');
      R.game = this.E.nextRound(R.game);
      R.turnStartedAt = Date.now();
      await this.save();
      this.broadcastState([{ t: 'newRound', round: R.game.round }]);
      await this.schedule();
      return;
    }

    /* ---- play again ------------------------------------------------------ */
    if (m.t === 'again') {
      if (!isHost) return this.err(ws, 'the host restarts');
      R.game = null;
      R.players = R.players.filter(p => p.connected || p.bot);
      await this.save();
      this.broadcastLobby();
      return;
    }

    if (m.t === 'ping') { this.sendTo(ws, { t: 'pong', now: Date.now() }); return; }

    this.err(ws, 'unknown message: ' + m.t);
  }

  /* ------------------------------------------------- bots and the turn clock */
  /* Who is the game waiting for, and is that somebody the server plays for? */
  autoActor() {
    const R = this.room, g = R.game;
    /* each game says which phases still owe the table a move; Ronda's calling
       phase is one of them, and a bot sitting in it would freeze the room */
    const live = this.E.META.livePhases || ['playing'];
    if (!g || live.indexOf(g.phase) === -1) return null;
    const actor = turnOf(g);
    const p = R.players.find(x => x.id === actor);
    if (!p) return null;
    /* anchored to the moment the turn started, not to now: recomputing it
       from Date.now() on every wake pushes the alarm forever forward and the
       bot never gets to play */
    if (p.bot) return { id: actor, at: (R.turnStartedAt || Date.now()) + (BOT_SPEED[R.cfg.speed] || BOT_SPEED.normal), why: 'bot' };
    if (!p.connected) return { id: actor, at: (p.goneAt || Date.now()) + GONE_GRACE, why: 'gone' };
    if (R.cfg.blitz) return { id: actor, at: R.turnStartedAt + R.cfg.blitz * 1000, why: 'clock' };
    return null;
  }

  async schedule() {
    const next = this.autoActor();
    if (!next) { await this.ctx.storage.deleteAlarm(); return; }
    await this.ctx.storage.setAlarm(Math.max(Date.now() + 120, next.at));
  }

  async alarm() {
    await this.load();
    if (!this.room) return;
    const R = this.room;

    if (Date.now() - R.lastActivity > ROOM_TTL) { await this.ctx.storage.deleteAll(); return; }

    const next = this.autoActor();
    if (!next) return;
    if (Date.now() < next.at - 60) { await this.schedule(); return; }

    /* a bot that keeps throwing must not be woken forever: three goes at a
       turn, then the room sits still rather than spinning the alarm */
    const stuck = R.autoKey === next.id + ':' + R.turnStartedAt ? (R.autoTries || 0) : 0;
    if (stuck >= 3) return;
    R.autoKey = next.id + ':' + R.turnStartedAt;
    R.autoTries = stuck + 1;

    let move = null;
    try {
      move = next.why === 'clock'
        ? this.clockMove(next.id)
        : this.E.botMove(R.game, next.id, Math.random, R.cfg.skill || 'normal');
    } catch (e) { move = null; }
    if (!move) move = this.clockMove(next.id);
    if (!move) { await this.save(); return; }

    try {
      const r = this.E.applyMove(R.game, next.id, move);
      R.game = r.state;
      R.turnStartedAt = Date.now();
      R.autoKey = ''; R.autoTries = 0;
      await this.save();
      this.broadcastState(next.why === 'clock'
        ? r.events.concat([{ t: 'timeout', who: next.id }])
        : r.events);
    } catch (e) { await this.save(); }
    await this.schedule();
  }

  /* Out of time: take the medicine, then pass. Never a random card — losing
     your turn is the penalty, losing a good card as well would be cruel. */
  clockMove(pid) {
    const ms = this.E.legalMoves(this.room.game, pid);
    const pick = t => ms.find(x => x.type === t);
    /* the harmless thing to do in each game when you run out of time */
    return pick('accept') || pick('takeStack') || pick('draw') || pick('roll') || pick('call') || pick('pass') || ms[0] || null;
  }
}
