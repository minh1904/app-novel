import * as v from 'valibot'
import { idSchema, SOURCE_LANGUAGES } from './library'
import type { TokenUsage } from './usage'

/**
 * Hỏi AI trong panel chat: những gì đi qua IPC.
 *
 * Khác hẳn [dịch chương](aiTranslate.ts) ở ba điểm, và cả ba đều hiện ra trong kiểu dữ liệu dưới
 * đây. **Một**, câu trả lời về theo dòng, nên một lượt là `send` → nhiều `ChatChunk` → đúng một
 * `done` hoặc `error`, chứ không phải một lời gọi trả một kết quả. **Hai**, không có segment ID nào
 * đi theo: phản hồi là chữ tự do, không bị kiểm theo tập ID. **Ba**, chat không bao giờ ghi bản
 * dịch: tool ghi chỉ tạo đề xuất chờ duyệt (change `agentic-chat`).
 *
 * Lượt gửi **không** mang văn bản chương. Nó mang vị trí người dùng (`ChatLocation`), còn nội dung
 * thì model tự đọc bằng tool. Trước change `agentic-chat` renderer dựng sẵn ngữ cảnh và người dùng
 * phải chọn chế độ và phạm vi; các kiểu `ChatMode`, `ChatContextBlock`, `ChatRange` còn lại chỉ để
 * đọc lượt cũ đã lưu.
 */

/** Chế độ của lượt cũ (trước `agentic-chat`). Lượt mới không có chế độ và lưu là `chat`. */
export const CHAT_MODES = ['ask', 'edit', 'apply'] as const
export type ChatMode = (typeof CHAT_MODES)[number]
/** Loại của một lượt đã lưu: chế độ cũ, hoặc `chat` cho lượt không chế độ. */
export type ChatAction = ChatMode | 'chat'

/** Một lượt trong hội thoại. Lịch sử bền trong tác phẩm và đi kèm mỗi lần gửi. */
export interface ChatTurn {
  role: 'user' | 'assistant'
  text: string
}

/** Khối ngữ cảnh mà lượt cũ đã gửi kèm. Lượt mới không gửi kèm gì; kiểu này chỉ để hiện lại lịch sử. */
export interface ChatContextBlock {
  kind: string
  label: string
  detail: string
  text: string
}

/** Khoảng bản dịch mà một lượt cũ ở chế độ Sửa nhắm tới. Chỉ để đọc lịch sử. */
export interface ChatRange {
  from: number
  to: number
  text: string
  targetIds: string[]
}

/**
 * Người dùng đang đứng ở đâu trong chương của lượt (D1 của change `agentic-chat`).
 *
 * Chỉ là vị trí, không bao giờ là chữ: số đoạn đếm từ 1 theo cùng cách tách đoạn mà tool dùng
 * (`splitParagraphs`), nên "đoạn 5" trong vị trí và "đoạn 5" trong `read_chapter` là một.
 */
export interface ChatLocation {
  /** Đoạn mà con trỏ đang ở, mỗi phía; `null` khi phía đó trống hoặc chưa đặt con trỏ. */
  caret: { source: number | null; target: number | null }
  /** Khoảng đoạn đang chọn; `null` khi không có vùng chọn. */
  selection: { side: 'source' | 'target'; from: number; to: number } | null
}

export interface ChatSendInput {
  /** Existing work-scoped session; omitted for the first turn of a new conversation. */
  sessionId?: string
  droppedTurns?: number
  /**
   * Tác phẩm và chương đang mở. Khóa phạm vi của tool: một lượt chỉ đọc được trong tác phẩm này, và
   * tool ghi chỉ đề xuất được cho chương này.
   */
  workId: string
  chapterId: string
  connectionId: string
  /** Mục model dùng cho lượt này; cấu hình của nó được đọc một lần ở đầu lượt. */
  entryId: string
  sourceLang: (typeof SOURCE_LANGUAGES)[number]
  question: string
  /** Các lượt trước của phiên, cũ nhất trước. Rỗng ở lượt đầu. */
  history: ChatTurn[]
  location: ChatLocation
}

/** Main trả lời lệnh gửi. */
export interface ChatStartResult {
  requestId: string
  sessionId?: string
}

export type ChatErrorKind =
  | 'rate_limited'
  | 'network'
  | 'timeout'
  | 'auth'
  | 'quota'
  | 'refused'
  | 'invalid_request'
  | 'invalid_response'
  | 'cancelled'

export interface ChatError {
  kind: ChatErrorKind
  message: string
  /** Thử lại cùng câu hỏi có cơ hội thành công hay không. */
  retryable: boolean
  /** Mốc sớm nhất có khóa hồi phục, khi lỗi là hết hạn mức và biết được mốc đó. */
  recoverAt: number | null
  /** Lỗi thuộc một tài khoản đăng nhập (cần đăng nhập lại): panel có nút mở thẳng thẻ đó. */
  account?: 'codex' | 'copilot'
}

export type ChatUsage = TokenUsage

/** Lý do một câu trả lời dừng, theo lời của app. `unknown` không được gửi đi: thiếu trường là "không biết". */
export type ChatFinishReason = 'stop' | 'length' | 'tool_calls' | 'filter'

