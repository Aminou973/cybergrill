# CyberGrill UNO — the online server

One Cloudflare Worker, one Durable Object per room. It is small on purpose:
the room is the only place a full game exists, and every player gets back a
redacted view of it. Nobody can read a hand out of the network tab, because
the hand is never sent.

## What it costs

Nothing, on the free plan. The Durable Object is declared as a
`new_sqlite_classes` migration, which is the flavour Cloudflare allows without
a paid Workers subscription. An idle room hibernates and bills nothing.

## Deploy it (once)

```powershell
cd server
npx wrangler deploy
```

Wrangler prints a URL:

```
https://cybergrill-uno.<your-subdomain>.workers.dev
```

Paste that into `config.yml`:

```yaml
uno_server: "https://cybergrill-uno.<your-subdomain>.workers.dev"
```

Commit and push. The build inlines the address into the table, the **ONLINE**
tab wakes up, and that is the whole setup.

Redeploying later is the same one command. The Worker and the dashboard are
independent — you can update either without touching the other.

## Running it locally

```powershell
cd server
npx wrangler dev
```

That serves on `http://127.0.0.1:8787`. Point `uno_server` at it, run
`node scripts/build.mjs`, and open `site/game/index.html` through a local web
server (not a file:// double-click — a page opened from disk cannot make the
CORS request that creates a room).

## The protocol

Client → server, as JSON over the WebSocket at `/ws/<CODE>`:

| message | who | what it does |
|---|---|---|
| `hello {name, playerId?, token?}` | anyone | join, or reclaim your seat after a drop |
| `cfg {cfg}` | host | set mode / target / clock / house rules |
| `addBot` | host | fill a chair |
| `kick {id}` | host | free a chair, before the deal |
| `start` | host | deal |
| `move {move}` | anyone | play, draw, pass, challenge, catch, say UNO |
| `next` | host | next round |
| `again` | host | back to the lobby |

Server → client:

| message | contents |
|---|---|
| `joined` | your id and the token that gets your seat back |
| `lobby` | code, host, settings, who is in the room |
| `state` | **your** view of the game, the events since the last one, and the turn deadline |
| `error` | a sentence you can show the player |

Every move is re-validated by the engine inside the room. A tampered client
gets an `error` back and nothing else — the shared `game/engine.js` is the
referee on both sides, so the rules can never drift apart.

## Reconnecting

Your seat is a `{id, token}` pair kept in the browser's local storage per room
code. Close the tab, come back, and `hello` hands it over; you rejoin your own
seat with your own cards. While you are gone the room plays for you after 25
seconds so the table does not freeze, and your seat shows 📴 to everyone else.

## Housekeeping

A room that has seen no activity for 12 hours deletes itself the next time its
alarm fires. Room codes are four characters from an alphabet with no `I`, `O`,
`0` or `1` in it, because people read them out loud across a table.
