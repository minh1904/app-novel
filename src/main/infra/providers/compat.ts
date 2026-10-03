/**
 * What an OpenAI-compatible endpoint does differently from OpenAI itself.
 *
 * Kept as **data keyed by the preset's provider id**, not as `if (url.includes(...))` inside shared
 * code (design D10 of change `ai-gateway`). Continue shows how that ends: URL sniffing spreads through
 * the common methods until nobody can say what a given endpoint will be sent. pi-ai keeps a larger
 * record but resolves it in one function, which is the shape taken here, at a size Mira actually uses.
 *
 * Every value in the table is a **starting value pending a real call** (task 1 of the change). A wrong
 * entry is a one-line fix here, not a change to how requests are built.
 *
 * This record says what the *shape* of a request is (which field carries the cap, whether to ask for usage
 * in a stream). It never decides whether a parameter the person chose is sent: that was once a
 * `reasoningEffort` flag here that quietly dropped the parameter, and it is gone (design D7 of change
 * `ai-model-settings`). A parameter the person set is sent; if the provider refuses it, they are told.
 */
export interface Compat {
  /** Which field carries the output-token cap. OpenAI moved to `max_completion_tokens`; most others kept `max_tokens`. */
  maxTokensField: 'max_tokens' | 'max_completion_tokens'
  /** Whether to ask for token usage inside a stream (`stream_options.include_usage`). */
  streamUsage: boolean
}

/** What an endpoint we know nothing about is assumed to be: standard OpenAI. */
const OPENAI_STANDARD: Compat = {
  maxTokensField: 'max_completion_tokens',
  streamUsage: true
}

/**
 * Differences from the standard, by `providerId` of the preset (the id used for the price catalog).
 *
 * Only Google is listed: Gemini is the one provider the app is used with today. The others get the
 * standard until someone uses them and a real call says otherwise.
 */
const BY_PROVIDER: Readonly<Record<string, Partial<Compat>>> = {
  // Gemini's compat page lists `max_tokens`; whether it also takes `max_completion_tokens` is one of the
  // questions the capture script asks (scenarios `max-tokens` and `max-completion-tokens`).
  google: { maxTokensField: 'max_tokens' }
}

/** The compat record for a connection: the preset's entry over the standard, then the caller's override. */
export function resolveCompat(
  providerId: string | null | undefined,
  override: Partial<Compat> = {}
): Compat {
  // `hasOwn`, so an id like `constructor` cannot resolve to something inherited from `Object`.
  const preset =
    providerId !== null && providerId !== undefined && Object.hasOwn(BY_PROVIDER, providerId)
      ? BY_PROVIDER[providerId]
      : undefined
  return { ...OPENAI_STANDARD, ...preset, ...override }
}
