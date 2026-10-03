/**
 * Removes secrets from text before it leaves the provider layer.
 *
 * Why here and not at the IPC edge: an error message does not only go to the renderer. It goes into
 * logs and into test output as well, and an endpoint that echoes a request back in its error body
 * (some do, with the `Authorization` header or the `key=` query included) would put the key into all
 * of them. Scrubbing where the error is created covers every place it can travel to.
 *
 * Three passes, because each catches what the others miss:
 *   1. the keys actually sent, verbatim and URL-encoded — the only pass that knows the real value;
 *   2. `Bearer <token>`, for a token this call did not know about;
 *   3. the value of a field whose *name* is sensitive, in JSON (`"api_key": "…"`) or a query (`key=…`).
 *
 * The idea (names plus the literal values that were sent) is how opencode's request executor does it.
 */

export const REDACTED = '<redacted>'

/** Shorter than this is more likely a real word than a key, and replacing it would shred the text. */
const MIN_SECRET_LENGTH = 4

const SENSITIVE_NAME =
  'authorization|api[-_]?key|access[-_]?token|refresh[-_]?token|id[-_]?token|token|secret|credential|signature|password'
const JSON_FIELD = new RegExp('("(?:' + SENSITIVE_NAME + ')"\\s*:\\s*)"[^"]*"', 'gi')
const QUERY_FIELD = new RegExp('(\\b(?:' + SENSITIVE_NAME + '|key)=)[^&\\s"\']+', 'gi')
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]{4,}/gi

export function redactSecrets(
  text: string,
  secrets: readonly (string | null | undefined)[] = []
): string {
  // Longest first, so a key that happens to contain another one is replaced as a whole.
  const known = secrets
    .filter(
      (secret): secret is string => typeof secret === 'string' && secret.length >= MIN_SECRET_LENGTH
    )
    .sort((a, b) => b.length - a.length)

  let out = text
  for (const secret of known) {
    out = out.split(secret).join(REDACTED)
    const encoded = encodeURIComponent(secret)
    if (encoded !== secret) out = out.split(encoded).join(REDACTED)
  }
  return out
    .replace(BEARER, 'Bearer ' + REDACTED)
    .replace(JSON_FIELD, '$1"' + REDACTED + '"')
    .replace(QUERY_FIELD, '$1' + REDACTED)
}

/** Longest part of a response body kept on an error. A body is evidence, not a document. */
export const BODY_EXCERPT_MAX = 2000

/**
 * A bounded, scrubbed piece of a response body for an error to carry.
 *
 * The order matters: **scrub first, cut second**. Cut first and a key straddling the cut would be
 * left as a prefix that no longer matches the literal, and the prefix of a key is still a leak.
 */
export function bodyExcerpt(
  body: string,
  secrets: readonly (string | null | undefined)[] = [],
  max = BODY_EXCERPT_MAX
): string {
  const clean = redactSecrets(body, secrets)
  return clean.length <= max ? clean : clean.slice(0, max) + '… (cắt bớt)'
}
