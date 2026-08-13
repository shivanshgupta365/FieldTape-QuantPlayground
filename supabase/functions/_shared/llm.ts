/**
 * Provider-agnostic LLM layer for Alpstead's in-game coach.
 *
 * Four providers behind one interface, tried in order until one answers, so a
 * quota wall on any single vendor never takes the game's AI features down:
 *
 *   fastrouter  OpenAI-compatible router; one key, many upstream models
 *   gemini      Google Generative Language API
 *   sarvam      Sarvam AI (OpenAI-compatible chat completions)
 *   anthropic   Claude Messages API
 *
 * THIS RUNS SERVER-SIDE ONLY, and that is not incidental. Any key reachable
 * from the browser is public — a `VITE_`-prefixed secret is compiled into the
 * client bundle for anyone to read. The game calls an edge function; the edge
 * function holds the keys.
 *
 * Configure whichever you have. Order is controlled by LLM_PROVIDER_ORDER, e.g.
 *   LLM_PROVIDER_ORDER=gemini,fastrouter,sarvam,anthropic
 */

export type ProviderId = "fastrouter" | "gemini" | "sarvam" | "anthropic"

export interface LlmRequest {
  system: string
  user: string
  maxTokens?: number
  temperature?: number
}

export interface LlmResult {
  text: string
  provider: ProviderId
  model: string
}

export class NoProviderAvailable extends Error {
  constructor(public readonly attempts: Array<{ provider: ProviderId; error: string }>) {
    super(
      `No LLM provider answered. Tried: ${
        attempts.map((a) => `${a.provider} (${a.error})`).join("; ") || "none configured"
      }`,
    )
    this.name = "NoProviderAvailable"
  }
}

interface ProviderConfig {
  id: ProviderId
  key: string | undefined
  model: string
  call: (req: LlmRequest, key: string, model: string) => Promise<string>
}

const DEFAULT_ORDER: ProviderId[] = ["fastrouter", "gemini", "sarvam", "anthropic"]

function env(name: string): string | undefined {
  // deno-lint-ignore no-explicit-any
  const d = (globalThis as any).Deno
  return d?.env?.get?.(name) ?? undefined
}

/** Shared timeout so one hung vendor cannot stall the whole chain. */
async function post(
  url: string,
  init: RequestInit,
  timeoutMs = 20_000,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function readError(response: Response): Promise<string> {
  const body = await response.text().catch(() => "")
  return `${response.status} ${body.slice(0, 180)}`
}

/** OpenAI-compatible chat completions. FastRouter and Sarvam both speak this. */
async function openAiCompatible(
  base: string,
  req: LlmRequest,
  key: string,
  model: string,
): Promise<string> {
  const response = await post(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 600,
      temperature: req.temperature ?? 0.7,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
    }),
  })
  if (!response.ok) throw new Error(await readError(response))
  const data = await response.json()
  const text = data?.choices?.[0]?.message?.content
  if (typeof text !== "string" || !text.trim()) throw new Error("empty completion")
  return text.trim()
}

async function callGemini(req: LlmRequest, key: string, model: string): Promise<string> {
  // Gemini takes the system prompt separately and wraps content in `parts`.
  const response = await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: "user", parts: [{ text: req.user }] }],
        generationConfig: {
          maxOutputTokens: req.maxTokens ?? 600,
          temperature: req.temperature ?? 0.7,
        },
      }),
    },
  )
  if (!response.ok) throw new Error(await readError(response))
  const data = await response.json()
  const parts = data?.candidates?.[0]?.content?.parts
  const text = Array.isArray(parts)
    ? parts.map((p: { text?: string }) => p.text ?? "").join("")
    : ""
  if (!text.trim()) throw new Error("empty completion")
  return text.trim()
}

async function callAnthropic(req: LlmRequest, key: string, model: string): Promise<string> {
  const response = await post("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 600,
      temperature: req.temperature ?? 0.7,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
    }),
  })
  if (!response.ok) throw new Error(await readError(response))
  const data = await response.json()
  const text = Array.isArray(data?.content)
    ? data.content.map((b: { text?: string }) => b.text ?? "").join("")
    : ""
  if (!text.trim()) throw new Error("empty completion")
  return text.trim()
}

function providers(): Record<ProviderId, ProviderConfig> {
  return {
    fastrouter: {
      id: "fastrouter",
      key: env("FASTROUTER_API_KEY"),
      model: env("FASTROUTER_MODEL") ?? "openai/gpt-4o-mini",
      call: (req, key, model) =>
        openAiCompatible(
          env("FASTROUTER_BASE_URL") ?? "https://go.fastrouter.ai/api/v1",
          req,
          key,
          model,
        ),
    },
    gemini: {
      id: "gemini",
      key: env("GEMINI_API_KEY"),
      model: env("GEMINI_MODEL") ?? "gemini-2.0-flash",
      call: callGemini,
    },
    sarvam: {
      id: "sarvam",
      key: env("SARVAM_API_KEY"),
      model: env("SARVAM_MODEL") ?? "sarvam-m",
      call: (req, key, model) =>
        openAiCompatible(
          env("SARVAM_BASE_URL") ?? "https://api.sarvam.ai/v1",
          req,
          key,
          model,
        ),
    },
    anthropic: {
      id: "anthropic",
      key: env("ANTHROPIC_API_KEY"),
      model: env("ANTHROPIC_MODEL") ?? "claude-sonnet-5",
      call: callAnthropic,
    },
  }
}

function order(): ProviderId[] {
  const raw = env("LLM_PROVIDER_ORDER")
  if (!raw) return DEFAULT_ORDER
  const wanted = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is ProviderId => DEFAULT_ORDER.includes(s as ProviderId))
  // Append anything unlisted, so adding a key never silently does nothing.
  return [...wanted, ...DEFAULT_ORDER.filter((p) => !wanted.includes(p))]
}

/** Which providers are usable right now. Safe to expose: names only, no keys. */
export function availableProviders(): ProviderId[] {
  const all = providers()
  return order().filter((id) => Boolean(all[id].key))
}

/**
 * Try each configured provider in order and return the first success.
 *
 * Failing over on *any* error is deliberate. Distinguishing "quota exhausted"
 * from "bad gateway" means parsing four vendors' error shapes, and every one of
 * them is a reason to try the next provider anyway.
 */
export async function complete(req: LlmRequest): Promise<LlmResult> {
  const all = providers()
  const attempts: Array<{ provider: ProviderId; error: string }> = []

  for (const id of order()) {
    const config = all[id]
    if (!config.key) continue
    try {
      const text = await config.call(req, config.key, config.model)
      return { text, provider: id, model: config.model }
    } catch (error) {
      attempts.push({
        provider: id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  throw new NoProviderAvailable(attempts)
}
