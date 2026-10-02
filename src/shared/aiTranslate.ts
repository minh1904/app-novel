import * as v from 'valibot'
import { idSchema } from './library'
import { MODEL_ID_MAX } from './aiConnections'

/**
 * Dịch bản gốc của một chương bằng AI: những gì đi qua IPC.
 *
 * Việc dịch **do renderer điều phối từng lô**, không phải một lời gọi dài trong main process. Lý
 * do: kho này chỉ có `invoke`/`handle`, chưa có kênh main → renderer, nên tiến độ và nút Hủy chỉ
 * đúng được khi mỗi lô là một lời gọi riêng. Mỗi lô cũng **ghi ngay** phần đã qua kiểm tra, nên hủy
 * giữa chừng hay mất kết nối không làm mất phần đã dịch.
 */

export interface TranslateBatchPlan {
  /** ID các segment nguồn của lô, theo thứ tự trong chương. */
  sourceIds: string[]
  /** Tổng số ký tự nguồn của lô, để giao diện chia tiến độ theo khối lượng thật nếu cần. */
  sourceChars: number
}

export interface TranslateEstimate {
  inputTokens: number
  outputTokens: number
  /** Thiếu nghĩa là **chưa biết giá** của model này, không phải 0. */
  usd?: number
}

export interface TranslatePlan {
  connectionId: string
  connectionName: string
  model: string
  /** Ngày của bản chụp giá đi kèm bản cài, để nói "giá tham khảo, cập nhật ngày…". */
  catalogReadAt: string
  /** Số segment sẽ gửi. */
  segmentCount: number
  batches: TranslateBatchPlan[]
  /**
   * Số segment người dùng đã viết hoặc đã soát. Vẫn gửi đi, nhưng kết quả chỉ là **đề xuất**: AI
   * không ghi đè chúng.
   */
  protectedCount: number
  /** Chương đã có bản dịch nào chưa — để hộp thoại cảnh báo trước khi dịch lại. */
  hasTranslation: boolean
  estimate: TranslateEstimate
  /** Revision bản dịch lúc lập kế hoạch; lô đầu tiên gửi kèm số này. */
  targetRev: number
}

/** Một hàng người dùng đã sửa: giữ bản của họ, bày bản AI cạnh bên để họ tự chọn. */
export interface HeldSuggestion {
  sourceId: string
  sourceText: string
  /** Bản đang nằm trong bản dịch của chương. */
  userText: string
  /** Bản AI đề xuất. **Chưa** được ghi vào bản dịch. */
  aiText: string
}

export type TranslateErrorKind =
  | 'rate_limited'
  | 'network'
  | 'auth'
  | 'refused'
  | 'invalid_response'
  | 'cancelled'
  | 'conflict'

export interface TranslateFailure {
  kind: TranslateErrorKind
  message: string
  /** Mốc sớm nhất có khóa hồi phục, khi lỗi là hết hạn mức và biết được mốc đó. */
  recoverAt: number | null
}

/** Lượng token nhà cung cấp báo đã dùng thật. Thiếu khi endpoint không báo. */
export interface TranslateUsage {
  inputTokens: number
  outputTokens: number
}

export interface TranslateBatchResult {
  /** Segment đã ghi vào bản dịch. */
  written: string[]
  held: HeldSuggestion[]
  /** Segment của lô này không dịch được; đi cùng `error`. */
  failed: string[]
  error: TranslateFailure | null
  /** Revision bản dịch sau khi ghi; lô sau gửi kèm số này. */
  targetRev: number
  /** Bốn ký tự cuối của khóa đã dùng, để nói "đã chuyển sang khóa …". `null` khi không dùng khóa. */
  keyTail: string | null
  usage: TranslateUsage | null
}

const chapterRef = {
  workId: idSchema,
  chapterId: v.pipe(v.string('ID chương phải là chữ.'), v.uuid('ID chương không hợp lệ.'))
}

const model = v.pipe(
  v.string('Tên model phải là chữ.'),
  v.trim(),
  v.minLength(1, 'Chưa chọn model.'),
  v.maxLength(MODEL_ID_MAX, 'Tên model quá dài.')
)

export const translatePlanSchema = v.strictObject({
  ...chapterRef,
  connectionId: idSchema,
  model
})

export const translateBatchSchema = v.strictObject({
  ...chapterRef,
  connectionId: idSchema,
  model,
  sourceIds: v.pipe(
    v.array(
      v.pipe(v.string('ID segment phải là chữ.'), v.uuid('ID segment không hợp lệ.')),
      'Danh sách segment không hợp lệ.'
    ),
    v.minLength(1, 'Lô rỗng.'),
    v.maxLength(2000, 'Lô quá lớn.')
  ),
  expectedRev: v.pipe(
    v.number('Revision phải là số.'),
    v.integer('Revision phải là số nguyên.'),
    v.minValue(0)
  )
})

export type TranslatePlanInput = v.InferOutput<typeof translatePlanSchema>
export type TranslateBatchInput = v.InferOutput<typeof translateBatchSchema>
