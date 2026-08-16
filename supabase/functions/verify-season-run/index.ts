import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { baselineAction } from "../../../fieldtape/src/game/baseline.ts";
import { createGame, stepGame } from "../../../fieldtape/src/game/engine.ts";
import { ENGINE_VERSION } from "../../../fieldtape/src/game/constants.ts";
import type { GameAction } from "../../../fieldtape/src/game/types.ts";

const BALANCE_VERSION = "alpstead-balance-1";
const TOTAL_TURNS = 30 * 24;
const CORS = { "access-control-allow-origin": "https://fieldtape-quantplayground.vercel.app", "access-control-allow-headers": "authorization, content-type, apikey", "access-control-allow-methods": "POST, OPTIONS" };

function reply(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { ...CORS, "cache-control": "no-store" } });
}

function actionLog(value: unknown, runKind: "season" | "practice"): GameAction[][] | null {
  if (!Array.isArray(value)) return null;
  const validLength = runKind === "season"
    ? value.length === TOTAL_TURNS
    : value.length >= 24 && value.length <= TOTAL_TURNS && value.length % 24 === 0;
  if (!validLength) return null;
  const entries: GameAction[][] = [];
  for (const turn of value) {
    if (!Array.isArray(turn) || turn.length < 1 || turn.length > 12) return null;
    if (!turn.every((action) => action && typeof action === "object" && typeof (action as { type?: unknown }).type === "string")) return null;
    entries.push(turn as GameAction[]);
  }
  return entries;
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default {
  fetch: withSupabase({ auth: "user" }, async (request, context) => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: CORS });
    if (request.method !== "POST") return reply(405, { reason: "POST only" });
    const userId = String(context.userClaims?.id ?? context.jwtClaims?.sub ?? "");
    if (!userId) return reply(401, { reason: "authentication required" });
    let payload: Record<string, unknown>;
    try { payload = await request.json(); } catch { return reply(400, { reason: "invalid JSON" }); }
    if (payload.balanceVersion !== BALANCE_VERSION || typeof payload.seed !== "string") return reply(422, { reason: "unsupported season contract" });
    const runKind = payload.runKind === "practice" ? "practice" : "season";
    const turns = actionLog(payload.actionLog, runKind);
    if (!turns) return reply(422, { reason: runKind === "season" ? `expected ${TOTAL_TURNS} normalized turns` : "practice runs must end after a whole day (24 turns)" });
    const admin = context.supabaseAdmin as any;
    const profile = await admin.from("profiles").select("display_name").eq("user_id", userId).maybeSingle();
    if (profile.error) return reply(503, { reason: "profile lookup failed" });
    if (!profile.data) return reply(409, { reason: "complete your public profile first" });
    const seed = Number(payload.seed);
    if (!Number.isFinite(seed)) return reply(422, { reason: "seed must be a finite number" });
    let state = createGame({ seed, playerNames: ["Your desk", "Public baseline"] });
    try {
      for (const playerActions of turns) state = stepGame(state, { 0: playerActions, 1: baselineAction(state, 1, "balanced") });
    } catch { return reply(422, { reason: "the submitted action log cannot be replayed" }); }
    if ((runKind === "season" && state.status !== "finished") || state.engineVersion !== ENGINE_VERSION) return reply(422, { reason: "season did not finish" });
    // Idempotency belongs to one player. Identical deterministic moves from two
    // different people must create two legitimate board entries, while a retry
    // from the same player remains a no-op.
    const runHash = await sha256({ userId, runKind, seed: String(state.seed), balanceVersion: BALANCE_VERSION, actionLog: turns });
    const actionCount = turns.reduce((count, turn) => count + turn.length, 0);
    const table = runKind === "practice" ? "practice_runs" : "season_runs";
    const board = runKind === "practice" ? "practice_leaderboard_public" : "season_leaderboard";
    const existing = await admin.from(table).select("id").eq("user_id", userId).eq("run_hash", runHash).maybeSingle();
    let runId = existing.data?.id as string | undefined;
    if (!runId) {
      const quota = await admin.rpc("consume_challenge_submission_quota", { p_user_id: userId, p_limit: 12, p_window_seconds: 900 }).single();
      if (quota.error) return reply(503, { reason: "submission quota unavailable" });
      if (!quota.data.allowed) return reply(429, { reason: "submission rate limit reached", retryAfterSeconds: quota.data.retry_after_seconds });
      const inserted = await admin.from(table).insert({ user_id: userId, display_name: profile.data.display_name, balance_version: BALANCE_VERSION, seed: String(state.seed), final_money: state.farms[0].money, days_completed: turns.length / 24, actions_used: actionCount, action_log: turns, run_hash: runHash, verified: true, verifier_version: "season-replay-v1", verified_at: new Date().toISOString() }).select("id").single();
      if (inserted.error) {
        if (inserted.error.code !== "23505") return reply(503, { reason: "verified score could not be stored" });
        const retry = await admin.from(table).select("id").eq("user_id", userId).eq("run_hash", runHash).single();
        if (retry.error) return reply(503, { reason: "verified score could not be stored" });
        runId = retry.data.id;
      } else runId = inserted.data.id;
    }
    const rankQuery = runKind === "practice"
      ? admin.from(board).select("rank").eq("balance_version", BALANCE_VERSION).eq("days_completed", turns.length / 24).eq("display_name", profile.data.display_name).eq("final_money", state.farms[0].money).order("rank").limit(1).maybeSingle()
      : admin.from(board).select("rank").eq("id", runId).single();
    const ranked = await rankQuery;
    return reply(existing.data ? 200 : 201, { verified: true, rank: ranked.data?.rank ?? null, finalMoney: state.farms[0].money, daysCompleted: turns.length / 24, runKind });
  }),
};
