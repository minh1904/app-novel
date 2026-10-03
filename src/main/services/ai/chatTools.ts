import type { ChapterItem } from '../../../shared/chapters'
import type { TextRecord, TextSide } from '../../../shared/text'

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

/** Only the two read methods of `LibraryStore` that the tools use. */
export interface ChatToolLibrary {
  listChapters(workId: string): ChapterItem[]
  readText(workId: string, chapterId: string, side: TextSide): TextRecord
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

/** Longest chapter text a single read may return. Beyond this the model gets a stated truncation. */
export const TOOL_TEXT_MAX = 20_000

/**
 * The tool list sent to the provider, in OpenAI's shape.
 *
 * Deliberately two tools. Every extra tool is a thing the model can spend a round-trip (and the
 * user's money) getting wrong, and these two cover the case that actually came up: "dịch chương 2"
 * while chapter 1 is open.
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
        'Đọc văn bản của một chương trong tác phẩm đang mở. Chỉ đọc, không sửa được gì. Dùng khi câu hỏi nhắc tới một chương không nằm trong ngữ cảnh đã gửi kèm.',
      parameters: {
        type: 'object',
        properties: {
          chapter: { type: 'integer', description: 'Số thứ tự chương, bắt đầu từ 1.' },
          side: {
            type: 'string',
            enum: ['source', 'target'],
            description: 'source là bản gốc, target là bản dịch.'
          }
        },
        required: ['chapter', 'side']
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
    return parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export interface ChatToolRunner {
  run(call: ToolCall): ToolResult
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

  function readChapter(call: ToolCall): ToolResult {
    const args = readArgs(call)
    if (args === null) return failed(call, 'Tham số không phải JSON hợp lệ.')

    const number = args.chapter
    const side = args.side
    if (typeof number !== 'number' || !Number.isInteger(number)) {
      return failed(call, 'Thiếu số chương, hoặc số chương không phải số nguyên.')
    }
    if (side !== 'source' && side !== 'target') {
      return failed(call, 'Tham số side phải là "source" hoặc "target".')
    }

    const chapters = library.listChapters(workId)
    const chapter = chapters.find((entry) => entry.number === number)
    if (!chapter) {
      return failed(
        call,
        'Không có chương số ' + number + '. Tác phẩm có ' + chapters.length + ' chương.'
      )
    }

    const label = 'Chương ' + chapter.number + ' · ' + (side === 'source' ? 'bản gốc' : 'bản dịch')
    const record = library.readText(workId, chapter.id, side)
    if (record.content.trim() === '') {
      return {
        id: call.id,
        name: call.name,
        detail: label + ' — trống',
        content: label + ' chưa có nội dung.'
      }
    }

    const cut = record.content.length > TOOL_TEXT_MAX
    return {
      id: call.id,
      name: call.name,
      detail: label + ' — ' + record.content.length + ' ký tự' + (cut ? ', đã cắt' : ''),
      content:
        label +
        ':\n' +
        record.content.slice(0, TOOL_TEXT_MAX) +
        // Never truncate silently: a model summarising half a chapter as if it were the whole one is
        // wrong in a way the answer itself gives no hint of.
        (cut ? '\n[Đã cắt; chương dài ' + record.content.length + ' ký tự.]' : '')
    }
  }

  return {
    run(call) {
      if (call.name === 'list_chapters') return listChapters(call)
      if (call.name === 'read_chapter') return readChapter(call)
      return failed(call, 'Không có công cụ tên "' + call.name + '".')
    }
  }
}
