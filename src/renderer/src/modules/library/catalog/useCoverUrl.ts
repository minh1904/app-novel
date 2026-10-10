import { useEffect, useState } from 'react'

/**
 * Covers are fetched on demand and kept for the session, keyed by work and cover version, so a
 * changed cover is fetched once and unchanged ones are never fetched twice.
 */
const cache = new Map<string, Promise<string | null>>()

function loadCover(id: string, version: number): Promise<string | null> {
  const key = id + ':' + version
  let pending = cache.get(key)
  if (!pending) {
    pending = window.mira.works.getCover(id).then((result) => (result.ok ? result.value : null))
    cache.set(key, pending)
    // A failed or empty load must not stick: allow a retry on the next mount.
    void pending.then((url) => {
      if (url === null) cache.delete(key)
    })
  }
  return pending
}

/** The work's cover as a data URL once loaded, or null (no cover, or still loading). */
export function useCoverUrl(id: string, version: number | undefined): string | null {
  const key = version === undefined ? null : id + ':' + version
  const [loaded, setLoaded] = useState<{ key: string; url: string | null } | null>(null)

  useEffect(() => {
    if (version === undefined) return
    const wanted = id + ':' + version
    let active = true
    void loadCover(id, version).then((url) => {
      if (active) setLoaded({ key: wanted, url })
    })
    return () => {
      active = false
    }
  }, [id, version])

  return key !== null && loaded?.key === key ? loaded.url : null
}
