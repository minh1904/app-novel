import rawCatalog from './modelCatalog.json'

/**
 * Giới hạn, giá và năng lực của model, lấy từ một bản chụp models.dev (MIT) nằm trong repo. Bản
 * chụp chứ không gọi mạng lúc chạy: Mira phải biết giá khi không có mạng, và giá đổi chậm hơn nhịp
 * phát hành (ADR-004). Làm mới bằng `node scripts/refresh-model-catalog.mjs`.
 *
 * Model không có trong bảng **không phải lỗi**: alias do người dùng đặt trong gateway của họ không
 * bao giờ khớp. Người gọi phải xử lý `undefined` bằng cách nói "chưa biết giá", không hiện số 0.
 */

export interface ModelCost {
  /** USD cho một triệu token. */
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
}

/**
 * Cách một model nhận mức suy luận, theo ba dạng của models.dev. Một model có thể có nhiều dạng (Gemini 2.5
 * Flash có cả `toggle` lẫn `budget_tokens`). `modelCapability` đọc chúng thành các mức người dùng chọn.
 */
export type ReasoningOption =
  | { type: 'effort'; values: string[] }
  | { type: 'toggle' }
  | { type: 'budget_tokens'; min?: number; max?: number }

export interface ModelInfo {
  id: string
  name: string
  contextLimit?: number
  outputLimit?: number
  cost?: ModelCost
  structuredOutput?: boolean
  toolCall?: boolean
  reasoning?: boolean
  /** Vắng nghĩa là nguồn không nói gì, không phải "không có suy luận": xem `reasoning`. */
  reasoningOptions?: ReasoningOption[]
  /** Chỉ có mặt khi nguồn nói rõ model không nhận nhiệt độ; vắng nghĩa là để mở. */
  temperature?: false
  /** Nhà cung cấp đánh dấu, ví dụ `deprecated`. */
  status?: string
}

interface CatalogProvider {
  id: string
  name: string
  models: Record<string, ModelInfo>
}

interface Catalog {
  readAt: string
  source: string
  license: string
  providers: Record<string, CatalogProvider>
}

const catalog = rawCatalog as Catalog

/** Ngày đọc bản chụp; giao diện phải hiện kèm mọi con số giá. */
export const CATALOG_READ_AT = catalog.readAt

export function catalogProviderIds(): string[] {
  return Object.keys(catalog.providers)
}

/**
 * Bỏ tiền tố `models/` mà API liệt kê model của Google có thể trả về, để so được với bản chụp.
 * Chuỗi gốc vẫn phải được giữ nguyên khi gửi đi — hàm này chỉ dùng lúc tra bảng.
 */
export function normalizeModelId(modelId: string): string {
  const trimmed = modelId.trim()
  return trimmed.startsWith('models/') ? trimmed.slice('models/'.length) : trimmed
}

/**
 * Tra một model. Biết `providerId` thì chỉ tìm trong nhà cung cấp đó; không biết (kết nối qua
 * gateway, Mira không biết phía sau là ai) thì quét mọi nhà cung cấp và lấy khớp đầu tiên.
 */
export function lookupModel(modelId: string, providerId?: string): ModelInfo | undefined {
  const id = normalizeModelId(modelId)
  if (providerId !== undefined) return catalog.providers[providerId]?.models[id]
  for (const provider of Object.values(catalog.providers)) {
    const model = provider.models[id]
    if (model) return model
  }
  return undefined
}

/** Danh sách model của một nhà cung cấp, để điền sẵn khi người dùng chọn preset. */
export function listModels(providerId: string): ModelInfo[] {
  const provider = catalog.providers[providerId]
  return provider ? Object.values(provider.models) : []
}
