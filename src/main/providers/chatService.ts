import type { ChatChunk, ChatSendInput, ChatUsage } from '../../shared/aiChat'
import { buildChatMessages } from './chatPrompt'
import {
  CHAT_TOOL_DEFINITIONS,
  createChatTools,
  type ChatToolLibrary,
  type ToolResult
} from './chatTools'
import type { ConnectionTranslator } from './connectionService'
import { costOfUsage } from './costEstimate'
import { lookupModel } from './modelCatalog'
import { ProviderError } from './types'

/**
 * Vòng đời một lượt hội thoại trong main.
 *
 * Khác mọi dịch vụ khác trong kho này ở một điểm: một lượt **không** là một lời gọi trả kết quả.
 * `start` trả `requestId` rồi về ngay, còn chữ đi ra bằng `emit`. Đó là lý do có sổ
 * `Map<requestId, AbortController>` — không có nó thì không hủy được, và một cửa sổ bị đóng sẽ để
 * lại những lượt chạy tiếp tới hết.
 *
 * `emit` được **tiêm vào**, nên lớp này không biết `webContents` là gì và test được không cần
 * Electron. Ba luật bất biến mà mọi test ở đây tồn tại để giữ: một `requestId` nhận đúng một `done`
 * **hoặc** `error`, không bao giờ cả hai, và không `delta` nào sau khi lượt đã kết thúc.
 */

export type ChatEmit = (chunk: ChatChunk) => void

/**
 * Chỉ phần của `ConnectionService` mà lớp này dùng.
 *
 * Khai hẹp có chủ ý: `ConnectionService` thật cần một `Db` và một kho khóa mở được, nên phụ thuộc
 * vào cả lớp sẽ buộc mọi test của vòng đời lượt chat phải dựng một kho trên đĩa — để kiểm một thứ
 * không liên quan gì tới kho.
 */
export interface ChatConnections {
  translator(id: string, model: string): ConnectionTranslator
}

export interface ChatServiceOptions {
  connections: ChatConnections
  /**
   * Kho để các công cụ **chỉ đọc** nhìn vào. Thiếu nó thì lượt vẫn chạy, chỉ là model không với được
   * ra ngoài ngữ cảnh đã gửi kèm — đó là hành vi của change này trước khi có tool.
   */
  library?: ChatToolLibrary
  newId: () => string
  now: () => number
}

/**
 * Trần số vòng đọc trong **một** lượt.
 *
 * Một model vòng vo là một hóa đơn vòng vo, và không có trần thì một câu hỏi mơ hồ có thể đọc hết
 * tác phẩm. Hết vòng thì lượt trả lời bằng những gì đã đọc được, không phải báo lỗi — người dùng vẫn
 * có câu trả lời, chỉ là nó dựa trên ít dữ liệu hơn model muốn.
 */
const MAX_TOOL_ROUNDS = 3

/**
 * Cộng dồn lượng dùng qua các vòng đọc.
 *
 * Một lượt có tool là **nhiều** lời gọi, mỗi lời gọi một hóa đơn; ghi đè thay vì cộng sẽ báo cho
 * người dùng đúng chi phí của vòng cuối và giấu mất phần còn lại.
 */
function addUsage(total: ChatUsage | null, next: ChatUsage | null): ChatUsage | null {
  if (next === null) return total
  if (total === null) return next
  return {
    inputTokens: total.inputTokens + next.inputTokens,
    outputTokens: total.outputTokens + next.outputTokens
  }
}

/** Lỗi của nhà cung cấp về renderer như **dữ liệu trong chunk**, không phải lỗi của kênh IPC. */
function toChatError(error: unknown, now: number): ChatChunk & { kind: 'error' } {
  if (error instanceof ProviderError) {
    const recoverAt =
      error.retryAfterMs === undefined ? null : now + Math.max(0, error.retryAfterMs)
    return {
      requestId: '',
      kind: 'error',
      error: {
        kind: error.kind,
        message: error.message,
        retryable: error.retryable,
        recoverAt
      },
      partial: false
    }
  }
  const message = error instanceof Error ? error.message : String(error)
  return {
    requestId: '',
    kind: 'error',
    error: { kind: 'network', message, retryable: true, recoverAt: null },
    partial: false
  }
}

export class ChatService {
  private readonly running = new Map<string, AbortController>()

  constructor(private readonly options: ChatServiceOptions) {}

  /** Số lượt đang chạy. Dùng để test rằng sổ được dọn, không dùng trong luồng chính. */
  get activeCount(): number {
    return this.running.size
  }

