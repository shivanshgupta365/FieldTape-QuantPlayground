# FieldTape for Kaggriculture

FieldTape is an unofficial, public-safe browser simulation and quant-learning lab inspired by the public mechanics of Kaggle's Kaggriculture competition.

## Run locally

```bash
pnpm install
pnpm dev
```

The product works without a backend. Optional Supabase values can be copied from `.env.example` to `.env.local` to enable sync and verified daily challenges.

## Validate

```bash
pnpm lint
pnpm test
pnpm build
pnpm check:public
pnpm exec playwright test
```

## Public-safety boundary

The site imports only `src/game`, a transparent educational engine and public baseline implementation. It does not import the private `../agent` workspace. Production source maps are disabled, `/capture` is not registered in the production router, and `check:public` scans for private paths, credential markers, and unsafe artifacts.

`PublicReplayV1` accepts only synthetic baseline matches and rejects known private-state and policy fields. Real competition matches should be viewed through Kaggle's official replay UI.

## Attribution

FieldTape's browser engine and visual system are original. Mechanics were checked against the public Kaggriculture environment in [Kaggle's `kaggle-environments` repository](https://github.com/Kaggle/kaggle-environments/tree/master/kaggle_environments/envs/kaggriculture), licensed under Apache-2.0. See `src/game/README.md` and `public/game/ATTRIBUTION.md` for scope.

Kaggle and Kaggriculture are marks of their respective owners. This project is unofficial, uses fictional coins and crops, and is educational—not investment advice.

