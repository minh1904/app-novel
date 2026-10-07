import type { ChapterItem } from '../../../shared/contracts/chapters'
import type { LinkRecord } from '../../../shared/contracts/links'
import type { TextRecord, TextSide } from '../../../shared/contracts/text'
import {
  SEARCH_QUERY_MAX,
  SEARCH_RESULTS_MAX,
  counterpartOf,
  hitsIn,
  type SearchHit
} from './chatSearch'
import { decodeCursor, encodeCursor, formatCount, readPage, splitParagraphs } from './chatToolText'

/**
 * What the model may look up for itself, and nothing more.
 *
 * One rule decides everything in this file: **tool được đọc và được trỏ; chỉ người dùng mới được
 * ghi** (D12 của change `ai-chat`). There is no tool here that changes anything, and adding one
 * would undo the property the whole feature rests on — that a translation never changes without its
 * owner seeing the change first.
 *
 * Scope is bound, not asked for. `workId` is fixed when the tools are built, so the model has no
 * parameter with which to name a different work: reaching outside the current one is not refused at
 * runtime, it is unsayable.
 */

/** Only the read methods of `LibraryStore` that the tools use. */
export interface ChatToolLibrary {
  listChapters(workId: string): ChapterItem[]
  readText(workId: string, chapterId: string, side: TextSide): TextRecord
  /** The alignment links of a chapter: the only way `search_work` names the other side of a match. */
  listLinks(workId: string, chapterId: string): LinkRecord[]
  /**
   * One side of every chapter in one read. Optional: without it `search_work` reads chapter by chapter,
   * which on a 242-chapter work was most of a 700 ms search.
   */
  readSideContents?(workId: string, side: TextSide): Map<string, string>
}

/** A request from the model, as it comes off the wire. */
export interface ToolCall {
  id: string
  name: string
  /** Raw JSON; models do get this wrong, so it is parsed defensively. */
  args: string
}

export interface ToolResult {
  id: string
  name: string
  /** One line for the panel: what was read, never the content itself. */
  detail: string
  /** What goes back to the model. */
  content: string
}

/** Longest text a single read may return. A longer chapter is read in pages, never cut silently. */
export const TOOL_TEXT_MAX = 20_000

/**
 * The tool list sent to the provider, in OpenAI's shape.
 *
 * Three tools, all reads. Every extra tool is a thing the model can spend a round-trip (and the user's
 * money) getting wrong; these cover what came up: "dịch chương 2" while chapter 1 is open, a chapter
 * longer than one read, and "chương trước dịch 魔王 là gì?".
 */
export const CHAT_TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'list_chapters',
      description:
        'Liệt kê các chương của tác phẩm đang mở: số thứ tự, tên, đã có bản gốc chưa, đã có bản dịch chưa. Dùng khi cần biết tác phẩm có những chương nào.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_chapter',
      description:
        'Đọc văn bản của một chương trong tác phẩm đang mở, theo trang. Chỉ đọc, không sửa được gì. Mỗi lần trả tối đa một trang, kèm vị trí (đoạn từ–đến trên tổng) và con trỏ nếu còn tiếp. Đọc tiếp bằng cách gửi lại con trỏ; muốn bắt đầu ở một đoạn thì dùng from_paragraph. Một đoạn là một dòng không trống.',
      parameters: {
        type: 'object',
        properties: {
          chapter: { type: 'integer', description: 'Số thứ tự chương, bắt đầu từ 1.' },
          side: {
            type: 'string',
            enum: ['source', 'target'],
            description: 'source là bản gốc, target là bản dịch.'
          },
          from_paragraph: {
            type: 'integer',
            description: 'Đoạn bắt đầu, tính từ 1. Không dùng cùng cursor.'
          },
          cursor: {
            type: 'string',
            description: 'Con trỏ đọc tiếp do lần đọc trước trả về; chép nguyên văn.'
          }
        },
        required: ['chapter', 'side']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_work',
      description:
        'Tìm một chuỗi trong mọi chương của tác phẩm đang mở, ở bản gốc hoặc bản dịch. Trả số chỗ khớp, chương, số đoạn và đoạn trích; kèm đoạn tương ứng ở phía kia khi có liên kết căn chỉnh. Dùng để tra một tên hay thuật ngữ đã được dịch thế nào ở chương khác.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Chuỗi cần tìm, 1–100 ký tự. Chữ CJK không cần dấu cách.'
          },
          side: {
            type: 'string',
            enum: ['source', 'target'],
            description: 'source là tìm trong bản gốc, target là tìm trong bản dịch.'
          }
        },
        required: ['query', 'side']
      }
    }
  }
] as const

/** A tool answer the model can act on; failures come back as text, not as thrown errors. */
function failed(call: ToolCall, message: string): ToolResult {
  return { id: call.id, name: call.name, detail: message, content: 'LỖI: ' + message }
}

function readArgs(call: ToolCall): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(call.args === '' ? '{}' : call.args)
    return parsed !== null && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

const sideName = (side: TextSide): string => (side === 'source' ? 'bản gốc' : 'bản dịch')

