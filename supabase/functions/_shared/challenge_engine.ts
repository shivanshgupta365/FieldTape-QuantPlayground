export const ACTION_SCHEMA_VERSION = 1;
export const ENGINE_VERSION = "fieldtape-allocation-v1.0.0";
export const VERIFIER_VERSION = "fieldtape-verifier-v1.0.0";

const BASIS_POINTS = 10_000n;
const UINT32_MODULUS = 4_294_967_296n;

type JsonRecord = Record<string, unknown>;

export interface CropParameter {
  key: string;
  cost: bigint;
  maturityPeriods: number;
  payoutBps: number;
  shockBps: number;
  marketImpactBpsPerUnit: number;
  maxUnitsPerOrder: number;
}

export interface ChallengeParameters {
  contract: "fieldtape-capital-allocation-v1";
  periods: number;
  initialCash: bigint;
  transactionFeeBps: number;
  crops: CropParameter[];
}

export interface ChallengeOrder {
  crop: string;
  units: number;
}

export interface ChallengeAction {
  period: number;
  orders: ChallengeOrder[];
}

export interface EquityPoint {
  period: number;
  cash: string;
  markedEquity: string;
  openLots: number;
}

export interface ReplayResult {
  score: bigint;
  tieBreak: bigint;
  finalCash: bigint;
  maxDrawdown: bigint;
  totalFees: bigint;
  investedCapital: bigint;
  maturedLots: number;
  expiredLots: number;
  actionCount: number;
  equityCurve: EquityPoint[];
}

interface OpenLot {
  crop: CropParameter;
  units: bigint;
  boughtPeriod: number;
  maturityPeriod: number;
  costBasis: bigint;
}

export class ReplayValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ReplayValidationError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function assertKnownKeys(
  value: JsonRecord,
  allowedKeys: readonly string[],
  path: string,
): void {
  const allowed = new Set(allowedKeys);
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown) {
    throw new ReplayValidationError(
      "unknown_field",
      `${path}.${unknown} is not part of action schema v${ACTION_SCHEMA_VERSION}`,
    );
  }
}

function readInteger(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): number {
  if (
    !Number.isSafeInteger(value) || (value as number) < minimum ||
    (value as number) > maximum
  ) {
    throw new ReplayValidationError(
      "invalid_integer",
      `${path} must be an integer between ${minimum} and ${maximum}`,
    );
  }
  return value as number;
}

function readMoney(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): bigint {
  return BigInt(readInteger(value, path, minimum, maximum));
}

function readString(
  value: unknown,
  path: string,
  pattern: RegExp,
  maximumLength: number,
): string {
  if (
    typeof value !== "string" || value.length > maximumLength ||
    !pattern.test(value)
  ) {
    throw new ReplayValidationError(
      "invalid_string",
      `${path} has an invalid value`,
    );
  }
  return value;
}

export function parseChallengeParameters(value: unknown): ChallengeParameters {
  if (!isRecord(value)) {
    throw new ReplayValidationError(
      "invalid_parameters",
      "challenge parameters must be an object",
    );
  }

  assertKnownKeys(
    value,
    ["contract", "periods", "initialCash", "transactionFeeBps", "crops"],
    "parameters",
  );

  if (value.contract !== "fieldtape-capital-allocation-v1") {
    throw new ReplayValidationError(
      "unsupported_contract",
      "unsupported challenge contract",
    );
  }

  const periods = readInteger(value.periods, "parameters.periods", 3, 30);
  const initialCash = readMoney(
    value.initialCash,
    "parameters.initialCash",
    100,
    1_000_000_000,
  );
  const transactionFeeBps = readInteger(
    value.transactionFeeBps,
    "parameters.transactionFeeBps",
    0,
    1000,
  );

  if (
    !Array.isArray(value.crops) || value.crops.length < 2 ||
    value.crops.length > 8
  ) {
    throw new ReplayValidationError(
      "invalid_crops",
      "parameters.crops must contain 2 to 8 crops",
    );
  }

  const cropKeys = new Set<string>();
  const crops = value.crops.map((rawCrop, index): CropParameter => {
    if (!isRecord(rawCrop)) {
      throw new ReplayValidationError(
        "invalid_crop",
        `parameters.crops[${index}] must be an object`,
      );
    }

    assertKnownKeys(
      rawCrop,
      [
        "key",
        "cost",
        "maturityPeriods",
        "payoutBps",
        "shockBps",
        "marketImpactBpsPerUnit",
        "maxUnitsPerOrder",
      ],
      `parameters.crops[${index}]`,
    );

    const key = readString(
      rawCrop.key,
      `parameters.crops[${index}].key`,
      /^[a-z][a-z0-9-]*$/,
      32,
    );
    if (cropKeys.has(key)) {
      throw new ReplayValidationError(
        "duplicate_crop",
        `crop ${key} appears more than once`,
      );
    }
    cropKeys.add(key);

    return {
      key,
      cost: readMoney(
        rawCrop.cost,
        `parameters.crops[${index}].cost`,
        1,
        10_000_000,
      ),
      maturityPeriods: readInteger(
        rawCrop.maturityPeriods,
        `parameters.crops[${index}].maturityPeriods`,
        1,
        periods,
      ),
      payoutBps: readInteger(
        rawCrop.payoutBps,
        `parameters.crops[${index}].payoutBps`,
        0,
        50_000,
      ),
      shockBps: readInteger(
        rawCrop.shockBps,
        `parameters.crops[${index}].shockBps`,
        0,
        5000,
      ),
      marketImpactBpsPerUnit: readInteger(
        rawCrop.marketImpactBpsPerUnit,
        `parameters.crops[${index}].marketImpactBpsPerUnit`,
        0,
        500,
      ),
      maxUnitsPerOrder: readInteger(
        rawCrop.maxUnitsPerOrder,
        `parameters.crops[${index}].maxUnitsPerOrder`,
        1,
        1000,
      ),
    };
  });

  return {
    contract: "fieldtape-capital-allocation-v1",
    periods,
    initialCash,
    transactionFeeBps,
    crops,
  };
}

