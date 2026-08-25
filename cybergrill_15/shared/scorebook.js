/* ==========================================================================
   CyberGrill — the tray between a game table and the scoreboard
   --------------------------------------------------------------------------
   A finished online game has no idea who anybody is on the scoreboard: it
   knows names typed into a lobby, not the player records the dashboard keeps.
   So the table drops the result into a tray in this browser's storage, by
   name, and the dashboard picks it up the next time it is opened, matching
   the names to its own players and creating any it has never seen.

   The tray is deliberately dumb. It survives the tab being closed, it never
   loses a result to a race because every write re-reads first, and if nobody
   ever opens the scoreboard it just sits there.
   ========================================================================== */
(function (root) {
  'use strict';
  var KEY = 'cybergrill_pending';
  var CAP = 200;                 /* a night is dozens of games, not hundreds */

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var a = raw ? JSON.parse(raw) : [];
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }

  function write(a) {
    try { localStorage.setItem(KEY, JSON.stringify(a.slice(-CAP))); return true; }
    catch (e) { return false; }
  }

  /* entry: { game, ranking:[name…], draw, score, room } */
  function push(entry) {
    if (!entry || !entry.ranking || entry.ranking.length < 2) return false;
    var all = read();
    var id = entry.id || (entry.game + '-' + (entry.room || '') + '-' + Date.now());
    if (all.some(function (e) { return e.id === id; })) return false;
    all.push({
      id: id,
      game: entry.game,
      ranking: entry.ranking.map(function (n) { return String(n).slice(0, 20); }),
      draw: !!entry.draw,
      score: entry.score ? String(entry.score).slice(0, 20) : '',
      room: entry.room || '',
      at: new Date().toISOString()
    });
    return write(all);
  }

  /* the dashboard calls this once and gets everything that has piled up */
  function drain() {
    var all = read();
    if (all.length) write([]);
    return all;
  }

  root.CGScore = { push: push, drain: drain, peek: read, KEY: KEY };
})(typeof window !== 'undefined' ? window : this);
