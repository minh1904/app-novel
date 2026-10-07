import * as v from 'valibot'
import { nearestThinkingLevel } from '../../../../shared/algorithms/thinkingLevels'
import {
  modelSettingsPatchSchema,
  type ModelCapabilityView,
  type ModelEntryView,
  type ModelSettings,
  type ModelSettingsPatch,
  type ThinkingLevel
} from '../../../../shared/contracts/modelSettings'

/**
 * Everything the model-entry screens need that is not drawing: what to call each thinking level, which
 * levels a model offers, and how the text a person types becomes a settings patch and back (design D11 of
 * change `ai-model-settings`).
 *
 * Pure on purpose. The dialogs are thin over these functions, so the rules that are easy to get wrong
 * live where a test can reach them without a DOM:
 *  - an empty box is "not set" and `0` is the value 0 (they are not the same thing, and the first is sent
 *    as `null`, which clears the field);
 *  - a switch turned off keeps its value;
 *  - a limit that is out of range is a message beside the box, never a silent correction;
 *  - what is saved is what the provider will be sent, so the limits and the forbidden `extra_body` fields
 *    are the contract's own and are not re-stated here.
 */

export const THINKING_LABELS: Record<ThinkingLevel, string> = {
  off: 'Tắt',
  minimal: 'Tối thiểu',
  low: 'Thấp',
  medium: 'Vừa',
  high: 'Cao',
  xhigh: 'Rất cao',
  max: 'Tối đa'
}

export const DEFAULT_THINKING_LABEL = 'Mặc định'

export const DEFAULT_THINKING_HINT =
  '“Mặc định” không gửi gì về suy luận: nhà cung cấp dùng mặc định của họ, và mức đó có thể tốn thêm token.'

/** What a person picks in the thinking menu: a level, or "Mặc định", which is the *absence* of one. */
export type ThinkingChoice = ThinkingLevel | 'default'

export interface ThinkingOption {
  value: ThinkingChoice
  label: string
  /** Explains the choice where the label alone does not. */
  hint?: string
}

export function thinkingLabelOf(level: ThinkingLevel | undefined): string {
  return level === undefined ? DEFAULT_THINKING_LABEL : THINKING_LABELS[level]
}

/**
 * The options for one model: the levels it supports, then "Mặc định", which every model has. A model the
 * catalog knows nothing about offers only "Mặc định", so a level that model rejects is never offered.
 *
 * `current` is the level already saved on the entry. If the model no longer supports it (the entry was
 * pointed at another model after the level was set) it is listed anyway and marked, so the screen does
 * not show one level while the entry holds another.
 */
export function thinkingOptions(
  capability: ModelCapabilityView,
  current?: ThinkingLevel
): ThinkingOption[] {
  const options: ThinkingOption[] = capability.thinkingLevels.map((level) => ({
    value: level,
    label: THINKING_LABELS[level]
  }))
  if (current !== undefined && !capability.thinkingLevels.includes(current)) {
    options.push({
      value: current,
      label: THINKING_LABELS[current] + ' (model này không hỗ trợ)'
    })
  }
  options.push({ value: 'default', label: DEFAULT_THINKING_LABEL, hint: DEFAULT_THINKING_HINT })
  return options
}

/**
 * The warning for a saved level this model does not take, with the closest one it does; `null` when the
 * saved level is fine. Main blocks such a level before any call, so without this line the entry would just
 * fail to translate.
 */
export function staleThinkingNotice(
  capability: ModelCapabilityView,
  current?: ThinkingLevel
): string | null {
  if (current === undefined || capability.thinkingLevels.includes(current)) return null
  const nearest = nearestThinkingLevel(capability.thinkingLevels, current)
  return (
    `Mức “${THINKING_LABELS[current]}” đang lưu không hợp lệ với model này, nên mọi lời gọi bằng mục này ` +
    'sẽ bị chặn. ' +
    (nearest === null
      ? `Chọn “${DEFAULT_THINKING_LABEL}”.`
      : `Chọn mức khác, ví dụ “${THINKING_LABELS[nearest]}”.`)
  )
}

export function thinkingChoiceOf(settings: ModelSettings): ThinkingChoice {
  return settings.thinking ?? 'default'
}

