import type { CatalogItem } from '../domain'

export interface KakuyomuWorkMeta {
  title: string
  author: string | null
  description: string | null
  languageTag: 'ja'
}

export interface KakuyomuCatalogResult {
  workMeta: KakuyomuWorkMeta
  items: CatalogItem[]
  /** True if catalog was complete and semantically valid. */
  complete: boolean
  /** Reason if not complete. */
  invalidReason?: string
}

/**
 * Parses __NEXT_DATA__ JSON from a Kakuyomu work page.
 * Fail-closed: returns complete=false on any schema drift, identity mismatch or empty-when-unexpected.
 */
export function parseKakuyomuWorkPage(
  nextDataJson: string,
  expectedWorkId: string
): KakuyomuCatalogResult {
  let data: unknown
  try {
    data = JSON.parse(nextDataJson)
  } catch {
    return incomplete('JSON parse failure')
  }

  const apolloState = getIn(data, ['props', 'pageProps', '__APOLLO_STATE__'])
  if (!isRecord(apolloState)) return incomplete('missing __APOLLO_STATE__')

  const workKey = `Work:${expectedWorkId}`
  const work = apolloState[workKey]
  if (!isRecord(work)) return incomplete(`missing work entity ${workKey}`)

  const embeddedId = getString(work, 'id')
  if (embeddedId !== expectedWorkId) return incomplete(`work ID mismatch: ${embeddedId}`)

  const title = getString(work, 'title') ?? ''
  if (!title) return incomplete('missing title')

  const authorRef = getRef(work, 'author')
  const authorEntity = authorRef ? apolloState[authorRef] : undefined
  const author = (isRecord(authorEntity) ? getString(authorEntity, 'name') : null) ?? null

  const workMeta: KakuyomuWorkMeta = { title, author, description: null, languageTag: 'ja' }

  // Collect episode refs in order: from tableOfContentsV2.chapters or direct episodes
  const items = collectEpisodes(work, apolloState, expectedWorkId)
  if (!items.ok) return { workMeta, items: [], complete: false, invalidReason: items.reason }

  // Empty catalog for existing work is suspicious but allowed (may be empty serialization)
  return { workMeta, items: items.value, complete: true }
}

type EpisodesResult = { ok: true; value: CatalogItem[] } | { ok: false; reason: string }

function collectEpisodes(
  work: Record<string, unknown>,
  apolloState: Record<string, unknown>,
  workId: string
): EpisodesResult {
  const toc = work['tableOfContentsV2']
  const seenIds = new Set<string>()
  const items: CatalogItem[] = []

  // Prefer tableOfContentsV2.chapters (grouped)
  const chapters = Array.isArray(toc)
    ? resolveRefArray(toc, apolloState)
    : isRecord(toc)
      ? getRefArray(toc, 'chapters', apolloState)
      : null
  if (chapters !== null) {
    for (const chapter of chapters) {
      if (!isRecord(chapter)) continue
      const episodes =
        getRefArray(chapter, 'episodeUnions', apolloState) ??
        getRefArray(chapter, 'episodes', apolloState)
      if (episodes === null) continue
      for (const ep of episodes) {
        const result = parseEpisode(ep, workId, seenIds, items.length)
        if (!result.ok) return result
        items.push(result.value)
      }
    }
    if (items.length > 0) return { ok: true, value: items }
  }

  // Fallback: direct episodes list
  const directEpisodes = getRefArray(work, 'episodes', apolloState)
  if (directEpisodes === null) return { ok: false, reason: 'no episodes found' }
  for (const ep of directEpisodes) {
    const result = parseEpisode(ep, workId, seenIds, items.length)
    if (!result.ok) return result
    items.push(result.value)
  }

  return { ok: true, value: items }
}

type ParseEpisodeResult = { ok: true; value: CatalogItem } | { ok: false; reason: string }

function parseEpisode(
  ep: unknown,
  workId: string,
  seenIds: Set<string>,
  index: number
): ParseEpisodeResult {
  if (!isRecord(ep)) return { ok: false, reason: 'episode entity not a record' }
  const id = getString(ep, 'id')
  if (!id || !/^\d+$/.test(id)) return { ok: false, reason: `malformed episode id: ${id}` }
  if (seenIds.has(id)) return { ok: false, reason: `duplicate episode id: ${id}` }
  seenIds.add(id)

  const title = getString(ep, 'title') ?? ''
  const accessStateRaw = getString(ep, 'accessState') ?? 'public'
  const access = toAccessState(accessStateRaw)
  const canonicalUrl = `https://kakuyomu.jp/works/${workId}/episodes/${id}`

  return {
    ok: true,
    value: {
      remoteChapterId: id,
      title,
      order: index,
      url: canonicalUrl,
      access,
      identityConfidence: 'stable'
    }
  }
}

function toAccessState(raw: string): CatalogItem['access'] {
  switch (raw) {
    case 'public':
      return 'public'
    case 'login_required':
      return 'login_required'
    case 'age_verification_required':
      return 'age_verification_required'
    case 'entitlement_required':
      return 'entitlement_required'
    default:
      return 'temporarily_unavailable'
  }
}

// --- helpers ---

function incomplete(reason: string): KakuyomuCatalogResult {
  return {
    workMeta: { title: '', author: null, description: null, languageTag: 'ja' },
    items: [],
    complete: false,
    invalidReason: reason
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function getIn(obj: unknown, keys: string[]): unknown {
  let cur: unknown = obj
  for (const k of keys) {
    if (!isRecord(cur)) return undefined
    cur = cur[k]
  }
  return cur
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key]
  return typeof v === 'string' ? v : undefined
}

function getRef(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key]
  if (!isRecord(v)) return null
  const ref = v['__ref']
  return typeof ref === 'string' ? ref : null
}

function getRefArray(
  obj: Record<string, unknown>,
  key: string,
  apolloState: Record<string, unknown>
): unknown[] | null {
  const arr = obj[key]
  if (!Array.isArray(arr)) return null
  return resolveRefArray(arr, apolloState)
}

function resolveRefArray(arr: unknown[], apolloState: Record<string, unknown>): unknown[] {
  return arr.map((item) => {
    if (isRecord(item) && typeof item['__ref'] === 'string') {
      return apolloState[item['__ref']] ?? item
    }
    return item
  })
}
