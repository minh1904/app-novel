import * as v from 'valibot'
import { idSchema } from './library'

/**
 * Kết nối AI: những gì đi qua IPC giữa main và renderer.
 *
 * Quy tắc một dòng, giữ xuyên suốt: **khóa API chỉ đi một chiều**. Renderer gửi khóa đúng một lần
 * lúc thêm; từ đó về sau chỉ nhận lại bốn ký tự cuối và trạng thái. Không có kênh nào đọc khóa ra.
 */

export const CONNECTION_NAME_MAX = 80
export const CONNECTION_URL_MAX = 300
export const API_KEY_MAX = 400
export const MODEL_ID_MAX = 120

export type KeyState = 'ok' | 'invalid'
export type QuotaScope = 'minute' | 'day'

export interface ConnectionKeyView {
  id: string
  /** Bốn ký tự cuối của khóa. Không bao giờ là khóa đầy đủ. */
  tail: string
  state: KeyState
  /** Mốc hết đóng băng, ms epoch. */
  frozenUntil: number | null
  frozenScope: QuotaScope | null
}

export interface ConnectionView {
  id: string
  name: string
  baseUrl: string
  enabled: boolean
  providerId: string | null
  defaultModel: string | null
  checkedAt: number | null
  keys: ConnectionKeyView[]
  models: string[]
}

/** Giá và giới hạn của một model, lấy từ bản chụp đi kèm bản cài. */
export interface ModelInfoView {
  id: string
  name: string
  contextLimit?: number
  outputLimit?: number
  /** USD cho một triệu token. Thiếu nghĩa là **chưa biết giá**, không phải 0. */
  inputCost?: number
  outputCost?: number
  /** Nhà cung cấp đánh dấu, ví dụ `deprecated`. */
  status?: string
}

export interface ConnectionTestResult {
  connection: ConnectionView
  /** Ngày của bản chụp giá đi kèm bản cài, để giao diện nói "giá tham khảo, cập nhật ngày…". */
  catalogReadAt: string
  /** Model endpoint báo. Rỗng khi nối được nhưng không liệt kê được. */
  models: ModelInfoView[]
  /** `false` khi endpoint không có `/models` — nối được, chỉ là không liệt kê. */
  listed: boolean
}

/** Giá trị điền sẵn cho ô địa chỉ. Chỉ là dữ liệu, không có mã xử lý riêng cho preset nào. */
export interface ConnectionPreset {
  id: string
  label: string
  baseUrl: string
  /** Id nhà cung cấp trong bản chụp giá; `null` khi không tra được. */
  providerId: string | null
  /** Gợi ý một dòng hiện dưới ô địa chỉ. */
  hint?: string
}

export const CONNECTION_PRESETS: ConnectionPreset[] = [
  {
    id: 'gateway',
    label: 'Gateway tự dựng',
    baseUrl: 'http://127.0.0.1:8317/v1',
    providerId: null,
    hint: 'Địa chỉ của gateway bạn chạy trên máy. Khóa ở đây là khóa của chính gateway, không phải khóa nhà cung cấp.'
  },
  {
    id: 'google',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    providerId: 'google',
    hint: 'Dán API key lấy từ Google AI Studio. Nhiều khóa nên thuộc các project khác nhau.'
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    providerId: 'openrouter'
  },
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', providerId: 'openai' },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    providerId: 'deepseek'
  },
  {
    id: 'ollama',
    label: 'Ollama (máy này)',
    baseUrl: 'http://127.0.0.1:11434/v1',
    providerId: null,
    hint: 'Chạy trên máy bạn nên thường không cần khóa.'
  },
  {
    id: 'lmstudio',
    label: 'LM Studio (máy này)',
    baseUrl: 'http://127.0.0.1:1234/v1',
    providerId: 'lmstudio',
    hint: 'Bật server trong LM Studio trước; thường không cần khóa.'
  }
]

/** Nhà cung cấp tính hạn mức theo project nên hai khóa cùng project có thể dùng chung (D12). */
export const SHARED_QUOTA_PROVIDERS = ['google']

const connectionId = idSchema
const keyId = idSchema

const name = v.pipe(
  v.string('Tên kết nối phải là chữ.'),
  v.trim(),
  v.minLength(1, 'Tên kết nối không được để trống.'),
  v.maxLength(CONNECTION_NAME_MAX, 'Tên kết nối quá dài.')
)

const baseUrl = v.pipe(
  v.string('Địa chỉ phải là chữ.'),
  v.trim(),
  v.minLength(1, 'Địa chỉ không được để trống.'),
  v.maxLength(CONNECTION_URL_MAX, 'Địa chỉ quá dài.'),
  v.regex(/^https?:\/\/\S+$/i, 'Địa chỉ phải bắt đầu bằng http:// hoặc https://')
)

const providerId = v.nullable(
  v.pipe(v.string('Nhà cung cấp phải là chữ.'), v.maxLength(60, 'Tên nhà cung cấp quá dài.'))
)

const modelId = v.pipe(
  v.string('Tên model phải là chữ.'),
  v.trim(),
  v.maxLength(MODEL_ID_MAX, 'Tên model quá dài.')
)

export const createConnectionSchema = v.strictObject({
  name,
  baseUrl,
  providerId: v.optional(providerId, null)
})

export const updateConnectionSchema = v.strictObject({
  id: connectionId,
  patch: v.strictObject({
    name: v.optional(name),
    baseUrl: v.optional(baseUrl),
    providerId: v.optional(providerId),
    enabled: v.optional(v.boolean('Giá trị bật/tắt không hợp lệ.')),
    defaultModel: v.optional(v.nullable(modelId))
  })
})

export const connectionRefSchema = v.strictObject({ id: connectionId })

export const addConnectionKeySchema = v.strictObject({
  id: connectionId,
  /** Lần duy nhất khóa đi qua IPC. */
  secret: v.pipe(
    v.string('Khóa API phải là chữ.'),
    v.trim(),
    v.minLength(1, 'Khóa API không được để trống.'),
    v.maxLength(API_KEY_MAX, 'Khóa API quá dài.')
  )
})

export const removeConnectionKeySchema = v.strictObject({ id: connectionId, keyId })

export const setConnectionModelsSchema = v.strictObject({
  id: connectionId,
  models: v.pipe(
    v.array(modelId, 'Danh sách model không hợp lệ.'),
    v.maxLength(200, 'Chọn quá nhiều model.')
  )
})

export type CreateConnectionInput = v.InferOutput<typeof createConnectionSchema>
export type UpdateConnectionInput = v.InferOutput<typeof updateConnectionSchema>
