/**
 * Bảo vệ an toàn: kiểm tra văn bản chuẩn bị ghi xuống đĩa không chứa khóa API
 * hoặc token xác thực.
 * Hàm thuần túy không phụ thuộc Node/DOM.
 */

const KEY_PATTERNS = [/AIza[0-9A-Za-z-_]{30,}/, /sk-[0-9A-Za-z-_]{20,}/, /Bearer\s+[A-Za-z0-9-_.]+/]

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
