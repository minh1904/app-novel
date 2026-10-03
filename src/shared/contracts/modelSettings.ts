import * as v from 'valibot'

/**
 * Cài đặt của một mục model: những gì người dùng đặt để điều khiển cách model sinh văn bản và cách Mira
 * gọi nó (design D3 của change `ai-model-settings`).
 *
 * Ba nhóm, đúng ba hộp thoại: **Cơ bản** (mức suy luận; tên hiển thị và tên model thật là cột của mục
 * chứ không nằm ở đây), **Tác vụ** (giới hạn token, đồng thời, RPM) và **Nâng cao** (nhiệt độ, `top_p`,
 * header thêm, `extra_body`).
 *
 * Hai quy tắc giữ xuyên suốt:
 *  - **Vắng nghĩa là không gửi.** Một mục chưa đặt gì gửi yêu cầu y như trước khi tính năng này tồn tại.
 *  - **Cờ bật tách khỏi giá trị** ở bốn tham số nâng cao: tắt tạm một tham số không làm mất con số đã gõ.
 *
 * Ngoài giới hạn thì **từ chối kèm lý do**, không kẹp: kẹp là sửa giá trị người dùng đã gõ mà không nói.
 */

/**
 * Các mức suy luận người dùng chọn được, từ nhẹ đến nặng. `off` là một **giá trị** (gửi cái endpoint hiểu là
 * tắt); "Mặc định" thì không phải giá trị mà là trường vắng, vì hai cách biểu diễn cho cùng một ý là chỗ sinh
 * lỗi.
 */
export const THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const
export type ThinkingLevel = (typeof THINKING_LEVELS)[number]

export const SETTINGS_LIMITS = {
  temperature: { min: 0, max: 2 },
  topP: { min: 0, max: 1 },
  /** Cho cả token vào và token ra. 0 là mặc định (vào) hoặc tự động (ra). */
  tokens: { min: 0, max: 2_000_000 },
  /** 0 là mặc định (4). */
  concurrency: { min: 0, max: 64 },
  /** 0 là không giới hạn. */
  rpm: { min: 0, max: 10_000 },
  /** Cỡ tối đa của header thêm và `extra_body` sau khi đổi sang JSON, tính bằng byte UTF-8. */
  jsonBytes: 4096
} as const

/**
 * Các trường mà phần còn lại của Mira dựa vào để đọc phản hồi. `extra_body` được gộp sau cùng nên người dùng
 * có tiếng nói cuối với tham số riêng của hãng, nhưng **không** ghi đè được những trường này (design D8).
 */
export const FORBIDDEN_BODY_FIELDS = [
  'model',
  'messages',
  'stream',
  'stream_options',
  'tools'
] as const

/**
 * Header thêm không ghi đè được header xác thực hay header mô tả thân yêu cầu. Khóa của kết nối đi qua **một**
 * đường duy nhất để bộ lập lịch khóa và bước che khóa khỏi lỗi còn đúng; một header thêm mang khóa khác sẽ
 * vòng qua cả hai. So không phân biệt hoa thường, vì tên header không phân biệt.
 */
export const FORBIDDEN_HEADERS = [
  'authorization',
  'x-api-key',
  'x-goog-api-key',
  'api-key',
  'host',
  'accept',
  'content-type',
  'content-length'
] as const

/** Một tham số có cờ bật riêng: giá trị được giữ khi cờ tắt, nhưng chỉ được gửi khi cờ bật. */
export interface Switched<T> {
  enabled: boolean
  value: T
}

export interface ModelSettings {
  /** Vắng là "Mặc định": không gửi gì về suy luận. */
  thinking?: ThinkingLevel

  /** Token đầu vào mỗi lô dịch. 0 hoặc vắng = cỡ lô mặc định. */
  inputTokenLimit?: number
  /** Token đầu ra. 0 hoặc vắng = tự động: không gửi trường giới hạn. */
  outputTokenLimit?: number
  /** Số yêu cầu cùng lúc cho mục này. 0 hoặc vắng = mặc định. */
  concurrencyLimit?: number
  /** Số yêu cầu mỗi phút cho mục này. 0 hoặc vắng = không giãn nhịp. */
  rpmLimit?: number

  temperature?: Switched<number>
  topP?: Switched<number>
  extraHeaders?: Switched<Record<string, string>>
  extraBody?: Switched<Record<string, unknown>>
}

