import * as v from 'valibot'
import { idSchema, SOURCE_LANGUAGES } from './library'
import type { TokenUsage } from './usage'
import { TEXT_MAX_UNITS } from './text'
import type { ChatProposalResult } from './aiProposals'

/**
 * Hỏi AI về chỗ đang sửa: những gì đi qua IPC.
 *
 * Khác hẳn [dịch chương](aiTranslate.ts) ở ba điểm, và cả ba đều hiện ra trong kiểu dữ liệu dưới
 * đây. **Một**, câu trả lời về theo dòng, nên một lượt là `send` → nhiều `ChatChunk` → đúng một
 * `done` hoặc `error`, chứ không phải một lời gọi trả một kết quả. **Hai**, không có segment ID nào
 * đi theo: phản hồi là chữ tự do, không bị kiểm theo tập ID. **Ba**, lượt chat chỉ ghi bản dịch khi
 * người dùng chọn Áp dụng thẳng và kết quả qua cùng giao dịch Accept của đề xuất.
 *
 * Ngữ cảnh do **renderer** dựng rồi gửi lên, không phải main đọc kho — vì main chỉ thấy bản đã
 * lưu, còn người dùng vừa gõ sửa mấy câu và đang hỏi về chính mấy câu đó (D6 của change `ai-chat`).
 * Đổi lại, payload mang văn bản, nên mọi trần kích thước ở cuối tệp này là bắt buộc, không phải
 * phòng xa.
 */

/** Gửi chỉ trả lời; hai hành động viết tạo đề xuất có hoặc không tự Accept. Không có Agent (ADR-004). */
export const CHAT_MODES = ['hoi', 'sua', 'ap_dung'] as const
export type ChatMode = (typeof CHAT_MODES)[number]

/** Một lượt trong hội thoại. Lịch sử bền trong tác phẩm và đi kèm mỗi lần gửi. */
export interface ChatTurn {
  role: 'user' | 'assistant'
  text: string
}

/**
 * Các loại khối ngữ cảnh. Ba loại đầu dựng được ngay từ chương đang mở; `term` và `dyad` chờ change
 * `context-core` và sẽ do **main** dựng, nên danh sách khối là một mảng có nhãn ngay từ đầu — ghép
 * hai nguồn lại chỉ là nối mảng, không phải nối chuỗi.
 */
export const CHAT_CONTEXT_KINDS = [
  'chapter-source',
  'chapter-target',
  'range',
  'before',
  'after',
  'term',
  'dyad'
] as const
export type ChatContextKind = (typeof CHAT_CONTEXT_KINDS)[number]

/** Một khối đã gửi kèm câu hỏi. `detail` là dòng panel hiện ra; `text` là thứ thật sự gửi đi. */
export interface ChatContextBlock {
  kind: ChatContextKind
  /** Tiêu đề ngắn, ví dụ "Đoạn đang sửa". */
  label: string
  /** Phạm vi/nguồn của khối, ví dụ "3 câu liền trước". Không bao giờ là nội dung. */
  detail: string
  text: string
}

/** Phạm vi của bản dịch mà một lượt nhắm tới. `text` là nguyên văn đoạn đã gửi (D8). */
export interface ChatRange {
  from: number
  to: number
  text: string
  /** Segment của bản dịch giao với phạm vi, theo thứ tự trong chương. */
  targetIds: string[]
}

export interface ChatSendInput {
  /** Existing work-scoped session; omitted for the first turn of a new conversation. */
  sessionId?: string
  droppedTurns?: number
  range?: ChatRange | null
  /** Base captured with the visible context before a writing turn is sent. */
  proposalBase?: {
    sourceRev: number
    sourceContent: string
    targetRev: number
    targetContent: string
    blockAutoApply: boolean
  }
  /**
   * Tác phẩm và chương của lượt hỏi.
   *
   * Không phải để dựng ngữ cảnh — ngữ cảnh do renderer gửi lên (D6) — mà để **khóa phạm vi của
   * tool đọc**: một lượt chỉ được đọc trong đúng tác phẩm này, và `chapterId` cho biết "chương này"
   * là chương nào khi người dùng nói vậy.
   */
  workId: string
  chapterId: string
  connectionId: string
  /** Mục model dùng cho lượt này; cấu hình của nó được đọc một lần ở đầu lượt. */
  entryId: string
  mode: ChatMode
  sourceLang: (typeof SOURCE_LANGUAGES)[number]
  question: string
  /** Các lượt trước của phiên, cũ nhất trước. Rỗng ở lượt đầu. */
  history: ChatTurn[]
  context: ChatContextBlock[]
}

/** Main trả lời lệnh gửi. `addedContext` là khối main tự đọc từ kho và đã gửi kèm. */
export interface ChatStartResult {
  requestId: string
  sessionId?: string
  addedContext?: ChatContextBlock[]
}

