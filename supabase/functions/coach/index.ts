/**
 * In-game coach. Turns the player's current board into one piece of advice.
 *
 * Deliberately narrow: it receives a small summary of public game state, never
 * the whole game, and it returns prose. It cannot take actions, so a confused
 * model cannot damage a season.
 *
 * Keys live here, never in the browser bundle. See _shared/llm.ts.
 */

import { NoProviderAvailable, availableProviders, complete } from "../_shared/llm.ts"

const CORS = {
  "access-control-allow-origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "access-control-allow-headers": "authorization, content-type, apikey",
  "access-control-allow-methods": "POST, OPTIONS",
}

const SYSTEM = `You are the farm coach in Alpstead, a cosy alpine farming game
set above Lake Lucerne. The player has 30 in-game days and 24 actions per worker
per day. Watering costs one action per tile per day; an unwatered crop dies after
two dry days. Selling into the market pushes that price down.

Give exactly one concrete, specific suggestion for the player's next move or two.
Two sentences maximum. Warm and plain-spoken, never a lecture, no bullet points,
no preamble. If the board looks fine, say what to watch for next instead of
inventing a problem.`

interface Body {
  day?: number
  hour?: number
  money?: number
  workers?: number
  plantedTiles?: number
  dryTiles?: number
  readyTiles?: number
  unlockedTiles?: number
  stockUnits?: number
}

function summarise(b: Body): string {
  const parts = [
    `Day ${b.day ?? "?"} of 30, hour ${b.hour ?? "?"} of 24.`,
    `Bank ${b.money ?? 0} coins.`,
    `${b.workers ?? 1} worker(s), so ${(b.workers ?? 1) * 24} actions today.`,
    `${b.plantedTiles ?? 0} planted of ${b.unlockedTiles ?? 25} unlocked tiles.`,
    `${b.dryTiles ?? 0} tiles unwatered.`,
    `${b.readyTiles ?? 0} tiles ready to harvest.`,
    `${b.stockUnits ?? 0} units in the shed.`,
  ]
  return parts.join(" ")
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS })

  if (request.method !== "POST") {
    return json({ error: "POST only" }, 405)
  }

  const available = availableProviders()
  if (available.length === 0) {
    // An explicit, actionable message beats a generic 500 during setup.
    return json(
      {
        error: "no_provider_configured",
        detail:
          "Set at least one of FASTROUTER_API_KEY, GEMINI_API_KEY, SARVAM_API_KEY or ANTHROPIC_API_KEY on the function.",
      },
      503,
    )
  }

  let body: Body
  try {
    body = await request.json()
  } catch {
    return json({ error: "invalid_json" }, 400)
  }

  try {
    const result = await complete({
      system: SYSTEM,
      user: summarise(body),
      maxTokens: 220,
      temperature: 0.65,
    })
    return json({ advice: result.text, provider: result.provider, model: result.model })
  } catch (error) {
    if (error instanceof NoProviderAvailable) {
      return json({ error: "all_providers_failed", detail: error.message }, 502)
    }
    return json({ error: "coach_failed" }, 500)
  }
})

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  })
}
