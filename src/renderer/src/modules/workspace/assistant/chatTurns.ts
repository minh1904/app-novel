import {
  CHAT_HISTORY_CHARS_BUDGET,
  type ChatAction,
  type ChatChunk,
  type ChatContextBlock,
  type ChatError,
  type ChatFinishReason,
  type ChatLocation,
  type ChatRange,
  type ChatToolProposal,
  type ChatToolStep,
  type ChatTurn,
  type ChatUsage
} from '../../../../../shared/contracts/aiChat'
import type { AiTurnView } from '../../../../../shared/contracts/aiHistory'

/**
 * Quản lý trạng thái hội thoại của trợ lý AI dưới dạng hàm thuần túy.
 * Đảm bảo các lượt hỏi không bị lẫn văn bản, lượt đã đóng không nhận thêm chunk mới,
 * và các đề xuất được cập nhật độc lập thông qua hàng chờ.
 */

export type TurnStatus = 'sending' | 'running' | 'done' | 'cancelled' | 'error' | 'interrupted'

/** Một bước gọi công cụ của model; `detail` mô tả phạm vi thực hiện. */
export type ToolStep = ChatToolStep

export interface TurnView {
  /** Khóa định danh React nội bộ, gán trước khi có request id. */
  localId: string
  /** ID yêu cầu từ tiến trình chính dùng để đối soát các chunk stream trả về. */
  requestId: string | null
  question: string
  /** Chương đang mở khi gửi câu hỏi. */
  chapterId?: string
  /** Chế độ hành động của lượt hỏi. */
  mode: ChatAction
  answer: string
  /** Quá trình suy nghĩ của model trước khi trả lời. */
  reasoning: string
  /** Thời điểm gửi câu hỏi (ms epoch). */
  createdAt: number
  /** Thời điểm kết thúc lượt hỏi; `null` khi đang chạy. */
  finishedAt: number | null
  status: TurnStatus
  error: ChatError | null
  usage: ChatUsage | null
  usd: number | null
  keyTail: string | null
  finishReason: ChatFinishReason | null
  /** Danh sách các thao tác công cụ theo thứ tự thực hiện. */
  tools: ToolStep[]
  /** Danh sách các đề xuất thay đổi nội dung từ công cụ. */
  proposals: ChatToolProposal[]
  /** Vị trí con trỏ của người dùng khi gửi câu hỏi. */
  location?: ChatLocation | null
  /** Khối ngữ cảnh đính kèm (nếu có). */
  context: ChatContextBlock[]
  /** Phạm vi đoạn văn bản liên quan. */
  range: ChatRange | null
}

export interface Session {
  turns: TurnView[]
  /** Số lượt hỏi cũ bị lược bỏ do vượt quá ngân sách ký tự lịch sử; bằng 0 nếu giữ toàn bộ. */
  dropped: number
}

export const emptySession: Session = { turns: [], dropped: 0 }

export function restoredSession(turns: AiTurnView[]): Session {
  return {
    dropped: turns[turns.length - 1]?.droppedTurns ?? 0,
    turns: [...turns].reverse().map((turn) => ({
      localId: turn.id,
      requestId: turn.id,
      question: turn.question,
      chapterId: turn.chapterId ?? undefined,
      mode: turn.action,
      answer: turn.answer,
      reasoning: turn.reasoning,
      createdAt: turn.createdAt,
      finishedAt: turn.status === 'sending' || turn.status === 'running' ? null : turn.updatedAt,
      status: turn.status,
      error: null,
      usage: turn.usage,
      usd: turn.costUsd,
      keyTail: null,
      finishReason: turn.finishReason,
      tools: turn.tools,
      proposals: turn.proposals,
      location: turn.location,
      context: turn.context,
      range: turn.range
    }))
  }
}

/** Kiểm tra lượt hỏi đang chờ phản hồi để tiếp nhận các chunk mới. */
const isOpen = (turn: TurnView): boolean => turn.status === 'sending' || turn.status === 'running'

export function beginTurn(
  session: Session,
  turn: { localId: string; question: string; chapterId?: string; location?: ChatLocation },
  now: number = Date.now()
): Session {
  return {
    ...session,
    turns: [
      ...session.turns,
      {
        ...turn,
        mode: 'chat',
        requestId: null,
        answer: '',
        reasoning: '',
        createdAt: now,
        finishedAt: null,
        tools: [],
        proposals: [],
        context: [],
        range: null,
        status: 'sending',
        error: null,
        usage: null,
        usd: null,
        keyTail: null,
        finishReason: null
      }
    ]
  }
}