export type ChatErrorKind =
  | 'rate_limited'
  | 'network'
  | 'timeout'
  | 'auth'
  | 'quota'
  | 'refused'
  | 'invalid_response'
  | 'cancelled'

export interface ChatError {
  kind: ChatErrorKind
  message: string
  /** Thử lại cùng câu hỏi có cơ hội thành công hay không. */
  retryable: boolean
  /** Mốc sớm nhất có khóa hồi phục, khi lỗi là hết hạn mức và biết được mốc đó. */
  recoverAt: number | null
}

export type ChatUsage = TokenUsage

/** Lý do một câu trả lời dừng, theo lời của app. `unknown` không được gửi đi: thiếu trường là "không biết". */
export type ChatFinishReason = 'stop' | 'length' | 'tool_calls' | 'filter'

/**
 * Một thông điệp của lượt đang chạy, đi main → renderer.
 *
 * Ba luật bất biến, và chúng là nội dung của test chứ không phải lời hứa trong comment:
 * một `requestId` nhận **đúng một** `done` **hoặc** `error` — không bao giờ cả hai, không bao giờ
 * hai lần; và không `delta` nào đến sau khi lượt đã kết thúc.
 */
export type ChatChunk =
  | { requestId: string; kind: 'delta'; text: string }
  /**
   * Model vừa **đọc** một thứ trong tác phẩm. Chỉ để panel nói rõ đã đọc gì — `detail` là một dòng
   * mô tả phạm vi, **không bao giờ** là nội dung đã đọc.
   */
  | { requestId: string; kind: 'tool'; name: string; detail: string }
  | {
      requestId: string
      kind: 'done'
      usage: ChatUsage | null
      /** `null` nghĩa là **chưa biết giá** của model này, không phải 0. */
      usd: number | null
      /** Bốn ký tự cuối của khóa đã dùng; `null` khi kết nối không có khóa. */
      keyTail: string | null
      /**
       * Vì sao câu trả lời dừng, **chỉ khi nhà cung cấp nói rõ**. `length` nghĩa là bị cắt vì hết giới hạn
       * đầu ra — câu trả lời chưa đủ — và trước đây không có gì phân biệt nó với một lượt xong êm.
       * Thiếu trường này nghĩa là không biết, không phải xong êm. Panel chưa dùng nó.
       */
      finishReason?: ChatFinishReason
      proposal?: Pick<ChatProposalResult, 'proposalId' | 'partId' | 'status'>
    }
  | {
      requestId: string
      kind: 'error'
      error: ChatError
      /** Đã nhận được chữ nào trước khi lỗi chưa — panel cần để biết có giữ chữ lại hay không. */
      partial: boolean
    }

/**
 * Trần kích thước. Lý do tồn tại: ngữ cảnh và lịch sử là **văn bản do renderer gửi lên**, nên nếu
 * không chặn thì một chương dài cộng một hội thoại dài đi qua IPC mỗi lượt. Các số này là trần
 * chống hỏng, không phải ngân sách token — ngân sách là việc của `useAiChat` (D10).
 */
export const CHAT_QUESTION_MAX = 4_000
export const CHAT_BLOCK_TEXT_MAX = 20_000
export const CHAT_BLOCKS_MAX = 40
export const CHAT_HISTORY_TURNS_MAX = 40
export const CHAT_TURN_TEXT_MAX = 20_000
/** Tổng mọi văn bản của một lần gửi: ngữ cảnh + lịch sử + câu hỏi. */
export const CHAT_TOTAL_TEXT_MAX = 200_000

/**
 * Hàng rào bọc khối thay thế ở chế độ Sửa.
 *
 * Nằm ở `shared` vì nó là **hợp đồng giữa hai bên**: main viết prompt yêu cầu hàng rào, renderer tách
 * hàng rào ra để dựng diff. Để nó ở một bên thì bên kia phải đoán lại quy ước, và hai bên lệch nhau
 * sẽ biểu hiện thành "nút Áp dụng không bao giờ hiện" — một lỗi rất khó lần.
 */
export const FENCE = '```'

/**
 * Khối thay thế trong hàng rào **cuối cùng** của câu trả lời.
 *
 * Trả `null` khi không tách được, và bên gọi **hạ về như chế độ Hỏi** thay vì đoán: coi cả câu trả
 * lời là bản thay thế sẽ ghi luôn phần giải thích vào bản dịch — một lỗi im lặng đúng vào chỗ đang
 * sửa văn bản của người dùng.
 *
 * Lấy hàng rào cuối vì prompt yêu cầu khối thay thế đứng cuối, còn phần giải thích ở trên có thể
 * nhắc một câu gốc trong hàng rào riêng của nó.
 */
