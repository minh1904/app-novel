/** Normalize Japanese full-width digits (０-９) to standard half-width (0-9). */
export function normalizeFullWidthDigits(text: string): string {
  return text.replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
}

/** Extract integer chapter number from titles like 'Chương 1', 'Chapter 02', '第4章', '第１０話', '003 - Title'. */
export function extractChapterNumber(title: string): number | null {
  const normalized = normalizeFullWidthDigits(title).trim()

  // 1. Explicit keyword prefix: chương, chapter, ch, hồi, tập, đoạn, thứ, 第
  const prefixMatch = /(?:^|\b)(?:chương|chapter|ch|hồi|tập|đoạn|thứ|第)\s*(\d+)/i.exec(normalized)
  if (prefixMatch) {
    const num = Number.parseInt(prefixMatch[1], 10)
    if (!Number.isNaN(num) && num > 0) return num
  }

  // 2. Counter suffix at start: 10話, 10章
  const suffixMatch = /^\s*(\d+)\s*(?:話|章)/i.exec(normalized)
  if (suffixMatch) {
    const num = Number.parseInt(suffixMatch[1], 10)
    if (!Number.isNaN(num) && num > 0) return num
  }

  // 3. Leading number followed by delimiter ('01 - Title', '003. Title'), avoiding years (>= 1000) or quantities ('3 cô gái')
  const leadingMatch = /^\s*(\d{1,3})\s*(?:[-.]\s+)/i.exec(normalized)
  if (leadingMatch) {
    const num = Number.parseInt(leadingMatch[1], 10)
    if (!Number.isNaN(num) && num > 0) return num
  }

  return null
}
