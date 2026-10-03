import {
  THINKING_LEVELS,
  type ModelCapabilityView,
  type ThinkingLevel
} from '../../../shared/contracts/modelSettings'
import type { ModelInfo, ReasoningOption } from './modelCatalog'

/**
 * Những mức suy luận một model hỗ trợ, và việc nó có nhận nhiệt độ hay không, đọc từ bản chụp catalog
 * (design D4 của change `ai-model-settings`). Hàm thuần, không đụng mạng hay kho.
 *
 * Đây là **gợi ý có căn cứ, không phải bảo đảm**: models.dev là dữ liệu cộng đồng và alias do người dùng
 * tự đặt không có trong đó. Vì vậy:
 *  - một mức được đưa ra mà nhà cung cấp từ chối thì lỗi nói rõ (không âm thầm bỏ tham số), và nút
 *    Kiểm tra cho biết trước;
 *  - model không rõ chỉ có mức "Mặc định" (không gửi gì), nên không bao giờ gửi một mức sai;
 *  - phần còn lại đi qua `extra_body`.
 *
 * "Mặc định" **không** nằm trong kết quả: nó là việc không gửi gì về suy luận, luôn có, và không phải một
 * giá trị (design D3). Chỉ "Tắt" là một giá trị: nó gửi một thứ mà endpoint hiểu là tắt.
 */

/** Cùng hình dạng với thứ đi qua IPC (`ModelCapabilityView`): main tính, renderer chỉ đọc. */
export type ModelCapability = ModelCapabilityView

/** Thứ tự hiển thị, và cũng là tập mức được biết: tên lạ trong catalog bị bỏ thay vì gửi bừa. */
const ORDER: readonly ThinkingLevel[] = THINKING_LEVELS

/**
 * Gemini 2.5 ánh xạ `reasoning_effort` `low`/`medium`/`high` sang ngân sách suy luận (1.024 / 8.192 /
 * 24.576 token), nên một model Gemini khai ngân sách mà không khai mức nào khác vẫn nhận ba mức này — kể
 * cả 2.5 Pro, vốn không tắt được. Đây là cách **của Gemini**, không phải của mọi hãng có ngân sách (Claude
 * dùng một đối tượng `thinking` riêng), nên chỉ áp cho model `gemini-*`; hãng khác chỉ có "Mặc định" cho
 * tới khi có bằng chứng, và phần còn lại đi qua `extra_body`.
 */
const GEMINI_BUDGET_LEVELS: readonly ThinkingLevel[] = ['low', 'medium', 'high']

function isLevel(value: string): value is ThinkingLevel {
  return (ORDER as readonly string[]).includes(value)
}

/** Một ngân sách tắt được khi mức tối thiểu của nó là 0. */
function budgetCanBeZero(option: ReasoningOption): boolean {
  return option.type === 'budget_tokens' && option.min === 0
}

/**
 * Chỗ catalog sai, đã **đo thật** (task 2.4 của change `ai-model-settings`; design D4, "bảng sửa tay").
 *
 * models.dev là dữ liệu cộng đồng, nên khi một lần gọi thật trái với nó thì bản đo thắng, nhưng chỉ ở đúng
 * dòng đã đo. Mỗi dòng phải có: id model, mức thêm vào, ngày đo, và **tên bản ghi** chứng minh (nằm ở
 * `__fixtures__/live`). Hai test giữ bảng này trung thực: bản ghi phải có thật và là HTTP 200, và dòng nào mà
 * catalog đã tự khai mức đó thì test **đỏ** để xóa dòng ("xóa khi catalog đúng").
 *
 * Chỉ **thêm** mức, không bớt: bớt một mức là giấu thứ có thể dùng được dựa trên một lần đo duy nhất.
 */
export const MODEL_CAPABILITY_OVERRIDES: Readonly<Record<string, ModelCapabilityOverride>> = {
  'gemini-3.5-flash': {
    addLevels: ['off'],
    measuredOn: '2026-10-03',
    evidence: 'probe-gemini-3.5-flash-effort-none.json',
    note: 'Nhận reasoning_effort "none": tổng 32 token, tức không suy luận (bằng với "minimal"). models.dev chỉ liệt kê minimal…high.'
  }
}

export interface ModelCapabilityOverride {
  addLevels: ThinkingLevel[]
  /** Ngày đo, `YYYY-MM-DD`. */
  measuredOn: string
  /** Tên tệp trong `__fixtures__/live` ghi lại lần gọi thật. */
  evidence: string
  note: string
}

/** Khả năng đọc **chỉ từ catalog**, chưa áp bảng sửa tay. Test dùng nó để biết một dòng sửa tay còn cần không. */
export function capabilityFromCatalog(info: ModelInfo | undefined): ModelCapability {
  return {
    thinkingLevels: thinkingLevelsOf(info),
    temperature: info?.temperature !== false
  }
}

function thinkingLevelsOf(info: ModelInfo | undefined): ThinkingLevel[] {
  if (info === undefined || info.reasoning !== true) return []
  const options = info.reasoningOptions ?? []

  const levels = new Set<ThinkingLevel>()

  for (const option of options) {
    if (option.type === 'effort') {
      for (const value of option.values) {
        // models.dev gọi mức tắt là `none`; Mira gọi là `off` để không lẫn với "không đặt gì".
        const name = value === 'none' ? 'off' : value
        if (isLevel(name)) levels.add(name)
      }
    } else if (option.type === 'toggle' || budgetCanBeZero(option)) {
      levels.add('off')
    }
  }

  // Ngân sách chỉ cho ba mức khi model **không** tự khai mức nào (`effort`), và chỉ với Gemini.
  const hasEffort = options.some((option) => option.type === 'effort')
  const hasBudget = options.some((option) => option.type === 'budget_tokens')
  if (!hasEffort && hasBudget && info.id.startsWith('gemini-')) {
    for (const level of GEMINI_BUDGET_LEVELS) levels.add(level)
  }

  return ORDER.filter((level) => levels.has(level))
}

/**
 * Khả năng của một model: catalog, cộng các mức đã đo thật (`MODEL_CAPABILITY_OVERRIDES`).
 * `info` là `undefined` khi model không có trong catalog (alias của gateway): khi đó không biết gì, và không
 * có dòng sửa tay nào áp được (chúng khớp theo id catalog).
 */
export function modelCapability(info: ModelInfo | undefined): ModelCapability {
  const base = capabilityFromCatalog(info)
  const override = info === undefined ? undefined : MODEL_CAPABILITY_OVERRIDES[info.id]
  if (override === undefined) return base
  const levels = new Set<ThinkingLevel>([...base.thinkingLevels, ...override.addLevels])
  return { ...base, thinkingLevels: ORDER.filter((level) => levels.has(level)) }
}
