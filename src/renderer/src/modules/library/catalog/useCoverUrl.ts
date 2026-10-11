import { useEffect, useState } from 'react'

/**
 * Tải ảnh bìa theo nhu cầu và lưu bộ nhớ đệm trong phiên làm việc theo khóa id và phiên bản ảnh bìa,
 * giúp chỉ tải một lần cho mỗi phiên bản ảnh và không tải lại nếu ảnh không thay đổi.
 */
const cache = new Map<string, Promise<string | null>>()

function loadCover(id: string, version: number): Promise<string | null> {
  const key = id + ':' + version
  let pending = cache.get(key)
  if (!pending) {
    pending = window.mira.works.getCover(id).then((result) => (result.ok ? result.value : null))
    cache.set(key, pending)
    // Nếu tải thất bại hoặc trả về rỗng, xóa khỏi cache để cho phép thử lại ở lần mount tiếp theo.
    void pending.then((url) => {
      if (url === null) cache.delete(key)
    })
  }
  return pending
}

/** Trả về data URL của ảnh bìa sau khi tải xong, hoặc null nếu không có ảnh hoặc đang tải. */
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
