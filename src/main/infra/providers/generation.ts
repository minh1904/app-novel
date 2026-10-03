import { createHash } from 'node:crypto'
import { taskLimit, type ModelSettings } from '../../../shared/contracts/modelSettings'
import type { ChatRequest } from './openAiChatTransport'

/**
 * The one place where what a person set on a model entry becomes what a request carries (design D5 of
 * change `ai-model-settings`). Translation and chat both call it, so the two cannot drift apart.
 *
 * The rule is **send only what was switched on**. A parameter that is absent, switched off, or zero where
 * zero means "automatic" does not appear in the request at all, and an entry nobody touched produces the
 * request the app made before settings existed.
 */

/** The parameters of `ChatRequest` that come from settings. */
export type Generation = Pick<
  ChatRequest,
  'maxTokens' | 'temperature' | 'topP' | 'reasoningEffort' | 'extraBody' | 'extraHeaders'
>

/** What an entry has: the real model name and the settings. The display name is nobody's business here. */
export interface EntryLike {
  model: string
  settings: ModelSettings
}

function isEmpty(object: Record<string, unknown>): boolean {
  return Object.keys(object).length === 0
}

export function buildGeneration(settings: ModelSettings): Generation {
  const generation: Generation = {}

  const maxTokens = taskLimit(settings.outputTokenLimit)
  if (maxTokens !== undefined) generation.maxTokens = maxTokens

  if (settings.temperature?.enabled === true) generation.temperature = settings.temperature.value
  if (settings.topP?.enabled === true) generation.topP = settings.topP.value

  // "Default" is the absence of a level and sends nothing. "Off" is a value: the one an endpoint reads as
  // switching thinking off (Gemini: `reasoning_effort: "none"`, measured; design D4).
  if (settings.thinking !== undefined) {
    generation.reasoningEffort = settings.thinking === 'off' ? 'none' : settings.thinking
  }

  // An empty object adds nothing to a request, so it is the same as not being set.
  if (settings.extraHeaders?.enabled === true && !isEmpty(settings.extraHeaders.value)) {
    generation.extraHeaders = settings.extraHeaders.value
  }
  if (settings.extraBody?.enabled === true && !isEmpty(settings.extraBody.value)) {
    generation.extraBody = settings.extraBody.value
  }
  return generation
}

/** JSON with the keys of every object in order, so two equal values always give the same text. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']'
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return (
      '{' +
      entries.map(([key, item]) => JSON.stringify(key) + ':' + canonicalJson(item)).join(',') +
      '}'
    )
  }
  return JSON.stringify(value) ?? 'null'
}

/**
 * A fingerprint of the configuration a translation was planned with. Each batch of a chapter sends it back
 * and the main process recomputes it from the entry as it is now; if they differ, the batch is not sent
 * (design D6), so one chapter never ends up half in one configuration and half in another.
 *
 * It is made of what the request is built from — the real model name, the generation parameters and the
 * input-token limit that decides how the chapter was cut — and of nothing else. So it changes when
 * the output could change, and does **not** change for:
 *  - the display name,
 *  - concurrency and RPM, which change how fast, not what (and which may be adjusted mid-run),
 *  - a value that is switched off, because it is not sent.
 *
 * A hash and not the configuration itself, so IPC does not carry a 4 KB `extra_body` with every batch.
 */
export function settingsKey(entry: EntryLike): string {
  const basis = {
    model: entry.model,
    generation: buildGeneration(entry.settings),
    inputTokenLimit: taskLimit(entry.settings.inputTokenLimit) ?? null
  }
  return createHash('sha256').update(canonicalJson(basis)).digest('hex')
}
