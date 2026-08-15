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

function actionLog(value: unknown): GameAction[][] | null {
  if (!Array.isArray(value) || value.length !== TOTAL_TURNS) return null;
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
    const turns = actionLog(payload.actionLog);
    if (!turns) return reply(422, { reason: `expected ${TOTAL_TURNS} normalized turns` });
    const admin = context.supabaseAdmin as any;
    const profile = await admin.from("profiles").select("display_name").eq("user_id", userId).maybeSingle();
    if (profile.error) return reply(503, { reason: "profile lookup failed" });
    if (!profile.data) return reply(409, { reason: "complete your public profile first" });
    let state = createGame({ seed: Number(payload.seed), playerNames: ["Your desk", "Public baseline"] });
    try {
      for (const playerActions of turns) state = stepGame(state, { 0: playerActions, 1: baselineAction(state, 1, "balanced") });
    } catch { return reply(422, { reason: "the submitted action log cannot be replayed" }); }
    if (state.status !== "finished" || state.engineVersion !== ENGINE_VERSION) return reply(422, { reason: "season did not finish" });
    const runHash = await sha256({ seed: String(state.seed), balanceVersion: BALANCE_VERSION, actionLog: turns });
    const actionCount = turns.reduce((count, turn) => count + turn.length, 0);
    const existing = await admin.from("season_runs").select("id").eq("run_hash", runHash).maybeSingle();
    let runId = existing.data?.id as string | undefined;
    if (!runId) {
      const quota = await admin.rpc("consume_challenge_submission_quota", { p_user_id: userId, p_limit: 12, p_window_seconds: 900 }).single();
      if (quota.error) return reply(503, { reason: "submission quota unavailable" });
      if (!quota.data.allowed) return reply(429, { reason: "submission rate limit reached", retryAfterSeconds: quota.data.retry_after_seconds });
      const inserted = await admin.from("season_runs").insert({ user_id: userId, display_name: profile.data.display_name, balance_version: BALANCE_VERSION, seed: String(state.seed), final_money: state.farms[0].money, days_completed: state.day, actions_used: actionCount, action_log: turns, run_hash: runHash, verified: true, verifier_version: "season-replay-v1", verified_at: new Date().toISOString() }).select("id").single();
      if (inserted.error) {
        if (inserted.error.code !== "23505") return reply(503, { reason: "verified score could not be stored" });
        const retry = await admin.from("season_runs").select("id").eq("run_hash", runHash).single();
        if (retry.error) return reply(503, { reason: "verified score could not be stored" });
        runId = retry.data.id;
      } else runId = inserted.data.id;
    }
    const ranked = await admin.from("season_leaderboard").select("rank").eq("id", runId).single();
    return reply(existing.data ? 200 : 201, { verified: true, rank: ranked.data?.rank ?? null, finalMoney: state.farms[0].money });
  }),
};
