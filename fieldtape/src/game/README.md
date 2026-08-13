# Alpstead engine

A deterministic, self-contained simulation of the Alpstead season. Pure
functions over a serialisable state object: `stepGame(state, actions)` returns a
new state and never mutates the old one, which is what makes replay scrubbing
land on an identical frame every time.

The balance table in `constants.ts` is ours. It is tuned for the tension we
want — cheap fast cash flow against expensive slow payoff inside a thirty-day
wall — and `balance.test.ts` holds it to that design intent so a careless retune
fails loudly instead of quietly producing a crop nobody would plant.

Bump `BRAND.balanceVersion` whenever the table changes: saved scores stop being
comparable across balance versions, and the leaderboard partitions on it.
