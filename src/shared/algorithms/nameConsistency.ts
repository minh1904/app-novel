/**
 * Tên nhất quán: cùng một nhân vật có được viết tên giống nhau qua các đoạn và chương không.
 *
 * Chỉ số này không cần đáp án — đo được cả bản dịch chạy không glossary — nên dùng để biết glossary có
 * làm bản dịch ổn định hơn hay không. Với mỗi nhân vật, xét các đoạn bản gốc có tên (hoặc biến thể) và
 * đoạn dịch cùng vị trí; cách viết "chính" là cụm chữ hoa xuất hiện với nhân vật nhiều hơn hẳn so với
 * các đoạn không có nhân vật đó (để không chọn nhầm chữ đầu câu). Độ nhất quán là tỷ lệ đoạn dùng cách
 * viết chính.
 *
 * Giới hạn: đoạn chỉ gọi bằng đại từ hoặc danh xưng hợp lệ ("thiếu gia") vẫn tính là không dùng tên,
 * nên con số là cận dưới; so được giữa các bản trên cùng chương, không có nghĩa tuyệt đối.
 */

export interface NameForms {
  /** Khóa hiển thị, thường là tên gốc. */
  name: string
  /** Mọi dạng nguồn: tên gốc và biến thể. */
  forms: string[]
}

export interface NameConsistency {
  name: string
  paragraphs: number
  /** Cách viết chính và số đoạn dùng nó. */
  dominant: string | null
  consistent: number
  /** Các cách viết khác thường gặp, để người đọc thấy lệch kiểu gì. */
  others: Array<{ rendering: string; count: number }>
}

// Cụm 1–2 từ viết hoa (có dấu tiếng Việt), ví dụ "Leon", "Bá tước", "Claire".
const CAPITALIZED = /\p{Lu}[\p{L}'’-]*(?:\s\p{Lu}[\p{L}'’-]*)?/gu

function renderingsIn(text: string): Set<string> {
  const found = new Set<string>()
  for (const match of text.matchAll(CAPITALIZED)) {
    found.add(match[0])
    // Cụm hai từ cũng tính từng từ: "Leon Fitzgerald" vẫn chứa "Leon".
    for (const word of match[0].split(/\s/)) found.add(word)
  }
  return found
}

/**
 * `source` và `target` là các đoạn cùng vị trí của những chương có số đoạn khớp. Nhân vật xuất hiện ít
 * hơn `minParagraphs` đoạn bị bỏ vì quá ít để nói về nhất quán.
 */
export function nameConsistency(
  source: string[],
  target: string[],
  names: NameForms[],
  minParagraphs = 3
): NameConsistency[] {
  const count = Math.min(source.length, target.length)
  const renderings = target.slice(0, count).map(renderingsIn)
  const out: NameConsistency[] = []
  for (const { name, forms } of names) {
    const usable = forms.filter((form) => form.trim() !== '')
    const withName: number[] = []
    const without: number[] = []
    for (let i = 0; i < count; i++) {
      ;(usable.some((form) => source[i].includes(form)) ? withName : without).push(i)
    }
    if (withName.length < minParagraphs) continue
    const freq = (indexes: number[]): Map<string, number> => {
      const map = new Map<string, number>()
      for (const i of indexes) for (const r of renderings[i]) map.set(r, (map.get(r) ?? 0) + 1)
      return map
    }
    const inside = freq(withName)
    const outside = freq(without)
    let dominant: string | null = null
    let best = 0
    for (const [rendering, n] of inside) {
      const lift = n / withName.length - (outside.get(rendering) ?? 0) / Math.max(1, without.length)
      if (lift > best || (lift === best && dominant !== null && n > (inside.get(dominant) ?? 0))) {
        best = lift
        dominant = rendering
      }
    }
    const consistent = dominant === null ? 0 : (inside.get(dominant) ?? 0)
    const others = [...inside]
      .filter(([rendering]) => rendering !== dominant && !dominant?.includes(rendering))
      .map(([rendering, n]) => ({
        rendering,
        n,
        lift: n / withName.length - (outside.get(rendering) ?? 0) / Math.max(1, without.length)
      }))
      .filter((item) => item.lift > 0.1)
      .sort((a, b) => b.n - a.n)
      .slice(0, 3)
      .map(({ rendering, n }) => ({ rendering, count: n }))
    out.push({ name, paragraphs: withName.length, dominant, consistent, others })
  }
  return out.sort((a, b) => b.paragraphs - a.paragraphs)
}

/** Gộp nhiều nhân vật thành một tỷ lệ, theo số đoạn (nhân vật xuất hiện nhiều nặng ký hơn). */
export function overallConsistency(results: NameConsistency[]): {
  names: number
  paragraphs: number
  consistent: number
} {
  return {
    names: results.length,
    paragraphs: results.reduce((sum, r) => sum + r.paragraphs, 0),
    consistent: results.reduce((sum, r) => sum + r.consistent, 0)
  }
}
