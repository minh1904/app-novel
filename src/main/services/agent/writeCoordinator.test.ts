import { describe, expect, it } from 'vitest'
import type { AgentWriteIntent, ResolvedTarget } from '../../../shared/contracts/agent'
import { AgentWriteCoordinator } from './writeCoordinator'

const target: ResolvedTarget = {
  kind: 'chapter',
  workId: 'w',
  workLabel: 'W',
  chapterId: 'c',
  chapterLabel: 'C'
}

describe('AgentWriteCoordinator', () => {
  it('waits for every window that received the intent; a closed window counts as not-open', async () => {
    const coordinator = new AgentWriteCoordinator(1_000)
    let intent: AgentWriteIntent | undefined
    let settled = false
    const request = coordinator
      .request('op', target, (sent) => {
        intent = sent
        return [1, 2]
      })
      .then((ack) => {
        settled = true
        return ack
      })
    coordinator.acknowledge({ intentId: intent!.intentId, status: 'ack', revision: 4 }, 1)
    await Promise.resolve()
    expect(settled).toBe(false)
    coordinator.windowClosed(2)
    await expect(request).resolves.toMatchObject({ status: 'ack', revision: 4 })
  })

  it('fails closed when any window cannot flush', async () => {
    const coordinator = new AgentWriteCoordinator(1_000)
    let intentId = ''
    const request = coordinator.request('op', target, (sent) => {
      intentId = sent.intentId
      return [1, 2]
    })
    coordinator.acknowledge({ intentId, status: 'ack' }, 1)
    coordinator.acknowledge({ intentId, status: 'flush-failed' }, 2)
    await expect(request).rejects.toThrow(/Không thể lưu/)
  })

  it('goes ahead at once when no window is open', async () => {
    const coordinator = new AgentWriteCoordinator(1_000)
    await expect(coordinator.request('op', target, () => [])).resolves.toMatchObject({
      status: 'not-open'
    })
  })
})
