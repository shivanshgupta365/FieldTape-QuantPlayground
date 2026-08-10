import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import {
  ACTION_SCHEMA_VERSION,
  canonicalJson,
  ENGINE_VERSION,
  parseActions,
  parseChallengeParameters,
  replayChallenge,
  ReplayValidationError,
  sha256Hex,
  VERIFIER_VERSION,
} from "../_shared/challenge_engine.ts";
import type { Database, Json } from "../_shared/database.types.ts";

const MAX_REQUEST_BYTES = 96 * 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonRecord = Record<string, unknown>;

interface SubmissionRequest {
  challengeId: string;
  idempotencyKey: string;
  actions: unknown[];
}

interface ChallengeRow {
  id: string;
  engine_version: string;
  action_schema_version: number;
  seed: string | number;
  max_actions: number;
  parameters: unknown;
  opens_at: string;
  closes_at: string;
  published: boolean;
}

interface SubmissionReceipt {
  id: string;
  challenge_id: string;
  public_player_id: string;
  player_display_name: string;
  action_log_hash: string;
  action_count: number;
  score: string | number;
  tie_break: string | number;
  verifier_version: string;
  result: unknown;
  verified_at: string;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonError(
  status: number,
  code: string,
  message: string,
  extra: JsonRecord = {},
  headers: HeadersInit = {},
): Response {
  return Response.json(
    { error: { code, message, ...extra } },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

function parseSubmissionRequest(value: unknown): SubmissionRequest {
  if (!isRecord(value)) {
    throw new ReplayValidationError(
      "invalid_request",
      "request body must be a JSON object",
    );
  }

  const allowedKeys = new Set(["challengeId", "idempotencyKey", "actions"]);
  const unknownKey = Object.keys(value).find((key) => !allowedKeys.has(key));
  if (unknownKey) {
    throw new ReplayValidationError(
      "unknown_field",
      `${unknownKey} is not part of the request`,
    );
  }

  if (
    typeof value.challengeId !== "string" ||
    !UUID_PATTERN.test(value.challengeId)
  ) {
    throw new ReplayValidationError(
      "invalid_challenge_id",
      "challengeId must be a UUID",
    );
  }
  if (
    typeof value.idempotencyKey !== "string" ||
    !UUID_PATTERN.test(value.idempotencyKey)
  ) {
    throw new ReplayValidationError(
      "invalid_idempotency_key",
      "idempotencyKey must be a UUID",
    );
  }
  if (!Array.isArray(value.actions)) {
    throw new ReplayValidationError(
      "invalid_actions",
      "actions must be an array",
    );
  }

  return {
    challengeId: value.challengeId,
    idempotencyKey: value.idempotencyKey,
    actions: value.actions,
  };
}

function publicReceipt(
  receipt: SubmissionReceipt,
  replayed: boolean,
): JsonRecord {
  return {
    submissionId: receipt.id,
    challengeId: receipt.challenge_id,
    publicPlayerId: receipt.public_player_id,
    playerDisplayName: receipt.player_display_name,
    score: String(receipt.score),
    tieBreak: String(receipt.tie_break),
    actionCount: receipt.action_count,
    verifierVersion: receipt.verifier_version,
    verifiedAt: receipt.verified_at,
    result: receipt.result,
    replayed,
  };
}

async function readRequestBody(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    throw new ReplayValidationError(
      "payload_too_large",
      "request body exceeds 96 KiB",
    );
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
    throw new ReplayValidationError(
      "payload_too_large",
      "request body exceeds 96 KiB",
    );
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new ReplayValidationError(
      "invalid_json",
      "request body is not valid JSON",
    );
  }
}

// withSupabase validates the user JWT and handles browser CORS/preflight. The
// service client exists only inside the function runtime and is never returned.
export default {
  fetch: withSupabase<Database>({ auth: "user" }, async (request, context) => {
    if (request.method !== "POST") {
      return jsonError(
        405,
        "method_not_allowed",
        "use POST for challenge verification",
        {},
        { Allow: "POST" },
      );
    }

    const userId = String(
      context.userClaims?.id ?? context.jwtClaims?.sub ?? "",
    );
    if (!UUID_PATTERN.test(userId)) {
      return jsonError(
        401,
        "invalid_identity",
        "authenticated user identity is unavailable",
      );
    }

    const anonymousClaim = context.jwtClaims?.is_anonymous;
    if (anonymousClaim === true || anonymousClaim === "true") {
      return jsonError(
        403,
        "permanent_account_required",
        "link an email or OAuth identity before publishing a leaderboard score",
      );
    }

    let submissionRequest: SubmissionRequest;
    try {
      submissionRequest = parseSubmissionRequest(
        await readRequestBody(request),
      );
    } catch (error) {
      if (error instanceof ReplayValidationError) {
        const status = error.code === "payload_too_large" ? 413 : 400;
        return jsonError(status, error.code, error.message);
      }
      return jsonError(400, "invalid_request", "request could not be read");
    }

    const admin = context.supabaseAdmin;
    const { data: challengeData, error: challengeError } = await admin
      .from("daily_challenges")
      .select(
        "id,engine_version,action_schema_version,seed,max_actions,parameters,opens_at,closes_at,published",
      )
      .eq("id", submissionRequest.challengeId)
      .eq("published", true)
      .maybeSingle();

    if (challengeError) {
      console.error("challenge lookup failed", challengeError.code);
      return jsonError(
        503,
        "challenge_lookup_failed",
        "challenge could not be loaded",
      );
    }
    if (!challengeData) {
      return jsonError(
        404,
        "challenge_not_found",
        "published challenge was not found",
      );
    }

    const challenge = challengeData as ChallengeRow;
    const now = Date.now();
    if (now < Date.parse(challenge.opens_at)) {
      return jsonError(
        409,
        "challenge_not_open",
        "challenge has not opened yet",
      );
    }
    if (now >= Date.parse(challenge.closes_at)) {
      return jsonError(
        409,
        "challenge_closed",
        "challenge is closed for new submissions",
      );
    }
    if (challenge.action_schema_version !== ACTION_SCHEMA_VERSION) {
      return jsonError(
        409,
        "unsupported_action_schema",
        `server supports action schema ${ACTION_SCHEMA_VERSION}`,
      );
    }
    if (challenge.engine_version !== ENGINE_VERSION) {
      return jsonError(
        409,
        "unsupported_engine_version",
        `server supports engine ${ENGINE_VERSION}`,
      );
    }

    let parameters;
    let actions;
    let actionLogHash: string;
    try {
      parameters = parseChallengeParameters(challenge.parameters);
      actions = parseActions(
        submissionRequest.actions,
        parameters,
        challenge.max_actions,
      );
      actionLogHash = await sha256Hex(canonicalJson({
        challengeId: challenge.id,
        engineVersion: challenge.engine_version,
        actionSchemaVersion: ACTION_SCHEMA_VERSION,
        seed: String(challenge.seed),
        actions,
      }));
    } catch (error) {
      if (error instanceof ReplayValidationError) {
        return jsonError(422, error.code, error.message);
      }
      console.error("challenge contract failed", error);
      return jsonError(
        503,
        "invalid_challenge_contract",
        "challenge contract is unavailable",
      );
    }

    const receiptColumns =
      "id,challenge_id,public_player_id,player_display_name,action_log_hash,action_count,score,tie_break,verifier_version,result,verified_at" as const;

    const { data: idempotentData, error: idempotentError } = await admin
      .from("challenge_submissions")
      .select(receiptColumns)
      .eq("user_id", userId)
      .eq("challenge_id", challenge.id)
      .eq("idempotency_key", submissionRequest.idempotencyKey)
      .maybeSingle();

    if (idempotentError) {
      console.error("idempotency lookup failed", idempotentError.code);
      return jsonError(
        503,
        "idempotency_lookup_failed",
        "submission could not be checked",
      );
    }
    if (idempotentData) {
      const receipt = idempotentData as SubmissionReceipt;
      if (receipt.action_log_hash !== actionLogHash) {
        return jsonError(
          409,
          "idempotency_conflict",
          "idempotencyKey was already used for a different action log",
        );
      }
      return Response.json(publicReceipt(receipt, true));
    }

    const { data: quotaData, error: quotaError } = await admin.rpc(
      "consume_challenge_submission_quota",
      { p_user_id: userId, p_limit: 12, p_window_seconds: 900 },
    );
    if (quotaError) {
      console.error("quota update failed", quotaError.code);
      return jsonError(
        503,
        "quota_unavailable",
        "submission quota could not be checked",
      );
    }

    const quota = Array.isArray(quotaData)
      ? quotaData[0] as JsonRecord | undefined
      : undefined;
    if (!quota || quota.allowed !== true) {
      const retryAfter = typeof quota?.retry_after_seconds === "number"
        ? quota.retry_after_seconds
        : 900;
      return jsonError(
        429,
        "rate_limited",
        "too many verification attempts",
        { retryAfterSeconds: retryAfter },
        { "Retry-After": String(retryAfter) },
      );
    }

    let replay;
    try {
      replay = replayChallenge(
        parameters,
        actions,
        BigInt(String(challenge.seed)),
      );
    } catch (error) {
      if (error instanceof ReplayValidationError) {
        return jsonError(422, error.code, error.message);
      }
      console.error("deterministic replay failed", error);
      return jsonError(500, "replay_failed", "deterministic replay failed");
    }

    let { data: profileData, error: profileError } = await admin
      .from("profiles")
      .select("public_id,display_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("profile lookup failed", profileError.code);
      return jsonError(
        503,
        "profile_lookup_failed",
        "profile could not be loaded",
      );
    }

    if (!profileData) {
      const defaultName = `Quant-${userId.slice(0, 6)}`;
      const createdProfile = await admin
        .from("profiles")
        .insert({ user_id: userId, display_name: defaultName })
        .select("public_id,display_name")
        .single();

      if (createdProfile.error?.code === "23505") {
        const concurrentProfile = await admin
          .from("profiles")
          .select("public_id,display_name")
          .eq("user_id", userId)
          .single();
        profileData = concurrentProfile.data;
        profileError = concurrentProfile.error;
      } else {
        profileData = createdProfile.data;
        profileError = createdProfile.error;
      }

      if (profileError || !profileData) {
        console.error("profile creation failed", profileError?.code);
        return jsonError(
          503,
          "profile_creation_failed",
          "profile could not be prepared",
        );
      }
    }

    const resultPayload: Json = {
      finalCash: replay.finalCash.toString(),
      maxDrawdown: replay.maxDrawdown.toString(),
      totalFees: replay.totalFees.toString(),
      investedCapital: replay.investedCapital.toString(),
      maturedLots: replay.maturedLots,
      expiredLots: replay.expiredLots,
      equityCurve: replay.equityCurve.map((point) => ({
        period: point.period,
        cash: point.cash,
        markedEquity: point.markedEquity,
        openLots: point.openLots,
      })),
    };

    const submissionRecord = {
      challenge_id: challenge.id,
      user_id: userId,
      public_player_id: String(profileData.public_id),
      player_display_name: String(profileData.display_name),
      idempotency_key: submissionRequest.idempotencyKey,
      action_log_hash: actionLogHash,
      action_count: replay.actionCount,
      score: replay.score.toString(),
      tie_break: replay.tieBreak.toString(),
      verifier_version: VERIFIER_VERSION,
      result: resultPayload,
    };

    const inserted = await admin
      .from("challenge_submissions")
      .insert(submissionRecord)
      .select(receiptColumns)
      .single();

    if (!inserted.error && inserted.data) {
      return Response.json(
        publicReceipt(inserted.data as SubmissionReceipt, false),
        { status: 201 },
      );
    }

    if (inserted.error?.code === "23505") {
      const duplicate = await admin
        .from("challenge_submissions")
        .select(receiptColumns)
        .eq("user_id", userId)
        .eq("challenge_id", challenge.id)
        .or(
          `idempotency_key.eq.${submissionRequest.idempotencyKey},action_log_hash.eq.${actionLogHash}`,
        )
        .limit(1)
        .maybeSingle();

      if (duplicate.data) {
        const receipt = duplicate.data as SubmissionReceipt;
        if (receipt.action_log_hash === actionLogHash) {
          return Response.json(publicReceipt(receipt, true));
        }
        return jsonError(
          409,
          "idempotency_conflict",
          "idempotencyKey was already used for a different action log",
        );
      }
    }

    console.error("submission insert failed", inserted.error?.code);
    return jsonError(
      503,
      "submission_store_failed",
      "verified submission could not be stored",
    );
  }),
};