/**
 * Khả năng của model, đã đọc từ bảng dữ liệu đi kèm bản cài (`modelCapability` ở main). Giao diện chỉ đưa ra
 * những gì ở đây; đây là gợi ý có căn cứ chứ không phải bảo đảm.
 */
export interface ModelCapabilityView {
  /** Mức suy luận đưa ra được, trừ "Mặc định" vốn luôn có. Rỗng nghĩa là chỉ có "Mặc định". */
  thinkingLevels: ThinkingLevel[]
  /** `false` chỉ khi bảng dữ liệu nói rõ model không nhận nhiệt độ. */
  temperature: boolean
}

/** Một mục model như renderer thấy. */
export interface ModelEntryView {
  id: string
  /** Tên hiển thị, của người dùng; mặc định bằng tên model thật. */
  name: string
  /** Tên model thật gửi cho nhà cung cấp. */
  model: string
  settings: ModelSettings
  capability: ModelCapabilityView
}

export const ENTRY_NAME_MAX = 80
export const ENTRY_MODEL_MAX = 120

/**
 * Bốn con số ở nhóm Tác vụ dùng 0 làm "mặc định" (cách LinguaGacha hiện ra ở ô nhập, và người dùng hiểu
 * ngay), nhưng vắng cũng là mặc định. Hàm này đưa hai cách về một: `undefined` nghĩa là "dùng mặc định".
 */
export function taskLimit(value: number | undefined): number | undefined {
  return value === undefined || value === 0 ? undefined : value
}

// ---------------------------------------------------------------------------------------------------------

function integerBetween(label: string, min: number, max: number): v.GenericSchema<number> {
  const range = min.toLocaleString('vi-VN') + ' đến ' + max.toLocaleString('vi-VN')
  return v.pipe(
    v.number(label + ' phải là một con số.'),
    v.integer(label + ' phải là số nguyên, từ ' + range + '.'),
    v.minValue(min, label + ' phải từ ' + range + '.'),
    v.maxValue(max, label + ' phải từ ' + range + '.')
  )
}

function decimalBetween(label: string, min: number, max: number): v.GenericSchema<number> {
  const range = min + ' đến ' + max
  return v.pipe(
    v.number(label + ' phải là một con số.'),
    v.minValue(min, label + ' phải từ ' + range + '.'),
    v.maxValue(max, label + ' phải từ ' + range + '.')
  )
}

const thinking = v.picklist(THINKING_LEVELS, 'Mức suy luận không hợp lệ.')
const inputTokenLimit = integerBetween(
  'Giới hạn token đầu vào',
  SETTINGS_LIMITS.tokens.min,
  SETTINGS_LIMITS.tokens.max
)
const outputTokenLimit = integerBetween(
  'Giới hạn token đầu ra',
  SETTINGS_LIMITS.tokens.min,
  SETTINGS_LIMITS.tokens.max
)
const concurrencyLimit = integerBetween(
  'Giới hạn đồng thời',
  SETTINGS_LIMITS.concurrency.min,
  SETTINGS_LIMITS.concurrency.max
)
const rpmLimit = integerBetween('RPM', SETTINGS_LIMITS.rpm.min, SETTINGS_LIMITS.rpm.max)
const temperatureValue = decimalBetween(
  'Nhiệt độ',
  SETTINGS_LIMITS.temperature.min,
  SETTINGS_LIMITS.temperature.max
)
const topPValue = decimalBetween('Top P', SETTINGS_LIMITS.topP.min, SETTINGS_LIMITS.topP.max)

function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length
}

/** Tên header hợp lệ theo RFC 9110 (một "token"). Tên sai làm `fetch` ném giữa lượt dịch, nên chặn lúc lưu. */
const HEADER_NAME = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/

/**
 * Giá trị header không được có ký tự điều khiển (trừ tab): xuống dòng trong giá trị là cách chèn thêm một
 * header khác. Viết bằng mã ký tự thay vì regex để không phải tắt `no-control-regex`.
 */
function hasForbiddenHeaderChar(text: string): boolean {
  for (let at = 0; at < text.length; at++) {
    const code = text.charCodeAt(at)
    if ((code < 0x20 && code !== 0x09) || code === 0x7f) return true
  }
  return false
}

