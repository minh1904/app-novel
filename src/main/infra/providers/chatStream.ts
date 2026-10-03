/**
 * Đọc một thân phản hồi `text/event-stream` thành từng event.
 *
 * Tách khỏi provider có chủ ý: đây là phần **không** biết gì về nhà cung cấp, về model hay về khóa,
 * nên nó test được bằng một stream dựng tay mà không cần HTTP. Hai ca ép buộc phải đúng, và cả hai
 * là nguồn lỗi kinh điển của mọi bộ đọc SSE viết vội: một chunk mạng có thể chứa **nửa** event, nên
 * bộ đệm phải sống qua nhiều lần đọc; và một chunk có thể chứa **nhiều** event, nên phải lặp cho
 * hết bộ đệm thay vì chỉ lấy event đầu.
 *
 * Phạm vi: chỉ đủ cho các endpoint tương thích OpenAI mà Mira gọi — trường `data:`, phân cách bằng
 * một dòng trống, kết thúc bằng `data: [DONE]`. Không cài `event:`, `id:` hay `retry:` của chuẩn
 * SSE: không endpoint nào trong phạm vi dùng tới, và cài sẵn thứ chưa ai gọi chỉ tạo mã không test.
 */

/** Trường `data` của một event, đã bỏ tiền tố và khoảng trắng dẫn. */
export interface SseEvent {
  data: string
}

const DONE = '[DONE]'

/**
 * Một khối event thô → `data` đã ghép.
 *
 * Trả `null` cho khối không mang `data` nào (khối chỉ có comment `:` giữ kết nối sống — nhà cung cấp
 * gửi nó khi câu trả lời lâu, và coi nó là event rỗng sẽ sinh ra `delta` rỗng vô nghĩa).
 */
function readBlock(block: string): string | null {
  const parts: string[] = []
  for (const rawLine of block.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
    if (line === '' || line.startsWith(':')) continue
    if (!line.startsWith('data:')) continue
    // Chuẩn SSE bỏ **một** khoảng trắng sau dấu hai chấm, không phải mọi khoảng trắng: JSON không
    // bắt đầu bằng khoảng trắng nên chỗ này không quan trọng với ta, nhưng làm đúng thì rẻ.
    const value = line.slice(5)
    parts.push(value.startsWith(' ') ? value.slice(1) : value)
  }
  if (parts.length === 0) return null
  // Nhiều dòng `data:` trong một event nối bằng `\n` theo chuẩn.
  return parts.join('\n')
}

/**
 * Lần lượt trả từng event của `stream` cho tới khi gặp `[DONE]` hoặc stream hết.
 *
 * Stream hết **không** có `[DONE]` không phải lỗi ở tầng này: iterable chỉ kết thúc. Nhà cung cấp
 * cắt sớm là chuyện có thật, và tầng trên mới biết điều đó có nghĩa gì — ở đây mà ném thì tầng trên
 * mất luôn phần chữ đã nhận được.
 */
export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<SseEvent> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      // `stream: true` của TextDecoder giữ lại byte lẻ của một ký tự UTF-8 bị cắt giữa hai chunk;
      // thiếu nó thì một chữ tiếng Việt nằm đúng ranh giới chunk sẽ thành dấu thay thế.
      buffer += decoder.decode(value, { stream: true })

      for (;;) {
        const end = findBoundary(buffer)
        if (end === null) break
        const block = buffer.slice(0, end.index)
        buffer = buffer.slice(end.index + end.length)
        const data = readBlock(block)
        if (data === null) continue
        if (data === DONE) return
        yield { data }
      }
    }

    // Phần còn trong bộ đệm khi stream hết: một event cuối không có dòng trống đóng lại.
    buffer += decoder.decode()
    const data = readBlock(buffer)
    if (data !== null && data !== DONE) yield { data }
  } finally {
    // Hủy giữa dòng đi qua đây: `return` sớm của người tiêu thụ chạy `finally`, nên reader được
    // nhả thay vì giữ kết nối treo.
    reader.releaseLock()
  }
}

/** Ranh giới event: một dòng trống, chịu được cả `\n\n` và `\r\n\r\n`. */
function findBoundary(buffer: string): { index: number; length: number } | null {
  const lf = buffer.indexOf('\n\n')
  const crlf = buffer.indexOf('\r\n\r\n')
  if (lf === -1 && crlf === -1) return null
  if (crlf !== -1 && (lf === -1 || crlf < lf)) return { index: crlf, length: 4 }
  return { index: lf, length: 2 }
}