/** Gán request ID từ tiến trình chính vào lượt hỏi để liên kết với luồng chunk dữ liệu. */
export function attachRequestId(session: Session, localId: string, requestId: string): Session {
  return mapTurn(
    session,
    (turn) => turn.localId === localId,
    (turn) => ({ ...turn, requestId })
  )
}

/** Xử lý khi yêu cầu gửi thất bại ngay từ đầu, kết thúc lượt hỏi và ghi nhận lỗi. */
export function failTurn(
  session: Session,
  localId: string,
  error: ChatError,
  now: number = Date.now()
): Session {
  return mapTurn(
    session,
    (turn) => turn.localId === localId && isOpen(turn),
    (turn) => ({
      ...turn,
      status: error.kind === 'cancelled' ? 'cancelled' : 'error',
      error,
      finishedAt: now
    })
  )
}

/**
 * Áp dụng một chunk dữ liệu từ luồng stream vào phiên hội thoại.
 * Khớp lượt hỏi chính xác theo `requestId` và bỏ qua chunk nếu lượt hỏi đã kết thúc.
 */
export function applyChunk(session: Session, chunk: ChatChunk, now: number = Date.now()): Session {
  const matches = (turn: TurnView): boolean => turn.requestId === chunk.requestId && isOpen(turn)

  if (chunk.kind === 'reasoning') {
    return mapTurn(session, matches, (turn) => ({
      ...turn,
      status: 'running',
      reasoning: turn.reasoning + chunk.text
    }))
  }
  if (chunk.kind === 'delta') {
    return mapTurn(session, matches, (turn) => ({
      ...turn,
      status: 'running',
      answer: turn.answer + chunk.text
    }))
  }
  if (chunk.kind === 'tool') {
    // Bước gọi công cụ biểu thị tiến trình đang chạy, ghi nhận bước mới và giữ lượt hỏi tiếp tục.
    return mapTurn(session, matches, (turn) => ({
      ...turn,
      status: 'running',
      tools: [
        ...turn.tools,
        {
          name: chunk.name,
          detail: chunk.detail,
          ...(chunk.status === undefined ? {} : { status: chunk.status })
        }
      ]
    }))
  }
  if (chunk.kind === 'proposal') {
    return mapTurn(session, matches, (turn) => ({
      ...turn,
      status: 'running',
      proposals: [...turn.proposals, chunk.proposal]
    }))
  }
  if (chunk.kind === 'done') {
    return mapTurn(session, matches, (turn) => ({
      ...turn,
      status: 'done',
      finishedAt: now,
      usage: chunk.usage,
      usd: chunk.usd,
      keyTail: chunk.keyTail,
      finishReason: chunk.finishReason ?? null
    }))
  }
  return mapTurn(session, matches, (turn) => ({
    ...turn,
    // Trạng thái hủy do người dùng chủ động dừng, phân biệt với lỗi kỹ thuật.
    status: chunk.error.kind === 'cancelled' ? 'cancelled' : 'error',
    error: chunk.error,
    finishedAt: now
  }))
}

function mapTurn(
  session: Session,
  matches: (turn: TurnView) => boolean,
  update: (turn: TurnView) => TurnView
): Session {
  let changed = false
  const turns = session.turns.map((turn) => {
    if (!matches(turn)) return turn
    changed = true
    return update(turn)
  })
  return changed ? { ...session, turns } : session
}

/** Danh sách request ID của các lượt hỏi đang chạy; dùng để hủy khi đóng bảng trợ lý. */
export function openRequestIds(session: Session): string[] {
  return session.turns
    .filter((turn) => isOpen(turn) && turn.requestId !== null)
    .map((turn) => turn.requestId as string)
}

/**
 * Trích xuất lịch sử các lượt hỏi đáp hoàn tất để gửi kèm câu hỏi tiếp theo,
 * ưu tiên các lượt gần nhất trong giới hạn ngân sách ký tự và báo cáo số lượt bị lược bỏ.
 */
export function historyFor(
  session: Session,
  budget = CHAT_HISTORY_CHARS_BUDGET
): { history: ChatTurn[]; dropped: number } {
  const complete = session.turns.filter((turn) => turn.status === 'done' && turn.answer !== '')

  const kept: TurnView[] = []
  let spent = 0
  // Duyệt từ mới nhất đến cũ nhất để ưu tiên giữ lại ngữ cảnh gần nhất.
  for (let i = complete.length - 1; i >= 0; i--) {
    const turn = complete[i]
    const cost = turn.question.length + turn.answer.length
    if (kept.length > 0 && spent + cost > budget) break
    spent += cost
    kept.unshift(turn)
  }

  const history: ChatTurn[] = []
  for (const turn of kept) {
    history.push({ role: 'user', text: turn.question })
    history.push({ role: 'assistant', text: turn.answer })
  }
  return { history, dropped: complete.length - kept.length }
}