/**
 * Một đối tượng JSON thuần. Mảng bị chặn **trước** `v.record`: `record` dựng đối tượng mới từ các khóa của
 * mảng (`"0"`, `"1"`), nên sau nó không còn phân biệt được, và trải vào thân yêu cầu sẽ gửi `{"0": …}`.
 */
function jsonObject<T>(
  label: string,
  value: v.GenericSchema<unknown, T>
): v.GenericSchema<unknown, Record<string, T>> {
  return v.pipe(
    v.unknown(),
    v.check(
      (input) => !Array.isArray(input),
      label + ' phải là một đối tượng JSON, không phải một mảng.'
    ),
    v.record(v.string(), value, label + ' phải là một đối tượng JSON.')
  )
}

const extraBodyValue = v.pipe(
  jsonObject('`extra_body`', v.unknown()),
  v.rawCheck(({ dataset, addIssue }) => {
    if (!dataset.typed) return
    const forbidden = FORBIDDEN_BODY_FIELDS.filter((field) => field in dataset.value)
    if (forbidden.length > 0) {
      addIssue({
        message:
          '`extra_body` không được chứa trường ' +
          forbidden.map((field) => '“' + field + '”').join(', ') +
          ': Mira dùng chúng để gọi và đọc phản hồi.'
      })
      return
    }
    if (jsonBytes(dataset.value) > SETTINGS_LIMITS.jsonBytes) {
      addIssue({ message: '`extra_body` quá dài (tối đa 4 KB).' })
    }
  })
)

const extraHeadersValue = v.pipe(
  jsonObject('Header thêm', v.string('Giá trị của một header phải là chữ.')),
  v.rawCheck(({ dataset, addIssue }) => {
    if (!dataset.typed) return
    const names = Object.keys(dataset.value)
    const forbidden = names.filter((name) =>
      (FORBIDDEN_HEADERS as readonly string[]).includes(name.toLowerCase())
    )
    if (forbidden.length > 0) {
      addIssue({
        message:
          'Header thêm không được chứa ' +
          forbidden.map((name) => '“' + name + '”').join(', ') +
          ': khóa của kết nối đi qua một đường riêng.'
      })
      return
    }
    const badName = names.find((name) => !HEADER_NAME.test(name))
    if (badName !== undefined) {
      addIssue({ message: 'Tên header “' + badName + '” không hợp lệ.' })
      return
    }
    const badValue = names.find((name) => hasForbiddenHeaderChar(dataset.value[name] ?? ''))
    if (badValue !== undefined) {
      addIssue({ message: 'Giá trị của header “' + badValue + '” có ký tự không được phép.' })
      return
    }
    if (jsonBytes(dataset.value) > SETTINGS_LIMITS.jsonBytes) {
      addIssue({ message: 'Header thêm quá dài (tối đa 4 KB).' })
    }
  })
)

function switched<T>(value: v.GenericSchema<unknown, T>): v.GenericSchema<unknown, Switched<T>> {
  return v.strictObject({ enabled: v.boolean('Cờ bật/tắt không hợp lệ.'), value })
}

/** Từng trường một, để đọc an toàn kiểm riêng từng cái. Chỉ có ở đây một danh sách. */
const FIELD_SCHEMAS = {
  thinking,
  inputTokenLimit,
  outputTokenLimit,
  concurrencyLimit,
  rpmLimit,
  temperature: switched(temperatureValue),
  topP: switched(topPValue),
  extraHeaders: switched(extraHeadersValue),
  extraBody: switched(extraBodyValue)
} as const

type FieldName = keyof typeof FIELD_SCHEMAS
const FIELD_NAMES = Object.keys(FIELD_SCHEMAS) as FieldName[]

/**
 * Cài đặt đi qua IPC khi **ghi**: chặt, trường lạ bị từ chối. Đọc từ kho thì dùng `readModelSettings`, vốn
 * dễ tính hơn.
 */
export const modelSettingsSchema = v.partial(v.strictObject(FIELD_SCHEMAS))

/**
 * Một **bản vá** cài đặt, từ một hộp thoại hay từ menu chọn mức suy luận: chỉ những trường được nêu thay đổi,
 * và `null` nghĩa là "bỏ trường này" (về mặc định). Khóa vắng thì giữ nguyên. Cần `null` vì JSON qua IPC
 * không mang được `undefined`, và vì "chưa đặt" là một trạng thái thật của mọi cài đặt ở đây.
 *
 * Dùng bản vá thay cho gửi cả bộ để hai chỗ sửa cùng một mục (hộp thoại Nâng cao và menu chọn mức) không ghi
 * đè nhau bằng một bản đã cũ.
 */
