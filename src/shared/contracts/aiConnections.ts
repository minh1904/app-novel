import * as v from 'valibot'
import { normalizeBaseUrl } from './endpointUrl'
import { idSchema } from './library'
import {
  entryModelSchema,
  entryNameSchema,
  modelSettingsPatchSchema,
  type ModelEntryView
} from './modelSettings'
import type { TokenUsage } from './usage'

/**
 * Kết nối AI: những gì đi qua IPC giữa main và renderer.
 *
 * Quy tắc một dòng, giữ xuyên suốt: **khóa API chỉ đi một chiều**. Renderer gửi khóa đúng một lần
 * lúc thêm; từ đó về sau chỉ nhận lại bốn ký tự cuối và trạng thái. Không có kênh nào đọc khóa ra.
 */

export const CONNECTION_NAME_MAX = 80
export const CONNECTION_URL_MAX = 300
export const API_KEY_MAX = 400

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

/** Which wire protocol a connection speaks; `auto` decides from the address. */
export const API_MODES = ['auto', 'chat_completions', 'responses', 'anthropic_messages'] as const
export type ApiMode = (typeof API_MODES)[number]

export interface ConnectionView {
  id: string
  name: string
  baseUrl: string
  enabled: boolean
  /** A pasted API key, or an account login (change `subscription-providers`). */
  authKind: 'api_key' | 'oauth'
  oauthProvider: 'codex' | 'copilot' | null
  apiMode: ApiMode
  /** The login of an account connection: who, and whether it must be done again. Never a token. */
  account: { label: string | null; state: 'ok' | 'relogin'; expiresAt: number | null } | null
  providerId: string | null
  /** Id của **mục** model mặc định (không phải tên model); `null` khi chưa chọn. */
  defaultEntryId: string | null
  checkedAt: number | null
  keys: ConnectionKeyView[]
  /** Mục model của kết nối, theo thứ tự người dùng xếp, kèm khả năng của từng model. */
  models: ModelEntryView[]
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
    id: 'anthropic',
    label: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    providerId: 'anthropic',
    hint: 'Khóa API của Anthropic Console (sk-ant-api…), không phải gói Claude Pro/Max.'
  },
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
    providerId: 'ollama',
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
  v.regex(/^https?:\/\/\S+$/i, 'Địa chỉ phải bắt đầu bằng http:// hoặc https://'),
  // Dán nguyên đường dẫn endpoint cũng được: lưu dạng gốc để không bị nối đôi `/chat/completions`.
  v.transform(normalizeBaseUrl)
)

const providerId = v.nullable(
  v.pipe(v.string('Nhà cung cấp phải là chữ.'), v.maxLength(60, 'Tên nhà cung cấp quá dài.'))
)

export const createConnectionSchema = v.strictObject({
  name,
  baseUrl,
  providerId: v.optional(providerId, null),
  apiMode: v.optional(v.picklist(API_MODES, 'Chế độ API không hợp lệ.'))
})

