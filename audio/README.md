# Real sounds

Everything the table makes is generated in the browser out of filtered noise
and short tones. It is built the way the real noise is built — a card snap is a
burst of high noise with a small thump under it, a shuffle is fourteen of those
in a row — so it sounds like cards rather than like a games console. Nothing
here needs a single audio file to work.

If you want actual recordings, drop them in this folder and they take over.

## What the game looks for

| file | when it plays |
|---|---|
| `play.mp3` | a card is laid on the pile |
| `draw.mp3` | one card comes off the deck |
| `shuffle.mp3` | the deal at the start of a round |
| `skip.mp3` | somebody loses their turn |
| `rev.mp3` | the direction turns around |
| `hit.mp3` | a +2 or +4 lands on somebody |
| `uno.mp3` | the shout |
| `win.mp3` | the round is won |
| `bad.mp3` | you tried something illegal |
| `tick.mp3` | a button, a chip, the turn clock |
| `music.mp3` | the loop under the whole table |
| `music-tense.mp3` | a second layer, faded in when somebody is one card away |

`.ogg` and `.wav` work too — the game tries mp3, then ogg, then wav. Anything
missing keeps its generated version, so you can replace one sound or all of
them.

## What to use

Keep the effects **short** (under half a second, except `shuffle` and `win`)
and **quiet** — they play on top of each other all night. Trim the silence off
the front or every card will land late. `music.mp3` must loop seamlessly; the
game loops it with no crossfade.

## Where to get them

Use sources that are clearly licensed for this — CC0 / public domain packs, or
recordings you make yourself. A phone held over a real deck gives a better card
snap than most sound libraries, and it costs nothing.

I have deliberately not shipped any audio files with the project. I cannot
verify the licence of something I pulled off the web, and a games-night
scoreboard is not worth a copyright problem. The generated sounds are mine to
give you; anything recorded has to be yours.