export function extractFence(answer: string): string | null {
  const close = answer.lastIndexOf(FENCE)
  if (close <= 0) return null
  const open = answer.lastIndexOf(FENCE, close - 1)
  if (open === -1) return null

  // Bỏ nhãn ngôn ngữ ngay sau hàng rào mở (```text, ```vi…) nếu có.
  const afterOpen = answer.indexOf('\n', open + FENCE.length)
  if (afterOpen === -1 || afterOpen > close) return null
  const label = answer.slice(open + FENCE.length, afterOpen).trim()
  if (label !== '' && /\s/.test(label)) return null

  const body = answer.slice(afterOpen + 1, close)
  const text = body.replace(/\n$/, '')
  return text.trim() === '' ? null : text
}

/**
 * Trần cho lịch sử gửi kèm, tính bằng **ký tự** chứ không bằng token.
 *
 * Ký tự là số đếm được chính xác ở renderer mà không cần bộ đếm token của nhà cung cấp; nó chỉ là
 * ước lượng thô cho token, và đó là đủ cho việc nó làm — chặn một hội thoại dài trôi mãi, không phải
 * tính tiền. Tiền tính từ `usage` thật khi lượt xong.
 */
export const CHAT_HISTORY_CHARS_BUDGET = 24_000

const turnSchema = v.strictObject({
  role: v.picklist(['user', 'assistant'], 'Vai của lượt không hợp lệ.'),
  text: v.pipe(
    v.string('Nội dung lượt phải là chữ.'),
    v.maxLength(CHAT_TURN_TEXT_MAX, 'Một lượt trong hội thoại quá dài.')
  )
})

const contextBlockSchema = v.strictObject({
  kind: v.picklist(CHAT_CONTEXT_KINDS, 'Loại khối ngữ cảnh không hợp lệ.'),
  label: v.pipe(v.string('Nhãn khối phải là chữ.'), v.maxLength(120, 'Nhãn khối quá dài.')),
  detail: v.pipe(v.string('Mô tả khối phải là chữ.'), v.maxLength(200, 'Mô tả khối quá dài.')),
  text: v.pipe(
    v.string('Nội dung khối phải là chữ.'),
    v.maxLength(CHAT_BLOCK_TEXT_MAX, 'Một khối ngữ cảnh quá dài.')
  )
})

/** Tổng văn bản của một lần gửi; đếm sau khi từng phần đã qua trần riêng của nó. */
function totalTextLength(input: ChatSendInput): number {
  let total = input.question.length
  for (const turn of input.history) total += turn.text.length
  for (const block of input.context) total += block.text.length
  return total
}

export const chatSendSchema = v.pipe(
  v.strictObject({
    sessionId: v.optional(idSchema),
    droppedTurns: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(CHAT_HISTORY_TURNS_MAX))),
    range: v.optional(v.nullable(v.strictObject({
      from: v.pipe(v.number(), v.integer(), v.minValue(0)),
      to: v.pipe(v.number(), v.integer(), v.minValue(0)),
      text: v.pipe(v.string(), v.maxLength(CHAT_BLOCK_TEXT_MAX)),
      targetIds: v.pipe(v.array(idSchema), v.maxLength(1000))
    }))),
    proposalBase: v.optional(v.strictObject({
      sourceRev: v.pipe(v.number(), v.integer(), v.minValue(0)),
      sourceContent: v.pipe(v.string(), v.maxLength(TEXT_MAX_UNITS)),
      targetRev: v.pipe(v.number(), v.integer(), v.minValue(0)),
      targetContent: v.pipe(v.string(), v.maxLength(TEXT_MAX_UNITS)),
      blockAutoApply: v.boolean()
    })),
    workId: idSchema,
    chapterId: v.pipe(v.string('ID chương phải là chữ.'), v.uuid('ID chương không hợp lệ.')),
    connectionId: idSchema,
    entryId: idSchema,
    mode: v.picklist(CHAT_MODES, 'Chế độ không hợp lệ.'),
    sourceLang: v.picklist(SOURCE_LANGUAGES, 'Ngôn ngữ nguồn không hợp lệ.'),
    question: v.pipe(
      v.string('Câu hỏi phải là chữ.'),
      v.trim(),
      v.minLength(1, 'Chưa có câu hỏi.'),
      v.maxLength(CHAT_QUESTION_MAX, 'Câu hỏi quá dài.')
    ),
    history: v.pipe(
      v.array(turnSchema, 'Lịch sử hội thoại không hợp lệ.'),
      v.maxLength(CHAT_HISTORY_TURNS_MAX, 'Hội thoại quá dài; hãy bắt đầu hội thoại mới.')
    ),
    context: v.pipe(
      v.array(contextBlockSchema, 'Ngữ cảnh không hợp lệ.'),
      v.maxLength(CHAT_BLOCKS_MAX, 'Quá nhiều khối ngữ cảnh.')
    )
  }),
  v.check(
    (input) => totalTextLength(input) <= CHAT_TOTAL_TEXT_MAX,
    'Câu hỏi kèm ngữ cảnh quá lớn; hãy chọn phạm vi nhỏ hơn.'
  )
)

export const chatCancelSchema = v.strictObject({ requestId: idSchema })

export type ChatCancelInput = v.InferOutput<typeof chatCancelSchema>
