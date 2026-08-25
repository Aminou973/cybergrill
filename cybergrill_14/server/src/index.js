/* ===========================================================================
   CyberGrill UNO — the Worker in front of the rooms.
   
   Everything that matters happens inside the Durable Object; this file only
   makes room codes, checks CORS, and hands the socket over.
   =========================================================================== */
export { Room } from './room.js';

/* No I, O, 0 or 1 — people read these codes out loud across a table. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LEN = 4;

function makeCode() {
  const b = crypto.getRandomValues(new Uint8Array(CODE_LEN));
  let s = '';
  for (const n of b) s += ALPHABET[n % ALPHABET.length];
  return s;
}

function cors(env, req) {
  const origin = req.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
  const ok = allowed.includes(origin) || allowed.includes('*');
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0] || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}
const json = (body, init, headers) =>
  new Response(JSON.stringify(body), {
    status: (init && init.status) || 200,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) }
  });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const h = cors(env, req);

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });

    /* --- health ---------------------------------------------------------- */
    if (url.pathname === '/' || url.pathname === '/api/health')
      return json({ ok: true, service: 'cybergrill-uno' }, null, h);

    /* --- create a room --------------------------------------------------- */
    if (url.pathname === '/api/room' && req.method === 'POST') {
      /* Try a few codes so two people creating at once never collide. */
      for (let i = 0; i < 8; i++) {
        const code = makeCode();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        const r = await stub.fetch('https://room/claim?code=' + code, { method: 'POST' });
        if (r.ok) return json({ code }, null, h);
      }
      return json({ error: 'could not allocate a room code' }, { status: 503 }, h);
    }

    /* --- does a room exist? ---------------------------------------------- */
    let m = url.pathname.match(/^\/api\/room\/([A-Za-z0-9]{2,8})$/);
    if (m && req.method === 'GET') {
      const code = m[1].toUpperCase();
      const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
      const r = await stub.fetch('https://room/peek');
      const body = await r.json();
      return json(body, { status: r.status }, h);
    }

    /* --- join the socket -------------------------------------------------- */
    m = url.pathname.match(/^\/ws\/([A-Za-z0-9]{2,8})$/);
    if (m) {
      if (req.headers.get('Upgrade') !== 'websocket')
        return json({ error: 'expected a websocket upgrade' }, { status: 426 }, h);
      const code = m[1].toUpperCase();
      const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
      return stub.fetch('https://room/ws?code=' + code, req);
    }

    return json({ error: 'not found' }, { status: 404 }, h);
  }
};