export function parseActions(
  value: unknown,
  parameters: ChallengeParameters,
  maxActions: number,
): ChallengeAction[] {
  if (!Array.isArray(value)) {
    throw new ReplayValidationError(
      "invalid_actions",
      "actions must be an array",
    );
  }
  if (value.length > maxActions || value.length > parameters.periods) {
    throw new ReplayValidationError(
      "too_many_actions",
      `actions may contain at most ${
        Math.min(maxActions, parameters.periods)
      } entries`,
    );
  }

  const validCrops = new Map(parameters.crops.map((crop) => [crop.key, crop]));
  const seenPeriods = new Set<number>();

  const actions = value.map((rawAction, actionIndex): ChallengeAction => {
    if (!isRecord(rawAction)) {
      throw new ReplayValidationError(
        "invalid_action",
        `actions[${actionIndex}] must be an object`,
      );
    }
    assertKnownKeys(rawAction, ["period", "orders"], `actions[${actionIndex}]`);

    const period = readInteger(
      rawAction.period,
      `actions[${actionIndex}].period`,
      0,
      parameters.periods - 1,
    );
    if (seenPeriods.has(period)) {
      throw new ReplayValidationError(
        "duplicate_period",
        `period ${period} appears more than once`,
      );
    }
    seenPeriods.add(period);

    if (
      !Array.isArray(rawAction.orders) ||
      rawAction.orders.length > parameters.crops.length
    ) {
      throw new ReplayValidationError(
        "invalid_orders",
        `actions[${actionIndex}].orders must contain at most ${parameters.crops.length} orders`,
      );
    }

    const seenCrops = new Set<string>();
    const orders = rawAction.orders.map(
      (rawOrder, orderIndex): ChallengeOrder => {
        if (!isRecord(rawOrder)) {
          throw new ReplayValidationError(
            "invalid_order",
            `actions[${actionIndex}].orders[${orderIndex}] must be an object`,
          );
        }
        assertKnownKeys(
          rawOrder,
          ["crop", "units"],
          `actions[${actionIndex}].orders[${orderIndex}]`,
        );
        const cropKey = readString(
          rawOrder.crop,
          `actions[${actionIndex}].orders[${orderIndex}].crop`,
          /^[a-z][a-z0-9-]*$/,
          32,
        );
        const crop = validCrops.get(cropKey);
        if (!crop) {
          throw new ReplayValidationError(
            "unknown_crop",
            `unknown crop ${cropKey}`,
          );
        }
        if (seenCrops.has(cropKey)) {
          throw new ReplayValidationError(
            "duplicate_crop_order",
            `crop ${cropKey} appears more than once in period ${period}`,
          );
        }
        seenCrops.add(cropKey);

        return {
          crop: cropKey,
          units: readInteger(
            rawOrder.units,
            `actions[${actionIndex}].orders[${orderIndex}].units`,
            1,
            crop.maxUnitsPerOrder,
          ),
        };
      },
    );

    orders.sort((left, right) => compareCodeUnits(left.crop, right.crop));
    return { period, orders };
  });

  actions.sort((left, right) => left.period - right.period);
  return actions;
}

function ceilDivide(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - 1n) / denominator;
}

function fnv1a32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function xorshift32(value: number): number {
  let state = value >>> 0;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return state >>> 0;
}

