/**
 * Brings an address a person typed or pasted to the base the app appends paths to.
 *
 * People paste whatever their provider's docs show, and that is often the full endpoint
 * (`https://api.example.com/v1/chat/completions`), not the base. Appending `/chat/completions`
 * to that gives a doubled path and a 404 that reads like a wrong key. So the endpoint suffix is cut
 * off, and a trailing slash with it.
 *
 * Idempotent on purpose: it runs when a connection is saved and again when a request is sent, so a
 * connection stored before this existed is repaired without a migration.
 *
 * Only `/chat/completions` is cut. `/v1` and `/v1beta/openai` are part of a vendor's base, and
 * cutting them would break exactly the Gemini address this app ships as a preset.
 */
export function normalizeBaseUrl(url: string): string {
  return url
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/i, '')
    .replace(/\/+$/, '')
}
