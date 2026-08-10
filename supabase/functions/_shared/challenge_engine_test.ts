import {
  canonicalJson,
  parseActions,
  parseChallengeParameters,
  replayChallenge,
  ReplayValidationError,
  sha256Hex,
} from "./challenge_engine.ts";

const rawParameters = {
  contract: "fieldtape-capital-allocation-v1",
  periods: 6,
  initialCash: 1000,
  transactionFeeBps: 20,
  crops: [
    {
      key: "wheat",
      cost: 100,
      maturityPeriods: 2,
      payoutBps: 11200,
      shockBps: 0,
      marketImpactBpsPerUnit: 0,
      maxUnitsPerOrder: 10,
    },
    {
      key: "melon",
      cost: 500,
      maturityPeriods: 5,
      payoutBps: 20000,
      shockBps: 0,
      marketImpactBpsPerUnit: 0,
      maxUnitsPerOrder: 2,
    },
  ],
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("replay is deterministic and settles boundary maturities", () => {
  const parameters = parseChallengeParameters(rawParameters);
  const actions = parseActions(
    [
      { period: 0, orders: [{ crop: "wheat", units: 5 }] },
      { period: 2, orders: [{ crop: "wheat", units: 5 }] },
    ],
    parameters,
    6,
  );

  const first = replayChallenge(parameters, actions, 8401001n);
  const second = replayChallenge(parameters, actions, 8401001n);

  assert(
    first.finalCash === second.finalCash,
    "same seed and actions must match",
  );
  assert(
    first.finalCash === 1118n,
    `expected deterministic cash 1118, got ${first.finalCash}`,
  );
  assert(
    first.expiredLots === 0,
    "all wheat lots should mature before the boundary",
  );
  assert(
    first.equityCurve.length === 7,
    "curve includes six periods and terminal close",
  );
});

Deno.test("late assets expire at the hard horizon", () => {
  const parameters = parseChallengeParameters(rawParameters);
  const early = parseActions(
    [
      { period: 0, orders: [{ crop: "melon", units: 1 }] },
    ],
    parameters,
    6,
  );
  const late = parseActions(
    [
      { period: 2, orders: [{ crop: "melon", units: 1 }] },
    ],
    parameters,
    6,
  );

  const earlyResult = replayChallenge(parameters, early, 99n);
  const lateResult = replayChallenge(parameters, late, 99n);

  assert(
    earlyResult.finalCash === 1499n,
    "early melon should mature with its payout",
  );
  assert(
    lateResult.finalCash === 499n,
    "late melon cost and fee should remain sunk",
  );
  assert(
    lateResult.expiredLots === 1,
    "late melon should expire after the horizon",
  );
  assert(
    lateResult.maxDrawdown >= 501n,
    "terminal cliff should appear in drawdown",
  );
});

Deno.test("invalid and unaffordable action logs are rejected", () => {
  const parameters = parseChallengeParameters(rawParameters);

  try {
    parseActions(
      [
        { period: 1, orders: [] },
        { period: 1, orders: [] },
      ],
      parameters,
      6,
    );
    throw new Error("duplicate period should fail");
  } catch (error) {
    assert(
      error instanceof ReplayValidationError,
      "duplicate period should be a validation error",
    );
    assert(
      error.code === "duplicate_period",
      "duplicate period should have a stable error code",
    );
  }

  const actions = parseActions(
    [
      { period: 0, orders: [{ crop: "melon", units: 2 }] },
    ],
    parameters,
    6,
  );
  try {
    replayChallenge(parameters, actions, 1n);
    throw new Error("unaffordable order should fail");
  } catch (error) {
    assert(
      error instanceof ReplayValidationError,
      "overspend should be a validation error",
    );
    assert(
      error.code === "insufficient_cash",
      "overspend should have a stable error code",
    );
  }
});

Deno.test("canonical hashes do not depend on object key order", async () => {
  const left = canonicalJson({
    challengeId: "a",
    actions: [{ period: 0, orders: [] }],
  });
  const right = canonicalJson({
    actions: [{ orders: [], period: 0 }],
    challengeId: "a",
  });

  assert(left === right, "canonical JSON should sort object keys recursively");
  assert(
    await sha256Hex(left) === await sha256Hex(right),
    "canonical hashes should match",
  );
});
