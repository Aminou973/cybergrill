/* ==========================================================================
   WHAT A GAME IS
   --------------------------------------------------------------------------
   Every game in CyberGrill is a module that exports the same handful of pure
   functions. Nothing that holds a game — not the room server, not the lobby,
   not the dashboard — needs to know whether it is dealing cards or throwing
   dice.

   The contract:

     META                            what the game is called, how many can play
     createGame({players, seed, …})  a fresh state
     legalMoves(state, playerId)     everything that player may do right now
     applyMove(state, playerId, m)   -> { state, events }   throws if illegal
     viewFor(state, playerId)        what that player is allowed to see
     nextRound(state, opts?)         deal again, scores carried
     botMove(state, playerId, rnd, level)   a move, or null

   Two rules the whole thing rests on:

     * applyMove never mutates what it is given. It returns a new state.
     * viewFor is the ONLY way a state reaches a player. If a game has hidden
       information, that is where it stays hidden — the server sends nothing
       else. UNO relies on this completely; Ludo has nothing to hide and simply
       returns everything.

   State shape the shared machinery expects, whatever the game:

     state.order   [playerId]     seating, in turn order
     state.turn    index into order
     state.dir     1 or -1
     state.phase   'playing' | 'roundEnd' | 'gameEnd'
     state.players [{ id, name, score, connected }]

   Everything past that is the game's own business.
   ========================================================================== */
import * as uno from './engine.js';
import * as ludo from './ludo/engine.js';
import * as ronda from './ronda/engine.js';

export const GAMES = { uno, ludo, ronda };

export const GAME_LIST = Object.keys(GAMES).map(id => GAMES[id].META);

export function gameById(id) { return GAMES[id] || null; }

/* the seat this game is waiting for — the one thing the server asks of a state
   without knowing what game it is */
export function turnOf(state) {
  return state && state.order ? state.order[state.turn] : null;
}

/* Does this table have a workable number of people at it? Games answer for
   themselves, because "four" means something different to Ludo and to UNO. */
export function seatCheck(id, count) {
  const g = GAMES[id];
  if (!g) return 'that game does not exist';
  const m = g.META;
  if (m.exactCounts) {
    /* some games only work at particular numbers — Ronda is two head to head
       or four in two pairs, and three people cannot play it at all */
    if (m.exactCounts.indexOf(count) === -1)
      return m.name + ' is played with ' + m.exactCounts.slice(0, -1).join(', ') +
        ' or ' + m.exactCounts[m.exactCounts.length - 1] + ' players';
    return null;
  }
  if (count < m.min) return m.name + ' needs at least ' + m.min + ' players';
  if (count > m.max) return m.name + ' seats ' + m.max + ' at most';
  if (m.evenOnly && count % 2 !== 0) return m.name + ' needs an even number of players';
  return null;
}
