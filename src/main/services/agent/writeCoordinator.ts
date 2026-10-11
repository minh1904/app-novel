import { randomUUID } from 'node:crypto'
import type {
  AgentWriteIntent,
  AgentWriteIntentAck,
  ResolvedTarget
} from '../../../shared/contracts/agent'
import { StorageError } from '../../infra/storage/errors'

interface PendingIntent {
  resolve: (ack: AgentWriteIntentAck) => void
  reject: (error: StorageError) => void
  timer: ReturnType<typeof setTimeout>
}

export class AgentWriteCoordinator {
  private readonly pending = new Map<string, PendingIntent>()

  constructor(private readonly timeoutMs = 5_000) {}

  request(
    operationId: string,
    target: ResolvedTarget,
    publish?: (intent: AgentWriteIntent) => void
  ): Promise<AgentWriteIntentAck> {
    if (target.kind !== 'chapter') {
      throw new StorageError('validation', 'Operation ghi cần target là chương.')
    }
    if (!publish) {
      return Promise.resolve({ intentId: randomUUID(), status: 'not-open' })
    }

    const intent: AgentWriteIntent = {
      intentId: randomUUID(),
      operationId,
      target: { workId: target.workId, chapterId: target.chapterId, side: 'target' }
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(intent.intentId)
        reject(new StorageError('io', 'Không nhận được xác nhận lưu editor trước khi ghi.'))
      }, this.timeoutMs)
      this.pending.set(intent.intentId, { resolve, reject, timer })
      publish(intent)
    })
  }

  acknowledge(ack: AgentWriteIntentAck): void {
    const pending = this.pending.get(ack.intentId)
    if (!pending) throw new StorageError('not_found', 'Write intent không còn hiệu lực.')
    clearTimeout(pending.timer)
    this.pending.delete(ack.intentId)
    if (ack.status === 'flush-failed') {
      pending.reject(
        new StorageError('io', 'Không thể lưu thay đổi đang soạn trước khi agent ghi.')
      )
      return
    }
    pending.resolve(ack)
  }

  close(): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(new StorageError('cancelled', 'Runtime agent đang đóng.'))
    }
    this.pending.clear()
  }
}
