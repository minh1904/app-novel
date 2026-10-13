import { describe, expect, it } from 'vitest'
import type { AgentStreamEvent } from '../../../shared/contracts/agent'
import { callTools, say, setupAgent } from './agentTestKit'

describe('Agent conversation end to end', () => {
  it('keeps one session from the home screen into a chapter, each turn with its own context', async () => {
    const { agent, model, modelSelection, work1, ch1_1 } = setupAgent()
    model.script(say('Chào bạn.'))
    const first = await agent.send({ instruction: 'xin chào', modelSelection })

    model.script(
      callTools({ name: 'read_chapter', args: { target: 'ctx', side: 'source' } }),
      say('Chương nói về đoạn một.')
    )
    const second = await agent.send({
      sessionId: first.sessionId,
      instruction: 'chương này nói gì?',
      context: { workId: work1.id, chapterId: ch1_1.id },
      modelSelection
    })
    expect(second.sessionId).toBe(first.sessionId)
    const detail = agent.getSessionDetail(first.sessionId)
    expect(detail.turns.map((t) => t.context)).toEqual([
      {},
      { workId: work1.id, chapterId: ch1_1.id }
    ])
    // The second turn's prompt still carries the first turn and names the chapter it was sent from.
    const prompt = model.requests[1].messages.map((m) => m.content).join('\n')
    expect(prompt).toContain('xin chào')
    expect(prompt).toContain('Đại Đạo Triều Thiên – Chương 1')
    expect(detail.activities.some((a) => a.turnId === second.turnId && a.kind === 'read')).toBe(
      true
    )
  })

  it('translates a chapter of a different work the user named', async () => {
    const { agent, model, modelSelection, library, work1, work2, ch2_1 } = setupAgent()
    model.script(
      callTools({ name: 'resolve_target', args: { description: 'Phàm Nhân Tu Tiên chương 1' } }),
      callTools({ name: 'translate_chapter', args: { target: 't1' } }),
      say('Đã dịch.')
    )
    const res = await agent.send({
      instruction: 'Dịch tác phẩm Phàm Nhân Tu Tiên chương 1',
      context: { workId: work1.id },
      modelSelection
    })
    expect(res.status).toBe('completed')
    const [operation] = agent.listOperations(res.turnId)
    expect(operation.target).toMatchObject({ workId: work2.id, chapterId: ch2_1.id })
    expect(library.readText(work2.id, ch2_1.id, 'target').content).toContain('Dịch:')
  })

  it('undoes an operation of the same session and refuses one of another session', async () => {
    const { agent, model, modelSelection, library, work1, ch1_1 } = setupAgent()
    const context = { workId: work1.id, chapterId: ch1_1.id }
    model.script(callTools({ name: 'translate_chapter', args: { target: 'ctx' } }), say('Đã dịch.'))
    const translated = await agent.send({ instruction: 'dịch chương này', context, modelSelection })
    const [operation] = agent.listOperations(translated.turnId)
    const translatedText = library.readText(work1.id, ch1_1.id, 'target').content
    expect(translatedText).toContain('Dịch:')

    model.script(
      callTools({ name: 'undo_operation', args: { operationId: operation.id } }),
      say('Không được.')
    )
    const other = await agent.send({ instruction: 'hoàn tác', modelSelection })
    expect(agent.listToolCalls(other.turnId)[0]).toMatchObject({
      decision: 'deny',
      state: 'failed'
    })
    expect(library.readText(work1.id, ch1_1.id, 'target').content).toBe(translatedText)

    const changed: string[] = []
    model.script(
      callTools({ name: 'undo_operation', args: { operationId: operation.id } }),
      say('Đã hoàn tác.')
    )
    const undone = await agent.send({
      sessionId: translated.sessionId,
      instruction: 'hoàn tác lần dịch vừa rồi',
      modelSelection,
      onTargetChanged: (event) => changed.push(event.operationId)
    })
    expect(undone.status).toBe('completed')
    expect(agent.getOperation(operation.id)?.state).toBe('undone')
    expect(library.readText(work1.id, ch1_1.id, 'target').content).toBe('')
    expect(changed).toEqual([operation.id])
  })

  it('cancels a turn while the model is answering', async () => {
    const { agent, model, modelSelection } = setupAgent()
    const events: AgentStreamEvent[] = []
    const onlyTurn = () => agent.listTurns(agent.listSessions()[0].id)[0].id
    model.script(() => {
      agent.cancelTurn(onlyTurn())
      return say('quá muộn')
    })
    await expect(
      agent.send({
        instruction: 'viết dài',
        modelSelection,
        onStream: (event) => events.push(event)
      })
    ).rejects.toThrow()
    const turnId = onlyTurn()
    expect(agent.getTurn(turnId)?.status).toBe('cancelled')
    expect(events.at(-1)?.kind).toBe('cancelled')
  })

  it('keeps usage unknown when the provider reports none', async () => {
    const { agent, model, modelSelection } = setupAgent()
    model.script(say('Không có usage.', null))
    const res = await agent.send({ instruction: 'hỏi', modelSelection })
    expect(res.status).toBe('completed')
    expect(res.usage).toBeNull()
  })
})
