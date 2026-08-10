-- Public, deterministic examples for local development and the first launch day.
-- Production challenge rotation can upsert the same schema from a trusted job.

insert into public.daily_challenges (
  id,
  challenge_date,
  slug,
  title,
  description,
  engine_version,
  action_schema_version,
  seed,
  max_actions,
  parameters,
  scoring,
  opens_at,
  closes_at,
  published
)
values
  (
    '84010000-0000-4000-8000-000000000001'::uuid,
    date '2026-08-09',
    'duration-match',
    'Duration Match',
    'Allocate finite cash across crops while respecting each maturity date and the hard season boundary.',
    'fieldtape-allocation-v1.0.0',
    1,
    8401001,
    12,
    '{
      "contract": "fieldtape-capital-allocation-v1",
      "periods": 12,
      "initialCash": 3000,
      "transactionFeeBps": 25,
      "crops": [
        {"key":"wheat","cost":100,"maturityPeriods":2,"payoutBps":11200,"shockBps":250,"marketImpactBpsPerUnit":8,"maxUnitsPerOrder":20},
        {"key":"carrot","cost":220,"maturityPeriods":3,"payoutBps":12100,"shockBps":400,"marketImpactBpsPerUnit":10,"maxUnitsPerOrder":12},
        {"key":"tomato","cost":450,"maturityPeriods":5,"payoutBps":13900,"shockBps":700,"marketImpactBpsPerUnit":15,"maxUnitsPerOrder":8},
        {"key":"strawberry","cost":700,"maturityPeriods":7,"payoutBps":16200,"shockBps":1050,"marketImpactBpsPerUnit":20,"maxUnitsPerOrder":6},
        {"key":"melon","cost":900,"maturityPeriods":10,"payoutBps":20700,"shockBps":1500,"marketImpactBpsPerUnit":30,"maxUnitsPerOrder":4}
      ]
    }'::jsonb,
    '{"primary":"finalCash","tieBreak":"lowestMaxDrawdown","lateImmatureLotsWorth":0}'::jsonb,
    timestamptz '2026-08-09 00:00:00+00',
    timestamptz '2026-08-10 00:00:00+00',
    true
  ),
  (
    '84010000-0000-4000-8000-000000000002'::uuid,
    date '2026-08-10',
    'impact-discipline',
    'Impact Discipline',
    'Compound capital without flooding one crop: large lots reduce their own realized payout through market impact.',
    'fieldtape-allocation-v1.0.0',
    1,
    8401002,
    14,
    '{
      "contract": "fieldtape-capital-allocation-v1",
      "periods": 14,
      "initialCash": 3600,
      "transactionFeeBps": 20,
      "crops": [
        {"key":"wheat","cost":100,"maturityPeriods":2,"payoutBps":11100,"shockBps":200,"marketImpactBpsPerUnit":18,"maxUnitsPerOrder":24},
        {"key":"carrot","cost":230,"maturityPeriods":3,"payoutBps":12000,"shockBps":350,"marketImpactBpsPerUnit":20,"maxUnitsPerOrder":14},
        {"key":"tomato","cost":440,"maturityPeriods":5,"payoutBps":14000,"shockBps":650,"marketImpactBpsPerUnit":24,"maxUnitsPerOrder":9},
        {"key":"strawberry","cost":680,"maturityPeriods":7,"payoutBps":16400,"shockBps":1000,"marketImpactBpsPerUnit":28,"maxUnitsPerOrder":6},
        {"key":"melon","cost":880,"maturityPeriods":10,"payoutBps":21000,"shockBps":1450,"marketImpactBpsPerUnit":38,"maxUnitsPerOrder":4}
      ]
    }'::jsonb,
    '{"primary":"finalCash","tieBreak":"lowestMaxDrawdown","lateImmatureLotsWorth":0}'::jsonb,
    timestamptz '2026-08-10 00:00:00+00',
    timestamptz '2026-08-11 00:00:00+00',
    true
  ),
  (
    '84010000-0000-4000-8000-000000000003'::uuid,
    date '2026-08-11',
    'risk-budget',
    'Risk Budget',
    'Balance high expected payouts against path risk; ties reward the strategy with the smaller peak-to-trough drawdown.',
    'fieldtape-allocation-v1.0.0',
    1,
    8401003,
    16,
    '{
      "contract": "fieldtape-capital-allocation-v1",
      "periods": 16,
      "initialCash": 4200,
      "transactionFeeBps": 22,
      "crops": [
        {"key":"wheat","cost":100,"maturityPeriods":2,"payoutBps":11000,"shockBps":150,"marketImpactBpsPerUnit":9,"maxUnitsPerOrder":24},
        {"key":"carrot","cost":220,"maturityPeriods":3,"payoutBps":12000,"shockBps":350,"marketImpactBpsPerUnit":11,"maxUnitsPerOrder":14},
        {"key":"tomato","cost":450,"maturityPeriods":5,"payoutBps":14200,"shockBps":900,"marketImpactBpsPerUnit":16,"maxUnitsPerOrder":9},
        {"key":"strawberry","cost":700,"maturityPeriods":7,"payoutBps":16800,"shockBps":1500,"marketImpactBpsPerUnit":22,"maxUnitsPerOrder":6},
        {"key":"melon","cost":900,"maturityPeriods":10,"payoutBps":22000,"shockBps":2500,"marketImpactBpsPerUnit":32,"maxUnitsPerOrder":4}
      ]
    }'::jsonb,
    '{"primary":"finalCash","tieBreak":"lowestMaxDrawdown","lateImmatureLotsWorth":0}'::jsonb,
    timestamptz '2026-08-11 00:00:00+00',
    timestamptz '2026-08-12 00:00:00+00',
    true
  )
on conflict (id) do update
set
  challenge_date = excluded.challenge_date,
  slug = excluded.slug,
  title = excluded.title,
  description = excluded.description,
  engine_version = excluded.engine_version,
  action_schema_version = excluded.action_schema_version,
  seed = excluded.seed,
  max_actions = excluded.max_actions,
  parameters = excluded.parameters,
  scoring = excluded.scoring,
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  published = excluded.published;