/** The patch that sets a choice: a level is stored, "Mặc định" clears the field. */
export function thinkingPatch(choice: ThinkingChoice): ModelSettingsPatch {
  return { thinking: choice === 'default' ? null : choice }
}

/** "Tên · mức", the form the chat box and the translate dialog show the entry in. */
export function entryLabel(entry: Pick<ModelEntryView, 'name' | 'settings'>): string {
  return entry.name + ' · ' + thinkingLabelOf(entry.settings.thinking)
}

// ---- results and messages -----------------------------------------------------------------------------------

export type FieldResult<T> = { ok: true; value: T } | { ok: false; message: string }

/** The first message the contract gives for a patch, or `null` when it takes it. */
export function patchProblem(patch: ModelSettingsPatch): string | null {
  const result = v.safeParse(modelSettingsPatchSchema, patch)
  return result.success ? null : (result.issues[0]?.message ?? 'Giá trị không hợp lệ.')
}

// ---- the Tác vụ dialog ---------------------------------------------------------------------------------------

export const TASK_FIELDS = [
  'inputTokenLimit',
  'outputTokenLimit',
  'concurrencyLimit',
  'rpmLimit'
] as const
export type TaskField = (typeof TASK_FIELDS)[number]
export type TaskForm = Record<TaskField, string>

/** What each box shows. An unset field is an empty box; `0` is shown as `0`. */
export function taskFormOf(settings: ModelSettings): TaskForm {
  const text = (value: number | undefined): string => (value === undefined ? '' : String(value))
  return {
    inputTokenLimit: text(settings.inputTokenLimit),
    outputTokenLimit: text(settings.outputTokenLimit),
    concurrencyLimit: text(settings.concurrencyLimit),
    rpmLimit: text(settings.rpmLimit)
  }
}

/**
 * What a box means. Empty clears the field (`null`, back to the default); digits are the number; anything
 * else, and any number outside the limit, is a message. Nothing is rounded or clamped: a number the person
 * typed is either taken as typed or refused with the range.
 */
export function parseTaskField(field: TaskField, text: string): FieldResult<number | null> {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: true, value: null }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, message: 'Chỉ nhập số nguyên không âm, không có dấu phân cách.' }
  }
  const value = Number(trimmed)
  const problem = patchProblem({ [field]: value })
  return problem === null ? { ok: true, value } : { ok: false, message: problem }
}

export function taskPatch(field: TaskField, value: number | null): ModelSettingsPatch {
  return { [field]: value }
}

/** Shown under each box: what the box does and what `0` or empty means (the descriptions follow LinguaGacha's). */
export const TASK_HINTS: Record<TaskField, { title: string; hint: string; placeholder: string }> = {
  inputTokenLimit: {
    title: 'Giới hạn token đầu vào mỗi lô',
    hint: 'Cỡ tối đa của một lô khi dịch; lô nhỏ hơn thì nhiều lượt gọi hơn nhưng mỗi lượt nhẹ hơn. Để trống hoặc 0 để dùng mặc định (1.500).',
    placeholder: '1.500'
  },
  outputTokenLimit: {
    title: 'Giới hạn token đầu ra',
    hint: 'Trần số token model được trả về. Để trống hoặc 0 để không gửi trần. Khi suy luận đang bật, token suy luận dùng chung trần này: trần nhỏ có thể ra câu rỗng hoặc cụt.',
    placeholder: 'tự động'
  },
  concurrencyLimit: {
    title: 'Giới hạn đồng thời',
    hint: 'Số yêu cầu tối đa chạy cùng lúc cho mục này; yêu cầu thừa xếp hàng. Để trống hoặc 0 để dùng mặc định (4).',
    placeholder: '4'
  },
  rpmLimit: {
    title: 'Giới hạn yêu cầu mỗi phút (RPM)',
    hint: 'Mira giãn các yêu cầu để không vượt con số này, kể cả giữa dịch và chat. Để trống hoặc 0 để không giãn nhịp.',
    placeholder: 'không giới hạn'
  }
}

// ---- the Nâng cao dialog -------------------------------------------------------------------------------------

export type SliderField = 'temperature' | 'topP'
export type JsonField = 'extraHeaders' | 'extraBody'

export interface SliderForm {
  enabled: boolean
  value: number
}

