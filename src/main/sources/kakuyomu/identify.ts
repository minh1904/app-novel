// Canonical identify for Kakuyomu: two URL patterns, no network.

const WORK_PATTERN = /^\/works\/(\d+)$/
const EPISODE_PATTERN = /^\/works\/(\d+)\/episodes\/(\d+)$/

export interface KakuyomuIdentity {
  remoteWorkId: string
  canonicalUrl: string
  inputRemoteChapterId?: string
}

/**
 * Identifies a Kakuyomu URL. Returns null for any non-matching or unsafe URL.
 * Never makes a network request.
 */
export function identifyKakuyomu(input: string): KakuyomuIdentity | null {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return null
  }
  // Exact origin, HTTPS, no credentials, no non-default port
  if (url.protocol !== 'https:') return null
  if (url.hostname !== 'kakuyomu.jp') return null
  if (url.username || url.password) return null
  if (url.port !== '' && url.port !== '443') return null

  const pathname = url.pathname.replace(/\/+$/, '') // strip trailing slash

  const episodeMatch = EPISODE_PATTERN.exec(pathname)
  if (episodeMatch) {
    const workId = episodeMatch[1]
    const episodeId = episodeMatch[2]
    // IDs must be positive numeric strings (no leading zeros for non-zero)
    if (!isPositiveNumeric(workId) || !isPositiveNumeric(episodeId)) return null
    return {
      remoteWorkId: workId,
      canonicalUrl: `https://kakuyomu.jp/works/${workId}`,
      inputRemoteChapterId: episodeId
    }
  }

  const workMatch = WORK_PATTERN.exec(pathname)
  if (workMatch) {
    const workId = workMatch[1]
    if (!isPositiveNumeric(workId)) return null
    return {
      remoteWorkId: workId,
      canonicalUrl: `https://kakuyomu.jp/works/${workId}`
    }
  }

  return null
}

function isPositiveNumeric(s: string): boolean {
  return /^[1-9]\d*$/.test(s)
}
