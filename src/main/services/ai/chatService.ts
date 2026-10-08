import type {
  ChatChunk,
  ChatFinishReason,
  ChatSendInput,
  ChatStartResult,
  ChatToolStep,
  ChatUsage
} from '../../../shared/contracts/aiChat'
import type { RegisterPresetId } from '../../../shared/contracts/addressingPresets'
import { buildChatMessages, type LocationChapter } from './chatPrompt'
import {
  CHAT_TOOL_DEFINITIONS,
  createChatTools,
  type ChatToolLibrary,
  type ChatToolWrites,
  type ToolResult
} from './chatTools'
import type { ConnectionTranslator } from './connectionService'
import { costOfUsage } from './costEstimate'
import { lookupModel } from '../../infra/providers/modelCatalog'
import { ProviderError } from '../../infra/providers/types'
import { describeProviderError, taskErrorPolicy } from './errorPolicy'
import { fallbackChain, fallbackLine, shouldFallback } from './fallback'
import type { ModelRef } from '../../../shared/contracts/aiPreferences'
import { addUsage, toWireUsage, type Usage } from '../../infra/providers/usage'

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
  translator(id: string, entryId: string): ConnectionTranslator
  /** Settings › Model › Dự phòng; absent in tests that do not care, which means no fallbacks. */
  preferences?(): { fallbacks: ModelRef[] }
}

export interface ChatServiceOptions {
  connections: ChatConnections
  /** Bộ mặc định xưng hô của tác phẩm; luật riêng của bộ đi vào system prompt. */
  register?: (input: ChatSendInput) => RegisterPresetId | null
  /** Tên tác phẩm, số và tên chương đang mở, cho khối vị trí; thiếu thì khối chỉ nói số đoạn. */
  chapter?: (input: ChatSendInput) => LocationChapter | null
  records?: {
    start(requestId: string, input: ChatSendInput, provider: string | null, model: string): string
    update(
      requestId: string,
      workId: string,
      patch: {
        answer: string
        /** What the model thought so far; absent leaves the stored reasoning as it is. */
        reasoning?: string
        status: 'running' | 'done' | 'error' | 'cancelled'
        tools: ChatToolStep[]
        usage?: ChatUsage | null
        costUsd?: number | null
        finishReason?: ChatFinishReason | null
        /** Set when a fallback answered: the model that really did. */
        provider?: string | null
        model?: string | null
      }
    ): void
  }
  /**
   * Kho để tool đọc nhìn vào. Thiếu nó thì lượt chạy không có tool nào: model chỉ thấy câu hỏi và lịch sử.
   */
  library?: ChatToolLibrary
  /**
   * Hai lối ghi của tool ghi: đề xuất chờ duyệt và thuật ngữ chờ duyệt. Thiếu thì tool ghi trả lời là
   * lượt này không được tạo đề xuất.
   */
  writes?: ChatToolWrites
  newId: () => string
  now: () => number
}

/**
 * Trần số vòng đọc trong **một** lượt.
 *
 * Một model vòng vo là một hóa đơn vòng vo, và không có trần thì một câu hỏi mơ hồ có thể đọc hết
 * tác phẩm. Hết vòng thì lượt trả lời bằng những gì đã đọc được, không phải báo lỗi — người dùng vẫn
 * có câu trả lời, chỉ là nó dựa trên ít dữ liệu hơn model muốn.
 *
 * Sáu vòng: đọc một chương 60.000 ký tự là ba trang, cộng một vòng tìm và một vòng liệt kê. Thứ chặn
 * chi phí là ngân sách ký tự bên dưới; số vòng chỉ chặn lặp vô ích. Cả hai là giá trị khởi đầu
 * (change `chat-tools-paging-search`), chỉnh khi có dữ liệu dùng thật.
 */
export const MAX_TOOL_ROUNDS = 6