export interface ToolRunOptions {
  /**
   * Characters the turn may still receive from tools (`chatService` keeps the count). A read is cut to
   * fit; at zero, reading tools answer that the turn's budget is spent instead of reading.
   */
  remainingChars?: number
  /** The turn's whole budget, named in the message once it is spent. */
  turnBudget?: number
}

export interface ChatToolRunner {
  run(call: ToolCall, options?: ToolRunOptions): ToolResult
}

/** What a reading tool answers once the turn has received all the text it may. */
export function budgetSpent(call: ToolCall, budget: number): ToolResult {
  const message = `Hết ngân sách đọc của lượt (${formatCount(budget)} ký tự)`
  return {
    id: call.id,
    name: call.name,
    detail: message,
    content:
      message +
      '. Không đọc thêm được trong lượt này; hãy trả lời bằng những gì đã đọc và nói rõ phần chưa đọc.'
  }
}

export function createChatTools(library: ChatToolLibrary, workId: string): ChatToolRunner {
  function listChapters(call: ToolCall): ToolResult {
    const chapters = library.listChapters(workId)
    const lines = chapters.map(
      (chapter) =>
        chapter.number +
        '. ' +
        chapter.title +
        ' — bản gốc: ' +
        (chapter.hasSource ? 'có' : 'chưa') +
        ', bản dịch: ' +
        (chapter.hasTarget ? 'có' : 'chưa')
    )
    return {
      id: call.id,
      name: call.name,
      detail: 'Liệt kê ' + chapters.length + ' chương',
      content: lines.length === 0 ? 'Tác phẩm chưa có chương nào.' : lines.join('\n')
    }
  }

  function readSide(args: Record<string, unknown>): TextSide | null {
    return args.side === 'source' || args.side === 'target' ? args.side : null
  }

  function readChapter(call: ToolCall, limit: number): ToolResult {
    const args = readArgs(call)
    if (args === null) return failed(call, 'Tham số không phải JSON hợp lệ.')

    const number = args.chapter
    if (typeof number !== 'number' || !Number.isInteger(number)) {
      return failed(call, 'Thiếu số chương, hoặc số chương không phải số nguyên.')
    }
    const side = readSide(args)
    if (side === null) return failed(call, 'Tham số side phải là "source" hoặc "target".')
    const from = args.from_paragraph
    const cursorText = args.cursor
    if (from !== undefined && cursorText !== undefined) {
      return failed(call, 'Chỉ dùng một trong from_paragraph hoặc cursor.')
    }
    if (from !== undefined && (typeof from !== 'number' || !Number.isInteger(from) || from < 1)) {
      return failed(call, 'from_paragraph phải là số nguyên từ 1.')
    }

    const chapters = library.listChapters(workId)
    const chapter = chapters.find((entry) => entry.number === number)
    if (!chapter) {
      return failed(
        call,
        'Không có chương số ' + number + '. Tác phẩm có ' + chapters.length + ' chương.'
      )
    }

    const label = 'Chương ' + chapter.number + ' · ' + sideName(side)
    const record = library.readText(workId, chapter.id, side)
    const spans = splitParagraphs(record.content)
    if (spans.length === 0) {
      return {
        id: call.id,
        name: call.name,
        detail: label + ' — trống',
        content: label + ' chưa có nội dung.'
      }
    }

    let paragraph = typeof from === 'number' ? from : 1
    let offset = 0
    let warning = ''
    if (cursorText !== undefined) {
      const cursor = typeof cursorText === 'string' ? decodeCursor(cursorText) : null
      if (cursor === null || cursor.chapter !== chapter.number || cursor.side !== side) {
        return failed(
          call,
          'Con trỏ không hợp lệ cho ' +
            label.toLowerCase() +
            '. Đọc lại bằng from_paragraph (chương có ' +
            spans.length +
            ' đoạn).'
        )
      }
      paragraph = cursor.paragraph
      offset = cursor.offset
      if (cursor.rev !== record.rev) {
        // A small edit is the usual case: carry on from the same paragraph instead of starting over.
        offset = 0
        warning =
          `Văn bản đã đổi kể từ lần đọc trước (rev ${cursor.rev} → ${record.rev}); đọc lại từ đầu ` +
          `đoạn ${cursor.paragraph}, vị trí có thể lệch.\n`
      }
    }
    if (paragraph > spans.length) {
      return failed(call, `${label} có ${spans.length} đoạn; không có đoạn ${paragraph}.`)
    }
    const spanLength = spans[paragraph - 1].end - spans[paragraph - 1].start
    if (offset >= spanLength) {
      return failed(
        call,
        'Con trỏ trỏ ra ngoài đoạn ' + paragraph + '. Đọc lại bằng from_paragraph.'
      )
    }

    const page = readPage(record.content, spans, paragraph, offset, limit)
    const range = `đoạn ${page.fromParagraph}–${page.toParagraph}/${page.total}`
    const size = `${formatCount(page.text.length)} ký tự`
    const next =
      page.next === null
        ? null
        : encodeCursor({
            chapter: chapter.number,
            side,
            paragraph: page.next.paragraph,
            offset: page.next.offset,
            rev: record.rev
          })
    const state =
      next === null
        ? 'hết chương'
        : (page.cutInParagraph ? `đoạn ${page.toParagraph} chưa hết, ` : '') +
          'còn tiếp, con trỏ: ' +
          next
    return {
      id: call.id,
      name: call.name,
      detail: `${label} — ${range}, ${size}, ${next === null ? 'hết chương' : 'còn tiếp'}`,
      content: `${warning}${label} · rev ${record.rev} · ${range} · ${size} · ${state}\n${page.text}`
    }
  }

  function searchWork(call: ToolCall, budget: number): ToolResult {
    const args = readArgs(call)
    if (args === null) return failed(call, 'Tham số không phải JSON hợp lệ.')
    const side = readSide(args)
    if (side === null) return failed(call, 'Tham số side phải là "source" hoặc "target".')
    const query = typeof args.query === 'string' ? args.query.trim() : ''
    if (query.length < 1 || query.length > SEARCH_QUERY_MAX) {
      return failed(call, `Chuỗi tìm phải dài 1–${SEARCH_QUERY_MAX} ký tự sau khi bỏ khoảng trắng.`)
    }

    const chapters = library.listChapters(workId)
    const hits: SearchHit[] = []
    const matched = new Set<number>()
    const contents = library.readSideContents?.(workId, side)
    for (const chapter of chapters) {
      const content = contents
        ? (contents.get(chapter.id) ?? '')
        : library.readText(workId, chapter.id, side).content
      const found = hitsIn(chapter, content, query)
      if (found.length > 0) matched.add(chapter.number)
      hits.push(...found)
    }
    const label = `Tìm "${query}" · ${sideName(side)}`
    if (hits.length === 0) {
      return {
        id: call.id,
        name: call.name,
        detail: `${label} — không có chỗ khớp`,
        content: `${label}: không có chỗ khớp trong ${chapters.length} chương.`
      }
    }

    // Links only for the chapters that are shown: reading every chapter's alignment would be wasted.
    const shown = hits.slice(0, SEARCH_RESULTS_MAX)
    const sides = new Map<string, { source: TextRecord; target: TextRecord; links: LinkRecord[] }>()
    const otherSide = sideName(side === 'source' ? 'target' : 'source')
    const lines = shown.map((hit, index) => {
      let pair = sides.get(hit.chapterId)
      if (!pair) {
        pair = {
          source: library.readText(workId, hit.chapterId, 'source'),
          target: library.readText(workId, hit.chapterId, 'target'),
          links: library.listLinks(workId, hit.chapterId)
        }
        sides.set(hit.chapterId, pair)
      }
      const counterpart = counterpartOf(side, hit.offset, pair.source, pair.target, pair.links)
      const other =
        counterpart.kind === 'linked'
          ? `   ${otherSide}${counterpart.uncertain ? ' (liên kết chưa chắc đúng)' : ''}: ` +
            counterpart.texts.join(' ')
          : `   ${otherSide}: chưa căn chỉnh — đọc ${otherSide} chương ${hit.chapter} bằng read_chapter.`
      return (
        `${index + 1}. Chương ${hit.chapter} «${hit.title}» · đoạn ${hit.paragraph}: ${hit.excerpt}\n` +
        other
      )
    })

    const dropped = hits.length - shown.length
    const header =
      `${label}: ${formatCount(hits.length)} chỗ khớp ở ${matched.size}/${chapters.length} chương` +
      (dropped > 0
        ? `; trả ${shown.length}, bỏ ${formatCount(dropped)} — thu hẹp chuỗi tìm để xem phần còn lại.`
        : '.')
    // Keep under the turn's budget by showing fewer results rather than cutting one in half.
    let kept = lines.length
    const size = (count: number): number =>
      header.length + lines.slice(0, count).reduce((sum, line) => sum + line.length + 1, 0)
    while (kept > 1 && size(kept) > budget) kept--
    const trimmed =
      kept < lines.length ? `\n(Chỉ hiện ${kept} kết quả vì gần hết ngân sách đọc của lượt.)` : ''
    return {
      id: call.id,
      name: call.name,
      detail: `${label} — ${formatCount(hits.length)} chỗ ở ${matched.size} chương, trả ${kept}`,
      content: [header, ...lines.slice(0, kept)].join('\n') + trimmed
    }
  }

  return {
    run(call, options = {}) {
      const remaining = options.remainingChars ?? Infinity
      if (call.name === 'list_chapters') return listChapters(call)
      if (call.name === 'read_chapter' || call.name === 'search_work') {
        if (remaining <= 0) return budgetSpent(call, options.turnBudget ?? 0)
        return call.name === 'read_chapter'
          ? readChapter(call, Math.min(TOOL_TEXT_MAX, remaining))
          : searchWork(call, remaining)
      }
      return failed(call, 'Không có công cụ tên "' + call.name + '".')
    }
  }
}
