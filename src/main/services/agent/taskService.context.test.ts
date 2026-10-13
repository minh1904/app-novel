import { describe, expect, it } from 'vitest'
import type { ContextStrategy } from '../../../shared/contracts/agentTask'
import { segment } from '../../../shared/segmentation/segmenter'
import { AgentRepository } from '../../infra/storage/agentRepository'
import { AgentTaskRepository } from '../../infra/storage/agentTaskRepository'
import type { ExtractionMessage } from '../ai/glossaryExtraction'
import { ContextExtractionService } from '../context/contextExtractionService'
import { setupAgent } from './agentTestKit'
import { AgentTaskService } from './taskService'
import { AgentWriteCoordinator } from './writeCoordinator'

let commands = 0
const command = () => `00000000-0000-4000-8000-${(++commands).toString().padStart(12, '0')}`

interface Term {
  source: string
  type: string
  target: string
}

/** Tasks over chapters that mention 韩立, with a scripted extraction model and the real runner. */
function contextKit(terms: Term[]) {
  const kit = setupAgent()
  const texts = ['韩立来了。\n\n韩立走了。', '南宫婉来了。\n\n南宫婉走了。']
  const chapters = texts.map((text, index) => {
    const chapter = kit.library.createChapter(kit.work1.id, `Thử ${index + 1}`).chapter
    kit.library.saveText(kit.work1.id, chapter.id, 'source', text, 0, segment(text, 'zh-Hans'))
    return chapter
  })
  let extractionCalls = 0
  const extraction = new ContextExtractionService(kit.library, kit.services.connections, {
    caller: () => async (messages: ExtractionMessage[]) => {
      extractionCalls++
      const user = messages[1]!.content
      const sweep = messages[0]!.content.startsWith('Bạn đọc truyện')
      const found = terms.filter((term) =>
        sweep ? user.includes(term.source) : user.includes(`source="${term.source}"`)
      )
      return {
        text: JSON.stringify({ terms: sweep ? found.map((term) => term.source) : found }),
        usage: null
      }
    }
  })
  const coordinator = new AgentWriteCoordinator(1_000)
  const operations = new AgentRepository(kit.library.appDb)
  const make = () => {
    const service = new AgentTaskService({
      library: kit.library,
      connections: kit.services.connections,
      tasks: new AgentTaskRepository(kit.library.appDb),
      operations,
      writeCoordinator: coordinator,
      extraction
    })
    service.connect({ publishIntent: () => [], changed: () => {} })
    return service
  }
  const tasks = make()
  const create = (contextStrategy: ContextStrategy, budget = {}) =>
    tasks.create({
      clientCommandId: command(),
      contextStrategy,
      workId: kit.work1.id,
      chapterIds: chapters.map((chapter) => chapter.id),
      modelSelection: kit.modelSelection,
      budget
    }).task
  const entries = () =>
    kit.library.withWork(kit.work1.id, (db) =>
      db.prepare('SELECT source, status FROM context_entry ORDER BY source').all()
    )
  const control = (service: AgentTaskService, taskId: string, verb: 'continue' | 'cancel') =>
    service.control({
      taskId,
      command: verb,
      stateVersion: service.get(taskId).task.stateVersion,
      clientCommandId: command()
    })
  return {
    ...kit,
    chapters,
    tasks,
    make,
    create,
    entries,
    control,
    extractionCalls: () => extractionCalls
  }
}

const HAN_LAP = { source: '韩立', type: 'person', target: 'Hàn Lập' }

describe('AgentTaskService: context before translating', () => {
  it('waits for review with every item queued, survives a restart, and Continue translates', async () => {
    const kit = contextKit([HAN_LAP])
    const task = kit.create('extract_then_review')
    await kit.tasks.idle()

    expect(kit.tasks.get(task.id).task).toMatchObject({
      state: 'waiting_user',
      reason: 'context_review'
    })
    expect(kit.tasks.get(task.id).items.map((item) => item.state)).toEqual(['queued', 'queued'])
    expect(kit.translations.requests).toEqual([])
    expect(kit.entries()).toEqual([{ source: '韩立', status: 'pending' }])
    expect(kit.tasks.get(task.id).task.usage).toBeNull()

    // Quit and reopen while waiting: nothing changes and nothing runs.
    kit.tasks.shutdown()
    const restarted = kit.make()
    kit.services.agent.reconcileOnStartup()
    restarted.reconcileOnStartup()
    await restarted.idle()
    expect(restarted.get(task.id).task).toMatchObject({
      state: 'waiting_user',
      reason: 'context_review'
    })
    expect(kit.entries()).toEqual([{ source: '韩立', status: 'pending' }])
    expect(kit.translations.requests).toEqual([])

    // Continue without reviewing: no new scan, the pending entry stays out of the prompt.
    const calls = kit.extractionCalls()
    kit.control(restarted, task.id, 'continue')
    await restarted.idle()
    expect(kit.extractionCalls()).toBe(calls)
    expect(restarted.get(task.id).task.state).toBe('completed')
    expect(kit.translations.requests.length).toBeGreaterThan(0)
    expect(kit.translations.prompts.some((prompt) => prompt.includes('Hàn Lập'))).toBe(false)
  })

  it('translates the first item without stopping when the scan finds nothing new', async () => {
    const kit = contextKit([])
    const task = kit.create('extract_then_review')
    await kit.tasks.idle()
    expect(kit.extractionCalls()).toBe(1) // both short chapters share one sweep chunk
    expect(kit.tasks.get(task.id).task.state).toBe('completed')
  })

  it('never extracts for a task that translates with the approved context only', async () => {
    const kit = contextKit([HAN_LAP])
    const task = kit.create('approved_only')
    await kit.tasks.idle()
    expect(kit.extractionCalls()).toBe(0)
    expect(kit.entries()).toEqual([])
    expect(kit.tasks.get(task.id).task.state).toBe('completed')
  })

  it('keeps the candidates when a waiting task is cancelled', async () => {
    const kit = contextKit([HAN_LAP])
    const task = kit.create('extract_then_review')
    await kit.tasks.idle()
    kit.control(kit.tasks, task.id, 'cancel')
    await kit.tasks.idle()
    expect(kit.tasks.get(task.id).task.state).toBe('cancelled')
    expect(kit.entries()).toEqual([{ source: '韩立', status: 'pending' }])
  })

  it('pauses for the call cap before the next extraction request, writing nothing', async () => {
    const kit = contextKit([HAN_LAP])
    const task = kit.create('extract_then_review', { maxCalls: 1 })
    await kit.tasks.idle()
    expect(kit.tasks.get(task.id).task).toMatchObject({ state: 'paused', reason: 'budget' })
    expect(kit.extractionCalls()).toBe(1)
    expect(kit.translations.requests).toEqual([])
    expect(kit.entries()).toEqual([])
  })
})
