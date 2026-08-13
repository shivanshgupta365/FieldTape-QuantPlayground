/**
 * In-game coach client.
 *
 * Calls the `coach` edge function, which holds the provider keys. The browser
 * never sees an API key — anything a `VITE_` variable touches is compiled into
 * the bundle and readable by any visitor.
 *
 * Degrades to built-in advice when no provider is configured or the network
 * fails, so the coach panel is never empty and never blocks play.
 */

import { hasSupabase, supabase } from "./supabase"

export interface CoachState {
  day: number
  hour: number
  money: number
  workers: number
  plantedTiles: number
  dryTiles: number
  readyTiles: number
  unlockedTiles: number
  stockUnits: number
}

export interface CoachReply {
  advice: string
  /** Which provider answered, or "local" for the offline fallback. */
  source: string
}

/**
 * Deterministic fallback advice.
 *
 * Ordered by urgency, not by cleverness: a dying crop always outranks a market
 * opinion, because losing a planted tile is the most expensive mistake in the
 * game and the one new players make most.
 */
export function localAdvice(state: CoachState): string {
  if (state.dryTiles > 0) {
    const capacity = state.workers * 24
    if (state.dryTiles > capacity) {
      return `${state.dryTiles} tiles are dry and you only have ${capacity} actions today. You cannot save them all — water the most valuable and accept the loss on the rest.`
    }
    return `${state.dryTiles} tiles are unwatered. Water them before anything else; two dry days and the seed money is gone.`
  }
  if (state.readyTiles > 0) {
    return `${state.readyTiles} tiles are ready. Harvest them before they pass their window, then sell in slices rather than all at once.`
  }
  if (state.day >= 25 && state.money > 400) {
    return "Only a few days left. Anything slow will not mature in time — stick to fast crops or bank the cash."
  }
  if (state.plantedTiles === 0) {
    return "Nothing is planted. Start with something cheap and quick to get cash flowing before you commit to a slow crop."
  }
  const idle = state.unlockedTiles - state.plantedTiles
  if (idle > 6 && state.money > 300 && state.day < 20) {
    return `${idle} tiles are idle and you have coins to spend. Plant more only if you can still water everything tomorrow.`
  }
  return "The farm is in good shape. Watch your action budget before expanding — unwatered land is worse than empty land."
}

export async function askCoach(state: CoachState): Promise<CoachReply> {
  if (!hasSupabase || !supabase) {
    return { advice: localAdvice(state), source: "local" }
  }

  try {
    const { data, error } = await supabase.functions.invoke("coach", { body: state })
    if (error) throw new Error(error.message)
    const reply = data as { advice?: string; provider?: string }
    if (!reply?.advice) throw new Error("empty advice")
    return { advice: reply.advice, source: reply.provider ?? "server" }
  } catch {
    // Never surface an LLM outage as a broken UI. The local coach is good
    // enough that most players will not notice which one answered.
    return { advice: localAdvice(state), source: "local" }
  }
}
