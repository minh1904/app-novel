/**
 * The claims of a JWT, read **without checking its signature**. Mira only uses them to route a call (which
 * ChatGPT account, which residency) and to know when a token runs out; the provider checks the token itself
 * on every call, so a forged claim gets nothing but a refused request.
 */
export function jwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const json = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
      'utf8'
    )
    const claims: unknown = JSON.parse(json)
    return claims !== null && typeof claims === 'object'
      ? (claims as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/** `exp` as ms epoch, when the token has one. */
export function jwtExpiry(token: string): number | null {
  const exp = jwtClaims(token)?.exp
  return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null
}