export const modelSettingsPatchSchema = v.partial(
  v.strictObject({
    thinking: v.nullable(FIELD_SCHEMAS.thinking),
    inputTokenLimit: v.nullable(FIELD_SCHEMAS.inputTokenLimit),
    outputTokenLimit: v.nullable(FIELD_SCHEMAS.outputTokenLimit),
    concurrencyLimit: v.nullable(FIELD_SCHEMAS.concurrencyLimit),
    rpmLimit: v.nullable(FIELD_SCHEMAS.rpmLimit),
    temperature: v.nullable(FIELD_SCHEMAS.temperature),
    topP: v.nullable(FIELD_SCHEMAS.topP),
    extraHeaders: v.nullable(FIELD_SCHEMAS.extraHeaders),
    extraBody: v.nullable(FIELD_SCHEMAS.extraBody)
  })
)

export type ModelSettingsPatch = v.InferOutput<typeof modelSettingsPatchSchema>

/** Áp một bản vá lên cài đặt hiện có: trường nêu thì thay, `null` thì bỏ, vắng thì giữ. Không sửa `current`. */
export function applySettingsPatch(
  current: ModelSettings,
  patch: ModelSettingsPatch
): ModelSettings {
  const next: Record<string, unknown> = { ...current }
  for (const [name, value] of Object.entries(patch)) {
    if (value === undefined) continue
    if (value === null) delete next[name]
    else next[name] = value
  }
  return next as ModelSettings
}

/**
 * Khóa cấu hình của một mục model, do main tính (SHA-256 của dạng chuẩn tắc của những gì ảnh hưởng nội dung
 * hay cách chia lô; design D5–D6). Renderer chỉ mang nó đi và đưa lại: lô nào gửi lên mà khóa không còn khớp
 * với mục hiện tại thì không được gửi. Là mã băm chứ không phải chính cấu hình để IPC không phải chở cả
 * `extra_body` ở mỗi lô.
 */
export const settingsKeySchema = v.pipe(
  v.string('Khóa cấu hình phải là chữ.'),
  v.regex(/^[0-9a-f]{64}$/, 'Khóa cấu hình không hợp lệ.')
)

export const entryNameSchema = v.pipe(
  v.string('Tên mục phải là chữ.'),
  v.trim(),
  v.minLength(1, 'Tên mục không được để trống.'),
  v.maxLength(ENTRY_NAME_MAX, 'Tên mục quá dài.')
)

export const entryModelSchema = v.pipe(
  v.string('Tên model phải là chữ.'),
  v.trim(),
  v.minLength(1, 'Tên model không được để trống.'),
  v.maxLength(ENTRY_MODEL_MAX, 'Tên model quá dài.')
)

/**
 * Đọc cài đặt từ dữ liệu đã lưu, **không bao giờ ném**. Dữ liệu trong kho có thể do một bản sau ghi (thêm
 * trường) hoặc hỏng; ở cả hai trường hợp việc dịch không được dừng vì nó:
 *  - trường lạ bị bỏ qua (bản sau thêm trường mà không cần migration);
 *  - một trường hỏng bị bỏ **riêng trường đó** và được báo ở `dropped`, để nơi gọi ghi log. Không bao giờ
 *    gửi một giá trị đã hỏng cho nhà cung cấp.
 * Chuỗi JSON hỏng cho `{}`.
 */
export function readModelSettings(raw: unknown): { settings: ModelSettings; dropped: string[] } {
  let value = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      return { settings: {}, dropped: raw.trim() === '' ? [] : ['(toàn bộ: JSON hỏng)'] }
    }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { settings: {}, dropped: value === undefined || value === null ? [] : ['(toàn bộ)'] }
  }

  const settings: Record<string, unknown> = {}
  const dropped: string[] = []
  const record = value as Record<string, unknown>
  for (const name of FIELD_NAMES) {
    if (!(name in record) || record[name] === undefined) continue
    const parsed = v.safeParse(FIELD_SCHEMAS[name], record[name])
    if (parsed.success) settings[name] = parsed.output
    else dropped.push(name)
  }
  return { settings: settings as ModelSettings, dropped }
}
