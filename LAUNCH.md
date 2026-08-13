# Alpstead — launch kit

Everything needed for a Product Hunt / social launch. Copy is written to be
pasted, not rewritten.

## Identity

- **Name:** Alpstead
- **Tagline (60 char limit):** Farm the valley. Read the market. *(33 chars)*
- **Category:** Games · Simulation · Indie
- **Setting:** an alpine farm above Lake Lucerne, Switzerland

## Description (Product Hunt, ~260 chars)

> Alpstead is a cosy farming game that is secretly a budgeting problem. Thirty
> days, twenty-four moves a day, one shared market that drops every time you
> sell into it. Walk the village, drive the tractor, herd the sheep — then find
> out your real constraint was never money.

## The hook, in one line

Most farming games run out of money. Alpstead runs out of **moves** — and that
turns out to be a completely different game.

## First comment (the maker's note)

> I wanted a farming game where expanding your farm could be the wrong move.
>
> In Alpstead every worker gets 24 actions a day and every planted tile needs
> watering daily, so one farmer physically cannot service a full field. Not
> "shouldn't" — can't. The arithmetic runs out before the day does. That single
> constraint makes every seed a real decision: cheap and fast, or expensive and
> slow, against a hard thirty-day wall.
>
> Everything is generated rather than sourced. The pixel art is drawn in code,
> the ambient soundtrack is synthesised live in the browser and never repeats,
> and the village is a hand-authored isometric map you can actually walk around.
> No asset packs, no streamed audio, a few hundred KB total.
>
> Happy to answer anything about the balance table or the renderer.

## Asset checklist

| Asset | Spec | Status |
| --- | --- | --- |
| Logo | 240×240 PNG, transparent | derive from `public/favicon.svg` |
| Gallery 1 | 1270×760 — the village, tractor visible | `pnpm shoot` → `/village` |
| Gallery 2 | 1270×760 — the farm board mid-season | `pnpm shoot` → `/play` |
| Gallery 3 | 1270×760 — How to Play, action-budget figure | `pnpm shoot` → `/how-to-play` |
| Gallery 4 | 1270×760 — leaderboard with real rows | needs seeded data |
| OG card | 1200×630 | `public/og-alpstead.svg` |
| Demo video | ≤60s, 1920×1080, H.264 | not made |

## Suggested video beats (52s)

| Time | Beat |
| --- | --- |
| 0–4s | Village at rest, ambient bed audible. Title card. |
| 4–12s | Walk through the plaza, past the bakery and flower shop. |
| 12–20s | Board the tractor, drive across the ploughed field. |
| 20–28s | Cut to the farm board. Plant, water, the field fills. |
| 28–38s | Action counter runs down. Dry warnings appear. The squeeze. |
| 38–46s | Market tape moves as a big sale lands. Price drops visibly. |
| 46–52s | Final bank number, leaderboard rank, wordmark. |

## Launch-day copy

**X / short post**

> Alpstead is a cosy alpine farming game that is secretly a budgeting problem.
>
> 30 days. 24 moves a day. A market that drops every time you sell into it.
>
> Your constraint was never money — it was moves.

**Reddit / longer**

Lead with the action-budget insight, not the art. The art gets people to look;
the constraint is what makes them stay.

## Pre-launch gate

- [ ] Supabase project live, migrations applied
- [ ] At least one LLM provider key set on the `coach` function
- [ ] Seeded leaderboard so the board is not empty on launch day
- [ ] `ALLOWED_ORIGIN` locked to the production domain (not `*`)
- [ ] Vercel Deployment Protection disabled, or promoted to production
- [ ] Lighthouse ≥90 performance and accessibility on mobile
- [ ] Full season playable start to finish without a console error
- [ ] Sound does not autoplay