/**
 * Một đề xuất mà tool ghi đã tạo trong lượt. Sửa và dịch đoạn là đề xuất trong hàng chờ của chương;
 * thuật ngữ là một mục glossary chờ duyệt. Trạng thái **không** nằm ở đây: panel đọc nó từ hàng chờ
 * hoặc glossary, để thẻ dưới lượt chat và hàng chờ không bao giờ nói hai điều khác nhau.
 */
export type ChatToolProposal =
  | {
      type: 'edit' | 'translation'
      proposalId: string
      partIds: string[]
      chapterId: string
      /** Một dòng cho thẻ, ví dụ "Sửa đoạn 7–9 bản dịch". */
      label: string
    }
  | {
      type: 'term'
      entryId: string
      term: string
      translation: string
      label: string
    }

/** Một lần gọi tool, như panel hiện và như lượt lưu lại. `detail` mô tả phạm vi, không bao giờ là nội dung. */
export interface ChatToolStep {
  name: string
  detail: string
  /** Thiếu ở lượt cũ, đọc như `ok`. */
  status?: 'ok' | 'error'
  proposal?: ChatToolProposal
}

/**
 * Một thông điệp của lượt đang chạy, đi main → renderer.
 *
 * Ba luật bất biến, và chúng là nội dung của test chứ không phải lời hứa trong comment:
 * một `requestId` nhận **đúng một** `done` **hoặc** `error` — không bao giờ cả hai, không bao giờ
 * hai lần; và không `delta` nào đến sau khi lượt đã kết thúc.
 */
export type ChatChunk =
  | { requestId: string; kind: 'delta'; text: string }
  /** What the model thought before answering; shown as "Thought", never part of the answer. */
  | { requestId: string; kind: 'reasoning'; text: string }
  /**
   * Model vừa gọi một tool. Chỉ để panel nói rõ đã làm gì — `detail` là một dòng mô tả phạm vi,
   * **không bao giờ** là nội dung đã đọc.
   */
  | { requestId: string; kind: 'tool'; name: string; detail: string; status?: 'ok' | 'error' }
  /** Tool ghi vừa tạo một đề xuất; gửi ngay, để thẻ hiện ra trong lúc lượt còn chạy. */
  | { requestId: string; kind: 'proposal'; proposal: ChatToolProposal }
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
       * đầu ra — câu trả lời chưa đủ. Thiếu trường này nghĩa là không biết, không phải xong êm.
       */
      finishReason?: ChatFinishReason
    }
  | {
      requestId: string
      kind: 'error'
      error: ChatError
      /** Đã nhận được chữ nào trước khi lỗi chưa — panel cần để biết có giữ chữ lại hay không. */
      partial: boolean
    }

/**
 * Trần kích thước. Lịch sử là văn bản do renderer gửi lên, nên nếu không chặn thì một hội thoại dài đi
 * qua IPC mỗi lượt. Các số này là trần chống hỏng, không phải ngân sách token — ngân sách là việc của
 * `historyFor` (D10 của change `ai-chat`).
 */
export const CHAT_QUESTION_MAX = 4_000
export const CHAT_HISTORY_TURNS_MAX = 40
export const CHAT_TURN_TEXT_MAX = 20_000
/** Tổng mọi văn bản của một lần gửi: lịch sử + câu hỏi. */
export const CHAT_TOTAL_TEXT_MAX = 200_000
/** Số đoạn lớn nhất một vị trí được nêu; chặn số rác, không phải độ dài chương thật. */
export const CHAT_PARAGRAPH_MAX = 1_000_000

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

const paragraph = v.pipe(
  v.number('Số đoạn phải là số.'),
  v.integer('Số đoạn phải là số nguyên.'),
  v.minValue(1, 'Số đoạn đếm từ 1.'),
  v.maxValue(CHAT_PARAGRAPH_MAX, 'Số đoạn quá lớn.')
)

export const chatLocationSchema = v.strictObject({
  caret: v.strictObject({ source: v.nullable(paragraph), target: v.nullable(paragraph) }),
  selection: v.nullable(
    v.pipe(
      v.strictObject({
        side: v.picklist(['source', 'target'], 'Phía của vùng chọn không hợp lệ.'),
        from: paragraph,
        to: paragraph
      }),
      v.check((selection) => selection.from <= selection.to, 'Vùng chọn bị ngược.')
    )
  )
})

/** Tổng văn bản của một lần gửi; đếm sau khi từng phần đã qua trần riêng của nó. */
function totalTextLength(input: ChatSendInput): number {
  let total = input.question.length
  for (const turn of input.history) total += turn.text.length
  return total
}

export const chatSendSchema = v.pipe(
  v.strictObject({
    sessionId: v.optional(idSchema),
    droppedTurns: v.optional(
      v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(CHAT_HISTORY_TURNS_MAX))
    ),
    workId: idSchema,
    chapterId: v.pipe(v.string('ID chương phải là chữ.'), v.uuid('ID chương không hợp lệ.')),
    connectionId: idSchema,
    entryId: idSchema,
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
    location: chatLocationSchema
  }),
  v.check(
    (input) => totalTextLength(input) <= CHAT_TOTAL_TEXT_MAX,
    'Hội thoại quá dài; hãy bắt đầu hội thoại mới.'
  )
)

export const chatCancelSchema = v.strictObject({ requestId: idSchema })

export type ChatCancelInput = v.InferOutput<typeof chatCancelSchema>
