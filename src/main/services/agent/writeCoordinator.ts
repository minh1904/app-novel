import { randomUUID } from 'node:crypto'
import type {
  AgentWriteIntent,
  AgentWriteIntentAck,
  ResolvedTarget
} from '../../../shared/contracts/agent'
import { StorageError } from '../../infra/storage/errors'

interface PendingIntent {
  /** Windows that received the intent and have not answered yet. */
  waiting: Set<number>
  last: AgentWriteIntentAck
  resolve: (ack: AgentWriteIntentAck) => void
  reject: (error: StorageError) => void
  timer: ReturnType<typeof setTimeout>
}

/**
 * Before an agent write, every open window must flush its dirty editor and answer (design D8).
 * `publish` sends the intent to every window and returns the ids it reached; a window that closes
 * while the coordinator waits counts as `not-open`.
 */
export class AgentWriteCoordinator {
  private readonly pending = new Map<string, PendingIntent>()

  constructor(private readonly timeoutMs = 5_000) {}

  request(
    operationId: string,
    target: ResolvedTarget,
    publish?: (intent: AgentWriteIntent) => number[]
  ): Promise<AgentWriteIntentAck> {
    if (target.kind !== 'chapter') {
      throw new StorageError('validation', 'Operation ghi cần target là chương.')
    }
    const intent: AgentWriteIntent = {
      intentId: randomUUID(),
      operationId,
      target: { workId: target.workId, chapterId: target.chapterId, side: 'target' }
    }
    const notOpen: AgentWriteIntentAck = { intentId: intent.intentId, status: 'not-open' }
    if (!publish) return Promise.resolve(notOpen)

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(intent.intentId)
        reject(new StorageError('io', 'Không nhận được xác nhận lưu editor trước khi ghi.'))
      }, this.timeoutMs)
      const entry: PendingIntent = { waiting: new Set(), last: notOpen, resolve, reject, timer }
      this.pending.set(intent.intentId, entry)
      for (const id of publish(intent)) entry.waiting.add(id)
      this.settleIfDone(intent.intentId, entry)
    })
  }

  /** `windowId` is the sender; without one (a single window), the first waiting window answers. */
  acknowledge(ack: AgentWriteIntentAck, windowId?: number): void {
    const pending = this.pending.get(ack.intentId)
    if (!pending) throw new StorageError('not_found', 'Write intent không còn hiệu lực.')
    if (ack.status === 'flush-failed') {
      this.finish(ack.intentId, pending)
      pending.reject(
        new StorageError('io', 'Không thể lưu thay đổi đang soạn trước khi agent ghi.')
      )
      return
    }
    const id = windowId ?? pending.waiting.values().next().value
    if (id !== undefined) pending.waiting.delete(id)
    if (ack.status === 'ack') pending.last = ack
    this.settleIfDone(ack.intentId, pending)
  }

  windowClosed(windowId: number): void {
    for (const [intentId, pending] of this.pending) {
      if (pending.waiting.delete(windowId)) this.settleIfDone(intentId, pending)
    }
  }

  close(): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(new StorageError('cancelled', 'Runtime agent đang đóng.'))
    }
    this.pending.clear()
  }

  private settleIfDone(intentId: string, pending: PendingIntent): void {
    if (pending.waiting.size > 0) return
    this.finish(intentId, pending)
    pending.resolve(pending.last)
  }

  private finish(intentId: string, pending: PendingIntent): void {
    clearTimeout(pending.timer)
    this.pending.delete(intentId)
  }
}
