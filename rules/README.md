# Rulepack — one source of truth for published Kaggriculture constants

`kaggriculture.v1.json` is the canonical copy of every published game constant.
It is **generated, never edited by hand**:

```bash
python3 -m venv agent/.venv
agent/.venv/bin/pip install "kaggle-environments==1.32.6"
agent/.venv/bin/python rules/extract_rulepack.py
```

The extractor imports the installed official module and dumps its module-level
tables plus the configuration defaults from `kaggriculture.json`, then writes a
SHA-256 over the canonical JSON body.

## Why this exists

Three separate engines in this project encode the same published numbers:

| Engine | Language | Location |
| --- | --- | --- |
| Competition policy | Python | `agent/kaggriculture_agent/constants.py` |
| Browser game | TypeScript | `fieldtape/src/game/constants.ts` |
| Challenge verifier | Deno | `supabase/functions/_shared/challenge_engine.ts` |

Nothing kept them equal, and they had already drifted — in the direction that
costs money. The competition agent was using `WHEAT max_yield = 4` against an
official value of `6`, and `CARROT max_yield = 3` against `4`: a 33% and 25%
underestimate of the two cheapest, fastest crops, in a competition decided by
who finishes with more coins. It also harvested melons at age 10 when the
official `max_yield_day` is 12, and carried no animal timing data at all.

The browser engine was correct. Nothing proved it, and nothing would have
noticed when it stopped being correct.

## Conformance tests

Each engine asserts its own constants against this file:

| Engine | Test | Run |
| --- | --- | --- |
| Python agent | `agent/tests/test_rulepack_conformance.py` | `agent/.venv/bin/python -m unittest discover -s agent/tests` |
| Browser engine | `fieldtape/src/game/rulepack.test.ts` | `cd fieldtape && pnpm test` |
| Deno verifier | *not yet written* | — |

Regenerating the pack after a `kaggle-environments` upgrade will fail every
conformance test until each engine is reconciled. That is the intended
behaviour, not a nuisance.

## Precedence

This is a point-in-time capture of a specific package version. **Live Kaggle
behaviour overrides it.** If a replay disagrees with this file, the replay is
right and the pack needs regenerating against the published environment.

Derived values do not belong here. `agent`'s `last_yield_age()` computes the
final-yield age from the official primitives rather than storing it, because a
stored derivation is exactly what drifted the first time.
