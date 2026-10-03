import { describe, expect, it } from 'vitest'
import { parseSseStream } from './chatStream'

/**
 * Bộ đọc SSE, kiểm trên stream dựng tay chứ không qua HTTP.
 *
 * Hai test quan trọng nhất ở đây là "nửa event" và "nhiều event trong một chunk": đó là hai cách
 * một bộ đọc viết vội vẫn qua được mọi test "đường thẳng" rồi hỏng khi gặp mạng thật, vì mạng quyết
 * định ranh giới chunk, không phải nhà cung cấp.
 */

/** Một stream phát đúng các chunk đã cho — tức kiểm soát được ranh giới chunk. */
function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let index = 0
  return new ReadableStream({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(chunks[index++]))
    }
  })
}

async function collect(chunks: string[]): Promise<string[]> {
  const out: string[] = []
  for await (const event of parseSseStream(streamOf(chunks))) out.push(event.data)
  return out
}

describe('parseSseStream', () => {
  it('đọc từng event phân cách bằng một dòng trống', async () => {
    expect(await collect(['data: one\n\ndata: two\n\ndata: [DONE]\n\n'])).toEqual(['one', 'two'])
  })

  it('dừng ở [DONE] và bỏ phần sau nó', async () => {
    expect(await collect(['data: one\n\ndata: [DONE]\n\ndata: late\n\n'])).toEqual(['one'])
  })

  // Ranh giới chunk do mạng quyết định: một event có thể bị cắt ở bất kỳ đâu, kể cả giữa `data:`.
  it('ghép một event bị cắt qua nhiều chunk', async () => {
    expect(await collect(['da', 'ta: he', 'llo wor', 'ld\n', '\ndata: [DONE]\n\n'])).toEqual([
      'hello world'
    ])
  })

  it('đọc hết nhiều event nằm trong cùng một chunk', async () => {
    expect(await collect(['data: a\n\ndata: b\n\ndata: c\n\n'])).toEqual(['a', 'b', 'c'])
  })

  it('bỏ qua khối chỉ có comment giữ kết nối sống', async () => {
    expect(await collect([': ping\n\ndata: a\n\n: ping\n\ndata: b\n\n'])).toEqual(['a', 'b'])
  })

  it('chịu được ranh giới CRLF', async () => {
    expect(await collect(['data: a\r\n\r\ndata: b\r\n\r\n'])).toEqual(['a', 'b'])
  })

  it('nối nhiều dòng data trong một event bằng \\n', async () => {
    expect(await collect(['data: first\ndata: second\n\n'])).toEqual(['first\nsecond'])
  })

  it('giữ nguyên JSON có dấu hai chấm và khoảng trắng bên trong', async () => {
    const payload = '{"choices":[{"delta":{"content":"a: b"}}]}'
    expect(await collect(['data: ' + payload + '\n\n'])).toEqual([payload])
  })

  // Task 3.3: nhà cung cấp cắt sớm là chuyện có thật; ở tầng này nó không phải lỗi, chỉ là hết.
  it('kết thúc gọn khi stream hết mà không có [DONE]', async () => {
    expect(await collect(['data: a\n\ndata: b\n\n'])).toEqual(['a', 'b'])
  })

  it('trả event cuối chưa được dòng trống đóng lại', async () => {
    expect(await collect(['data: a\n\ndata: cut'])).toEqual(['a', 'cut'])
  })

  it('không trả gì khi stream rỗng', async () => {
    expect(await collect([])).toEqual([])
    expect(await collect([''])).toEqual([])
  })

  // Một chữ tiếng Việt nhiều byte bị cắt đúng giữa hai chunk: thiếu decode theo dòng thì ra dấu
  // thay thế, và lỗi đó chỉ hiện với tiếng Việt nên rất dễ lọt.
  it('ghép đúng ký tự UTF-8 bị cắt giữa hai chunk', async () => {
    const encoder = new TextEncoder()
    const bytes = encoder.encode('data: Tuệ\n\n')
    const cut = 8 // giữa hai byte của "ệ"
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, cut))
        controller.enqueue(bytes.slice(cut))
        controller.close()
      }
    })
    const out: string[] = []
    for await (const event of parseSseStream(stream)) out.push(event.data)
    expect(out).toEqual(['Tuệ'])
  })

  it('nhả reader khi người tiêu thụ dừng sớm', async () => {
    const stream = streamOf(['data: a\n\ndata: b\n\n'])
    for await (const event of parseSseStream(stream)) {
      expect(event.data).toBe('a')
      break
    }
    // Nhả rồi thì khóa lại được; còn giữ thì dòng dưới ném.
    expect(() => stream.getReader().releaseLock()).not.toThrow()
  })
})