/** Tổng ký tự công cụ được trả cho model trong một lượt (≈ bốn trang `read_chapter`). */
export const TOOL_CHARS_PER_TURN = 80_000

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
        message: describeProviderError(error),
        // Whether asking again can help is the chat policy's call (`errorPolicy.ts`), not the transport's.
        retryable: taskErrorPolicy('chat', error.kind).retryable,
        recoverAt,
        ...(error.account ? { account: error.account } : {})
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
    return this.startWithSession(input, emit).requestId
  }

  startWithSession(input: ChatSendInput, emit: ChatEmit): ChatStartResult {
    const { connections, newId } = this.options
    // Cùng một đường với lối dịch: nó dựng provider trên kho khóa của kết nối và từ chối kết nối
    // đang tắt với đúng câu hộp thoại dịch đang dùng. Tên method nói "translator" vì nó có trước;
    // thứ nó trả về là một kết nối đã sẵn sàng gọi, không riêng gì việc dịch.
    // Cài đặt của mục được đọc ở đây, **một lần**, và nằm trong `session`: mọi vòng đọc công cụ của lượt dùng
    // nguyên bộ đó, nên sửa cài đặt giữa chừng chỉ có hiệu lực từ lượt kế tiếp.
    const session = connections.translator(input.connectionId, input.entryId)

    const requestId = newId()
    const sessionId = this.options.records?.start(
      requestId,
      input,
      session.connection.providerId ?? null,
      session.entry.model
    )
    const controller = new AbortController()
    this.running.set(requestId, controller)

    // Cố ý không `await`: `start` phải trả `requestId` trước khi chunk đầu tiên đi ra. `void` cộng
    // `catch` ở trong `run` để không bao giờ có promise bị bỏ rơi.
    void this.run(requestId, input, session, controller, emit)
    return { requestId, ...(sessionId === undefined ? {} : { sessionId }) }
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
    first: ConnectionTranslator,
    controller: AbortController,
    emit: ChatEmit
  ): Promise<void> {
    let session = first
    // The fallbacks of Settings, tried in order when a round fails before any text arrived (design D7 of
    // change `hermes-settings-modal`). Built once per turn; an entry that cannot be called is passed over.
    const chain = fallbackChain(
      { connectionId: first.connection.id, entryId: first.entry.id },
      this.options.connections.preferences?.().fallbacks ?? []
    )
    const { now } = this.options
    let partial = false
    // Mỗi vòng đọc là một lời gọi có hóa đơn riêng, nên cộng dồn (`addUsage`) thay vì ghi đè: ghi đè
    // sẽ báo đúng chi phí của vòng cuối và giấu phần còn lại.
    let usage: Usage | null = null
    // Vì sao vòng **cuối** dừng — vòng trả lời thật, không phải vòng đọc công cụ trước đó.
    let finishReason: ChatFinishReason | undefined
    let answer = ''
    let reasoning = ''
    const toolSteps: ChatToolStep[] = []
    let persistedLength = 0
    let persistedAt = now()

    try {
      const { library, writes } = this.options
      // Bound to this turn: where the user is, and the turn a proposal belongs to (its id is the request id).
      const tools = library
        ? createChatTools(library, input.workId, {
            chapterId: input.chapterId,
            location: input.location,
            turnId: requestId,
            ...(writes ? { writes } : {})
          })
        : null
      const messages = buildChatMessages(
        input,
        this.options.register?.(input),
        this.options.chapter?.(input) ?? null
      )
      // Ngân sách thuộc lượt, không thuộc runner: mỗi lần gọi nhận phần còn lại và tự rút trang về đó.
      let toolChars = 0

      for (let round = 0; ; round++) {
        // Vòng cuối **không** mời công cụ nữa, nên model buộc phải trả lời bằng những gì đã đọc. Đó
        // là thứ làm vòng lặp này chắc chắn dừng, chứ không phải một lời hứa về hành vi của model.
        const offer = tools !== null && round < MAX_TOOL_ROUNDS ? CHAT_TOOL_DEFINITIONS : undefined
        let calls: Array<{ id: string; name: string; arguments: string }> = []

        for (;;) {
          try {
            for await (const event of session.provider.chat(messages, {
              signal: controller.signal,
              tools: offer,
              // Round 0 is the person's own request; later rounds answer tool calls (Copilot bills them apart).
              turnRound: round,
              ...(input.sessionId ? { sessionId: input.sessionId } : {})
            })) {
              // Lượt đã bị dọn khỏi sổ (cửa sổ đóng) thì ngừng phát: emit vào một cửa sổ không còn đó là
              // chỗ sinh ra lỗi "object has been destroyed" khó lần.
              if (!this.running.has(requestId)) return
              if (event.kind === 'reasoning') {
                // Thinking already reached the screen: like text, it may not be swapped for another model's.
                partial = true
                reasoning += event.text
                emit({ requestId, kind: 'reasoning', text: event.text })
              } else if (event.kind === 'delta') {
                partial = true
                answer += event.text
                if (
                  this.options.records &&
                  (answer.length - persistedLength >= 1024 || now() - persistedAt >= 1000)
                ) {
                  this.options.records.update(requestId, input.workId, {
                    answer,
                    reasoning,
                    status: 'running',
                    tools: toolSteps
                  })
                  persistedLength = answer.length
                  persistedAt = now()
                }
                emit({ requestId, kind: 'delta', text: event.text })
              } else {
                // Mỗi vòng là một lần gọi có hóa đơn riêng, nên cộng dồn thay vì ghi đè.
                usage = addUsage(usage, event.usage)
                finishReason = event.finishReason === 'unknown' ? undefined : event.finishReason
                if (event.kind === 'tool-calls') calls = event.calls
              }
            }
            break
          } catch (error) {
            // Never mid-answer: a reply that already streamed text is not swapped for another model's.
            if (partial || controller.signal.aborted || !shouldFallback(error)) throw error
            const next = this.nextFallback(chain)
            if (!next) throw error
            const line = fallbackLine(
              session.connection.name + ' · ' + session.entry.name,
              next.connection.name + ' · ' + next.entry.name,
              error
            )
            session = next
            if (!this.running.has(requestId)) return
            emit({ requestId, kind: 'tool', name: 'fallback', detail: line })
            toolSteps.push({ name: 'fallback', detail: line })
            this.options.records?.update(requestId, input.workId, {
              answer,
              status: 'running',
              tools: toolSteps,
              provider: session.connection.providerId ?? null,
              model: session.entry.model
            })
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
          const result: ToolResult = tools.run(
            { id: call.id, name: call.name, args: call.arguments },
            {
              remainingChars: Math.max(0, TOOL_CHARS_PER_TURN - toolChars),
              turnBudget: TOOL_CHARS_PER_TURN
            }
          )
          toolChars += result.charge ?? result.content.length
          if (!this.running.has(requestId)) return
          emit({
            requestId,
            kind: 'tool',
            name: result.name,
            detail: result.detail,
            status: result.status
          })
          // The card goes out as soon as the proposal exists, while the turn is still running.
          if (result.proposal) emit({ requestId, kind: 'proposal', proposal: result.proposal })
          toolSteps.push({
            name: result.name,
            detail: result.detail,
            status: result.status,
            ...(result.proposal ? { proposal: result.proposal } : {})
          })
          this.options.records?.update(requestId, input.workId, {
            answer,
            status: 'running',
            tools: toolSteps
          })
          messages.push({ role: 'tool', tool_call_id: result.id, content: result.content })
        }
      }

      if (!this.running.has(requestId)) return
      const wireUsage = usage === null ? null : toWireUsage(usage)
      const usd = usage === null ? null : costOfUsage(usage, this.modelInfo(session))
      this.options.records?.update(requestId, input.workId, {
        answer,
        reasoning,
        status: 'done',
        tools: toolSteps,
        usage: wireUsage,
        costUsd: usd,
        finishReason: finishReason ?? null
      })
      emit({
        requestId,
        kind: 'done',
        usage: wireUsage,
        usd,
        keyTail: session.lastKeyTail(),
        ...(finishReason === undefined ? {} : { finishReason })
      })
    } catch (error) {
      if (!this.running.has(requestId)) return
      const chunk = toChatError(error, now())
      try {
        this.options.records?.update(requestId, input.workId, {
          answer,
          reasoning,
          status: chunk.error.kind === 'cancelled' ? 'cancelled' : 'error',
          tools: toolSteps
        })
      } catch {
        // The original failure is still reported; a later startup marks any unfinished row interrupted.
      }
      emit({ ...chunk, requestId, partial })
    } finally {
      this.running.delete(requestId)
    }
  }

  /** The next fallback that can be called now; the ones that cannot (disabled, no key, deleted) are skipped. */
  private nextFallback(chain: ModelRef[]): ConnectionTranslator | null {
    while (chain.length > 0) {
      const ref = chain.shift()!
      try {
        return this.options.connections.translator(ref.connectionId, ref.entryId)
      } catch {
        // Not callable right now; try the next one.
      }
    }
    return null
  }

  private modelInfo(session: ConnectionTranslator): ReturnType<typeof lookupModel> {
    return lookupModel(session.entry.model, session.connection.providerId ?? undefined)
  }
}