function deterministicShockBps(seed: bigint, lot: OpenLot): number {
  if (lot.crop.shockBps === 0) return 0;
  const seed32 = Number(
    ((seed % UINT32_MODULUS) + UINT32_MODULUS) % UINT32_MODULUS,
  );
  const mixed = xorshift32(
    seed32 ^
      fnv1a32(`${lot.crop.key}:${lot.boughtPeriod}:${lot.maturityPeriod}`),
  );
  const range = lot.crop.shockBps * 2 + 1;
  return (mixed % range) - lot.crop.shockBps;
}

function settleLot(seed: bigint, lot: OpenLot): bigint {
  const shockBps = deterministicShockBps(seed, lot);
  const impactBps = lot.crop.marketImpactBpsPerUnit *
    Math.max(Number(lot.units) - 1, 0);
  const realizedPayoutBps = Math.max(
    lot.crop.payoutBps + shockBps - impactBps,
    0,
  );
  return (lot.units * lot.crop.cost * BigInt(realizedPayoutBps)) / BASIS_POINTS;
}

export function replayChallenge(
  parameters: ChallengeParameters,
  actions: ChallengeAction[],
  seed: bigint,
): ReplayResult {
  const actionByPeriod = new Map(
    actions.map((action) => [action.period, action]),
  );
  const cropByKey = new Map(parameters.crops.map((crop) => [crop.key, crop]));
  let cash = parameters.initialCash;
  let totalFees = 0n;
  let investedCapital = 0n;
  let maturedLots = 0;
  let openLots: OpenLot[] = [];
  let peakEquity = parameters.initialCash;
  let maxDrawdown = 0n;
  const equityCurve: EquityPoint[] = [];

  const markEquity = (period: number, terminal = false): void => {
    const openCostBasis = terminal
      ? 0n
      : openLots.reduce((total, lot) => total + lot.costBasis, 0n);
    const equity = cash + openCostBasis;
    if (equity > peakEquity) peakEquity = equity;
    const drawdown = peakEquity - equity;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    equityCurve.push({
      period,
      cash: cash.toString(),
      markedEquity: equity.toString(),
      openLots: openLots.length,
    });
  };

  const settleMaturities = (period: number): void => {
    const remaining: OpenLot[] = [];
    for (const lot of openLots) {
      if (lot.maturityPeriod === period) {
        cash += settleLot(seed, lot);
        maturedLots += 1;
      } else {
        remaining.push(lot);
      }
    }
    openLots = remaining;
  };

  for (let period = 0; period < parameters.periods; period += 1) {
    settleMaturities(period);
    const action = actionByPeriod.get(period);

    if (action) {
      const purchases = action.orders.map((order) => {
        const crop = cropByKey.get(order.crop);
        if (!crop) {
          throw new ReplayValidationError(
            "unknown_crop",
            `unknown crop ${order.crop}`,
          );
        }
        const units = BigInt(order.units);
        const costBasis = units * crop.cost;
        const fee = ceilDivide(
          costBasis * BigInt(parameters.transactionFeeBps),
          BASIS_POINTS,
        );
        return { crop, units, costBasis, fee };
      });

      const periodSpend = purchases.reduce(
        (total, purchase) => total + purchase.costBasis + purchase.fee,
        0n,
      );
      if (periodSpend > cash) {
        throw new ReplayValidationError(
          "insufficient_cash",
          `period ${period} spends ${periodSpend} but only ${cash} is available`,
        );
      }

      cash -= periodSpend;
      for (const purchase of purchases) {
        totalFees += purchase.fee;
        investedCapital += purchase.costBasis;
        openLots.push({
          crop: purchase.crop,
          units: purchase.units,
          boughtPeriod: period,
          maturityPeriod: period + purchase.crop.maturityPeriods,
          costBasis: purchase.costBasis,
        });
      }
    }

    markEquity(period);
  }

  // Lots maturing exactly at the boundary settle. Anything later expires with
  // zero terminal value, making duration mismatch visible in the score.
  settleMaturities(parameters.periods);
  const expiredLots = openLots.length;
  markEquity(parameters.periods, true);

  return {
    score: cash,
    tieBreak: -maxDrawdown,
    finalCash: cash,
    maxDrawdown,
    totalFees,
    investedCapital,
    maturedLots,
    expiredLots,
    actionCount: actions.length,
    equityCurve,
  };
}

export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new ReplayValidationError(
        "invalid_number",
        "non-finite numbers are not allowed",
      );
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => compareCodeUnits(left, right));
    return `{${
      entries.map(([key, entryValue]) =>
        `${JSON.stringify(key)}:${canonicalJson(entryValue)}`
      ).join(",")
    }}`;
  }
  throw new ReplayValidationError(
    "invalid_json",
    "value cannot be represented as canonical JSON",
  );
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
