# Ronda and Makla — the rules we are building to

Written down from Amin's own account of how it is played, so the engine has one
source of truth and nobody has to argue with the code later. Corrections to
this file first, code second.

## The deck

A 40-card Spanish deck. Four suits — Coins (*d'hab*), Cups (*kopas*), Swords
(*chbada*), Clubs (*khal*) — but **suits do not matter**. Only rank does.

Ranks, in order, with no 8 and no 9:

```
1  2  3  4  5  6  7  10  11  12
```

The 7 connects straight to the 10 (*sota*), then 11 (*caballo*), then 12
(*rey*). That matters for sequences: 7 → 10 is adjacent.

## Players

Two players, or four in two teams of two sitting opposite each other.

## The deal

1. Three cards to each player.
2. Four cards face up in the middle.
3. **Clean table rule.** If those four contain a pair, or a four-card run, the
   dealer buries the second matching card (or the last card of the run) back
   into the deck and draws a replacement. The table always starts dead.

Play starts to the dealer's **right** and goes **anti-clockwise**.

## Capturing

On your turn you play exactly one card.

- **Match** — same rank as a card on the table: you take both, face down, into
  your pile.
- **Sequence** — having matched, you also take any unbroken ascending run
  continuing from the card you took. Table shows 4, 5, 6, 11; you play a 4; you
  take the 4, 5 and 6. The 11 stays, because 7 and 10 are missing to bridge it.
- **No match** — your card stays face up on the table and your turn ends.

When everyone is out of cards, three more each. **No new cards go to the
table.** Repeat until the deck is empty.

## Announcements, at the moment a hand is dealt

Called before the first card of that hand is played.

| call | what you hold | worth |
|---|---|---|
| **Ronda** | a pair | 1 |
| **Tringa** | three of a kind | 5 |

If opponents both call Ronda, the higher pair takes both points — a Ronda of
10s over a Ronda of 4s scores 2. Equal rank splits. A Tringa always beats a
Ronda.

## Bonus points, during play

| call | what happened | worth |
|---|---|---|
| **Darba** (*b'wahed*) | the player right before you had to leave a card, and you capture it immediately with the same rank | 1 |
| **B'khamsa** | after a Darba, your partner (or you, next turn, heads-up) drops the **third** card of that rank | 5 |
| **B'ashra** | the **fourth** card of that rank follows straight after a B'khamsa | 10 |
| **Missa** | your capture clears the table completely | 1 |

Missa is normally not awarded on the last hand of the round.

## End of the round

1. **Bawesh** — whoever made the last capture sweeps whatever is left on the
   table.
2. Count captured cards. Forty in the deck, so twenty is break-even.
3. **One point for every card over twenty.** Twenty-six cards is six points;
   fourteen cards is nothing.

Rounds repeat until somebody reaches **41** and wins.

---

# Makla ("eating") — the café version

Also called *Quarante* / *Garante*. Same capturing, none of the paperwork.

- Same deal: three each, four on the table, same clean-table rule.
- Same matching and same ascending sweep.
- **No Ronda, no Tringa** — hands are not checked or announced.
- **No Missa** — clearing the table is its own reward.
- **Darba is optional** — some tables keep it, and it is worth an insult rather
  than a point.
- **No running score to 41.** You play the hand out, sweep with Bawesh, and
  count.

Twenty cards is a draw. Twenty-one or more wins the hand. Thirty means you
should probably buy the coffee.
