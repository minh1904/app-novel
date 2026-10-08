/**
 * Safety guard: checks that text to be written to disk does not contain any API keys
 * or authorization tokens (spec measure-runs R7).
 * Pure function with no Node/DOM dependencies.
 */

const KEY_PATTERNS = [
  /AIza[0-9A-Za-z-_]{30,}/,
  /sk-[0-9A-Za-z-_]{20,}/,
  /Bearer\s+[A-Za-z0-9-_.]+/
]

export function assertNoSecret(text: string, knownKeys: string[] = []): void {
  for (const key of knownKeys) {
    if (key && key.trim() !== '' && text.includes(key.trim())) {
      throw new Error('Nội dung chứa khóa API đã nạp: dừng ghi tệp ngay lập tức.')
    }
  }

  for (const pattern of KEY_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(`Nội dung chứa mẫu khóa API (${pattern.source}): dừng ghi tệp ngay lập tức.`)
    }
  }
}
