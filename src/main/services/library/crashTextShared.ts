/** Shared by the text crash child and its parent test: the text a given revision must contain. */
export function textForRevision(rev: number): {
  content: string
  segments: Array<{ start: number; end: number }>
} {
  const sentences = [
    'Bản ' + rev + ' — xin chào.',
    '山中药铺 ' + '😀'.repeat(1 + (rev % 7)) + '。',
    'Cuối cùng.'.repeat(1 + (rev % 3))
  ]
  let content = ''
  const segments: Array<{ start: number; end: number }> = []
  for (const sentence of sentences) {
    const start = content.length
    content += sentence
    segments.push({ start, end: content.length })
    content += '\r\n'
  }
  return { content, segments }
}