  /**
   * Bắt đầu một lượt và trả `requestId` **ngay**.
   *
   * Kết nối không dùng được thì **ném tại đây**, trước khi có `requestId` nào: người dùng nhận một
   * lỗi của chính lời gọi thay vì một lượt rỗng rồi lỗi, và không có lời gọi nào ra ngoài.
   */
  start(input: ChatSendInput, emit: ChatEmit): string {
    const { connections, newId } = this.options
    // Cùng một đường với lối dịch: nó dựng provider trên kho khóa của kết nối và từ chối kết nối
    // đang tắt với đúng câu hộp thoại dịch đang dùng. Tên method nói "translator" vì nó có trước;
    // thứ nó trả về là một kết nối đã sẵn sàng gọi, không riêng gì việc dịch.
    const session = connections.translator(input.connectionId, input.model)

    const requestId = newId()
    const controller = new AbortController()
    this.running.set(requestId, controller)

    // Cố ý không `await`: `start` phải trả `requestId` trước khi chunk đầu tiên đi ra. `void` cộng
    // `catch` ở trong `run` để không bao giờ có promise bị bỏ rơi.
    void this.run(requestId, input, session, controller, emit)
    return requestId
  }

  cancel(requestId: string): void {
    this.running.get(requestId)?.abort()
  }

  /** Dọn mọi lượt — dùng khi cửa sổ đóng hoặc reload: không còn ai nhận chữ nữa. */
  cancelAll(): void {
    for (const controller of this.running.values()) controller.abort()
    this.running.clear()
  }

  private async run(
    requestId: string,
    input: ChatSendInput,
    session: ConnectionTranslator,
    controller: AbortController,
    emit: ChatEmit
  ): Promise<void> {
    const { now } = this.options
    let partial = false
    let usage: ChatUsage | null = null

    try {
      const { library } = this.options
      const tools = library ? createChatTools(library, input.workId) : null
      const messages = buildChatMessages(input)

      for (let round = 0; ; round++) {
        // Vòng cuối **không** mời công cụ nữa, nên model buộc phải trả lời bằng những gì đã đọc. Đó
        // là thứ làm vòng lặp này chắc chắn dừng, chứ không phải một lời hứa về hành vi của model.
        const offer = tools !== null && round < MAX_TOOL_ROUNDS ? CHAT_TOOL_DEFINITIONS : undefined
        let calls: Array<{ id: string; name: string; arguments: string }> = []

        for await (const event of session.provider.chat(messages, {
          signal: controller.signal,
          tools: offer
        })) {
          // Lượt đã bị dọn khỏi sổ (cửa sổ đóng) thì ngừng phát: emit vào một cửa sổ không còn đó là
          // chỗ sinh ra lỗi "object has been destroyed" khó lần.
          if (!this.running.has(requestId)) return
          if (event.kind === 'delta') {
            partial = true
            emit({ requestId, kind: 'delta', text: event.text })
          } else {
            // Mỗi vòng là một lần gọi có hóa đơn riêng, nên cộng dồn thay vì ghi đè.
            usage = addUsage(usage, event.usage)
            if (event.kind === 'tool-calls') calls = event.calls
          }
        }

        if (calls.length === 0 || tools === null) break

        messages.push({
          role: 'assistant',
          content: '',
          tool_calls: calls.map((call) => ({
            id: call.id,
            type: 'function' as const,
            function: { name: call.name, arguments: call.arguments }
          }))
        })

        for (const call of calls) {
          const result: ToolResult = tools.run({
            id: call.id,
            name: call.name,
            args: call.arguments
          })
          if (!this.running.has(requestId)) return
          emit({ requestId, kind: 'tool', name: result.name, detail: result.detail })
          messages.push({ role: 'tool', tool_call_id: result.id, content: result.content })
        }
      }

      if (!this.running.has(requestId)) return
      emit({
        requestId,
        kind: 'done',
        usage,
        usd: usage === null ? null : costOfUsage(usage, this.modelInfo(session, input.model)),
        keyTail: session.lastKeyTail()
      })
    } catch (error) {
      if (!this.running.has(requestId)) return
      const chunk = toChatError(error, now())
      emit({ ...chunk, requestId, partial })
    } finally {
      this.running.delete(requestId)
    }
  }

  private modelInfo(
    session: ConnectionTranslator,
    model: string
  ): ReturnType<typeof lookupModel> {
    return lookupModel(model, session.connection.providerId ?? undefined)
  }
}
