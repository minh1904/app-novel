/**
 * Đọc payload claims của JWT **không kiểm tra chữ ký**.
 * Dùng để điều hướng cuộc gọi (ID tài khoản, vùng dữ liệu) và xác định thời điểm hết hạn của token.
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

/** Lấy thời điểm hết hạn `exp` dưới dạng epoch ms nếu có trong token. */
export function jwtExpiry(token: string): number | null {
  const exp = jwtClaims(token)?.exp
  return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null
}