export const updateConnectionSchema = v.strictObject({
  id: connectionId,
  patch: v.strictObject({
    name: v.optional(name),
    baseUrl: v.optional(baseUrl),
    providerId: v.optional(providerId),
    enabled: v.optional(v.boolean('Giá trị bật/tắt không hợp lệ.')),
    defaultEntryId: v.optional(v.nullable(idSchema)),
    apiMode: v.optional(v.picklist(API_MODES, 'Chế độ API không hợp lệ.'))
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

/**
 * The two-step check of an endpoint (change `hermes-settings-modal`, design D5). `resolvedBaseUrl` is the
 * variant that listed models (with or without `/v1`), the one to keep.
 */
export interface EndpointProbeResult {
  ok: boolean
  /** `false` only when nothing answered at all; a wrong key or a web page is still "reachable". */
  reachable: boolean
  keyRejected: boolean
  resolvedBaseUrl: string | null
  models: string[]
  /** Whether the one-token chat call was made and answered. */
  routeChecked: boolean
  /** One sentence for the person, in Vietnamese. */
  message: string
}

/**
 * Probe an address before or after saving it. The key is either typed now (`secret`, never stored by this
 * call) or the first key of an existing connection.
 */
export const probeEndpointSchema = v.strictObject({
  baseUrl,
  secret: v.optional(
    v.pipe(
      v.string('Khóa API phải là chữ.'),
      v.trim(),
      v.maxLength(API_KEY_MAX, 'Khóa API quá dài.')
    )
  ),
  connectionId: v.optional(connectionId),
  model: v.optional(entryModelSchema),
  apiMode: v.optional(v.picklist(API_MODES, 'Chế độ API không hợp lệ.'))
})
export type ProbeEndpointInput = v.InferOutput<typeof probeEndpointSchema>

/**
 * Paste a key into a provider card that has no connection yet: the connection is created from the preset
 * and the key added, in one call, so a card never ends up half-made.
 */
export const ensureWithKeySchema = v.strictObject({
  providerId: v.pipe(
    v.string('Nhà cung cấp phải là chữ.'),
    v.maxLength(60, 'Tên nhà cung cấp quá dài.')
  ),
  secret: v.pipe(
    v.string('Khóa API phải là chữ.'),
    v.trim(),
    v.minLength(1, 'Khóa API không được để trống.'),
    v.maxLength(API_KEY_MAX, 'Khóa API quá dài.')
  )
})
export type EnsureWithKeyInput = v.InferOutput<typeof ensureWithKeySchema>

/** Thêm một hay nhiều mục model vào cuối danh sách của kết nối. Mỗi mục mới có cài đặt trống. */
export const addModelEntriesSchema = v.strictObject({
  connectionId,
  items: v.pipe(
    v.array(
      v.strictObject({ model: entryModelSchema, name: v.optional(entryNameSchema) }),
      'Danh sách model không hợp lệ.'
    ),
    v.minLength(1, 'Chưa chọn model nào.'),
    v.maxLength(100, 'Thêm quá nhiều model một lần.')
  )
})

/**
 * Sửa một mục: tên hiển thị, tên model thật, và/hoặc cài đặt (một bản vá, xem `modelSettingsPatchSchema`).
 * Mỗi hộp thoại chỉ gửi nhóm của nó nên không ghi đè nhóm khác.
 */
export const updateModelEntrySchema = v.strictObject({
  entryId: idSchema,
  patch: v.strictObject({
    name: v.optional(entryNameSchema),
    model: v.optional(entryModelSchema),
    settings: v.optional(modelSettingsPatchSchema)
  })
})

/** Nhân bản, xóa, hay kiểm tra một mục: chỉ cần biết mục nào. */
export const modelEntryRefSchema = v.strictObject({ entryId: idSchema })

/**
 * Xếp lại thứ tự các mục của một kết nối. `ids` phải đúng là các mục đang có, mỗi mục một lần; main từ chối
 * nếu không khớp thay vì đoán, vì giao diện đang xếp một danh sách đã cũ.
 */
export const reorderModelEntriesSchema = v.strictObject({
  connectionId,
  ids: v.pipe(v.array(idSchema, 'Danh sách mục không hợp lệ.'), v.maxLength(500, 'Quá nhiều mục.'))
})

/** Kết quả nút "Kiểm tra" một mục: nhà cung cấp nhận cấu hình của mục. Thất bại đi như một lỗi, kèm lời gốc. */
export interface ModelEntryTestResult {
  /** Thời gian từ lúc gửi đến lúc có phản hồi, ms. Gồm cả thời gian chờ lượt nếu mục có RPM. */
  ms: number
  /** Thiếu khi nhà cung cấp không báo. */
  usage: TokenUsage | null
}

export type CreateConnectionInput = v.InferOutput<typeof createConnectionSchema>
export type UpdateConnectionInput = v.InferOutput<typeof updateConnectionSchema>
export type AddModelEntriesInput = v.InferOutput<typeof addModelEntriesSchema>
export type UpdateModelEntryInput = v.InferOutput<typeof updateModelEntrySchema>