export interface JsonForm {
  enabled: boolean
  /** What is in the box: formatted JSON, or empty for "nothing". */
  text: string
}

export interface AdvancedForm {
  temperature: SliderForm
  topP: SliderForm
  extraHeaders: JsonForm
  extraBody: JsonForm
}

/** A value to start a slider from when the person switches it on for the first time. */
export const SLIDER_START: Record<SliderField, number> = { temperature: 1, topP: 1 }

export const SLIDER_RANGE: Record<SliderField, { min: number; max: number; step: number }> = {
  temperature: { min: 0, max: 2, step: 0.05 },
  topP: { min: 0, max: 1, step: 0.01 }
}

export function advancedFormOf(settings: ModelSettings): AdvancedForm {
  const json = (
    switched: { enabled: boolean; value: Record<string, unknown> } | undefined
  ): JsonForm => ({
    enabled: switched?.enabled ?? false,
    text:
      switched === undefined || Object.keys(switched.value).length === 0
        ? ''
        : JSON.stringify(switched.value, null, 2)
  })
  return {
    temperature: {
      enabled: settings.temperature?.enabled ?? false,
      value: settings.temperature?.value ?? SLIDER_START.temperature
    },
    topP: {
      enabled: settings.topP?.enabled ?? false,
      value: settings.topP?.value ?? SLIDER_START.topP
    },
    extraHeaders: json(settings.extraHeaders),
    extraBody: json(settings.extraBody)
  }
}

/** A slider position as a number a person would type: two decimals, no floating-point tail. */
export function roundSlider(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatSlider(value: number): string {
  return roundSlider(value).toLocaleString('vi-VN', { minimumFractionDigits: 2 })
}

export function sliderPatch(field: SliderField, form: SliderForm): ModelSettingsPatch {
  return { [field]: { enabled: form.enabled, value: roundSlider(form.value) } }
}

/**
 * What a JSON box means. Empty is an empty object. Anything that is not a JSON **object** is refused, and so
 * is an object the contract would refuse (a forbidden `extra_body` field, a header that would carry the
 * key), with the contract's own message. The message names the field it is about.
 */
export function parseJsonField(
  field: JsonField,
  text: string
): FieldResult<Record<string, unknown>> {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: true, value: {} }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return {
      ok: false,
      message: 'Không đọc được JSON. Kiểm tra dấu ngoặc, dấu phẩy và dấu nháy kép.'
    }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, message: 'Phải là một đối tượng JSON, ví dụ {"khóa": "giá trị"}.' }
  }
  const value = parsed as Record<string, unknown>
  const problem = patchProblem({ [field]: { enabled: true, value } } as ModelSettingsPatch)
  return problem === null ? { ok: true, value } : { ok: false, message: problem }
}

export function jsonPatch(
  field: JsonField,
  enabled: boolean,
  value: Record<string, unknown>
): ModelSettingsPatch {
  return { [field]: { enabled, value } } as ModelSettingsPatch
}

export const ADVANCED_HINTS = {
  temperature: {
    title: 'Nhiệt độ',
    hint: 'Càng cao càng thoáng, càng thấp càng sát. Chỉ được gửi khi công tắc bật; giá trị được giữ khi tắt.'
  },
  topP: {
    title: 'Top P',
    hint: 'Chỉ lấy các từ có tổng xác suất tới ngưỡng này. Thường chỉnh nhiệt độ hoặc Top P, không cả hai.'
  },
  extraHeaders: {
    title: 'Header thêm',
    hint: 'Một đối tượng JSON, gửi kèm mỗi yêu cầu, ví dụ {"HTTP-Referer": "https://…"}. Không nhập khóa API ở đây: khóa của kết nối có đường riêng và các header xác thực bị từ chối.'
  },
  extraBody: {
    title: 'Tham số thêm (extra_body)',
    hint: 'Một đối tượng JSON gộp vào thân yêu cầu, cho các tham số riêng của nhà cung cấp, ví dụ {"top_k": 40}. Không đổi được model, messages, stream, stream_options và tools.'
  }
} as const

export const TEMPERATURE_LOCKED_HINT =
  'Theo bảng dữ liệu đi kèm, model này không nhận nhiệt độ nên Mira khóa ô này.'
