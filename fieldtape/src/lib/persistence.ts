/**
 * Server-backed persistence. Replaces the previous IndexedDB (Dexie) store.
 *
 * The local store made every player's progress invisible to everyone else and
 * unrecoverable on a new device — fine for an offline lab, wrong for a product
 * with accounts and a leaderboard. Progress now lives in Supabase against the
 * signed-in user.
 *
 * All writes no-op when signed out rather than throwing. A guest browsing the
 * Lab should not hit an error dialog for reading a page.
 */

import { hasSupabase, supabase } from "./supabase"

async function currentUserId(): Promise<string | null> {
  if (!hasSupabase || !supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export interface ModuleProgress {
  moduleId: string
  masteryScore: number
  lessonState?: Record<string, unknown>
}

export async function saveModuleProgress(progress: ModuleProgress): Promise<boolean> {
  const userId = await currentUserId()
  if (!userId || !supabase) return false

  const { error } = await supabase.from("user_progress").upsert(
    {
      user_id: userId,
      module_id: progress.moduleId,
      mastery_score: progress.masteryScore,
      lesson_state: progress.lessonState ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,module_id" },
  )

  if (error) {
    console.error("saveModuleProgress failed", error.message)
    return false
  }
  return true
}

export async function loadModuleProgress(
  moduleId: string,
): Promise<ModuleProgress | null> {
  const userId = await currentUserId()
  if (!userId || !supabase) return null

  const { data, error } = await supabase
    .from("user_progress")
    .select("module_id,mastery_score,lesson_state")
    .eq("user_id", userId)
    .eq("module_id", moduleId)
    .maybeSingle()

  if (error || !data) return null
  return {
    moduleId: data.module_id as string,
    masteryScore: data.mastery_score as number,
    lessonState: (data.lesson_state ?? {}) as Record<string, unknown>,
  }
}

export async function loadAllModuleProgress(): Promise<ModuleProgress[]> {
  const userId = await currentUserId()
  if (!userId || !supabase) return []
  const { data, error } = await supabase
    .from("user_progress")
    .select("module_id,mastery_score,lesson_state")
    .eq("user_id", userId)
  if (error) return []
  return (data ?? []).map((row) => ({
    moduleId: row.module_id as string,
    masteryScore: row.mastery_score as number,
    lessonState: (row.lesson_state ?? {}) as Record<string, unknown>,
  }))
}

export interface NotebookEntry {
  title: string
  hypothesis: string
  parameters: Record<string, unknown>
  result: string
}

export async function saveNotebook(entry: NotebookEntry): Promise<boolean> {
  const userId = await currentUserId()
  if (!userId || !supabase) return false

  const { error } = await supabase.from("research_notebooks").insert({
    user_id: userId,
    title: entry.title,
    module_id: "research",
    hypothesis: entry.hypothesis,
    analysis: entry.result,
    scenario_snapshot: entry.parameters,
    result_snapshot: { summary: entry.result },
  })

  if (error) {
    console.error("saveNotebook failed", error.message)
    return false
  }
  return true
}
