import { randomUUID } from 'node:crypto'
import type {
  AgentContext,
  AgentOperation,
  AgentStreamEvent,
  AgentTurnState
} from '../../../shared/contracts/agent'
import type { ModelRef } from '../../../shared/contracts/aiPreferences'
import type { TokenUsage } from '../../../shared/contracts/usage'
import { StorageError } from '../../infra/storage/errors'
import { lookupModel } from '../../infra/providers/modelCatalog'
import type { AgentRepository, AgentSession, AgentTurn } from '../../infra/storage/agentRepository'
import type { LibraryStore } from '../library/library'
import type { ConnectionService } from '../ai/connectionService'
import type { WorkFiles } from '../../infra/storage/workFiles'
import type { CapabilityRegistry } from './registry'
import { TargetResolver } from './resolver'
import { reconcileStartupOperations } from './operationReconciler'
import { calculateTurnCost } from './agentUsage'
import { createWriteCapabilities } from './capabilities/writeCapabilities'

export interface AgentServiceOptions {
  library: LibraryStore
  connections: ConnectionService
  repository: AgentRepository
  registry: CapabilityRegistry
  resolver?: TargetResolver
  now?: () => number
}

export interface AgentSendInput {
  sessionId?: string
  turnId?: string
  commandId?: string
  instruction: string
  context?: AgentContext
  modelSelection?: { connectionId: string; entryId: string; settingsKey?: string }
  onStream?: (event: AgentStreamEvent) => void
  signal?: AbortSignal
}

export interface AgentSendResult {
  sessionId: string
  turnId: string
  status: AgentTurnState
  answer: string
  usage: TokenUsage | null
  costUsd: number | null
}

export class AgentService {
  private readonly library: LibraryStore
  private readonly connections: ConnectionService
  private readonly repository: AgentRepository
  private readonly registry: CapabilityRegistry
  private readonly resolver: TargetResolver
  private readonly now: () => number
  private readonly activeControllers = new Map<string, AbortController>()

  constructor(options: AgentServiceOptions) {
    this.library = options.library
    this.connections = options.connections
    this.repository = options.repository
    this.registry = options.registry
    this.resolver = options.resolver ?? new TargetResolver({ library: options.library })
    this.now = options.now ?? Date.now

    // Ensure write capabilities are registered
    const writeCaps = createWriteCapabilities({ connections: this.connections })
    if (!this.registry.get(writeCaps.translateChapterCapability.name)) {
      this.registry.register(writeCaps.translateChapterCapability)
    }
    if (!this.registry.get(writeCaps.editTranslationCapability.name)) {
      this.registry.register(writeCaps.editTranslationCapability)
    }
    if (!this.registry.get(writeCaps.undoOperationCapability.name)) {
      this.registry.register(writeCaps.undoOperationCapability)
    }
  }

  createSession(title?: string): AgentSession {
    const id = randomUUID()
    const now = this.now()
    return this.repository.createSession({
      id,
      title: title && title.trim().length > 0 ? title.trim() : 'Phiên mới',
      now
    })
  }

  getSession(id: string): AgentSession | null {
    return this.repository.getSession(id)
  }

  listSessions(): AgentSession[] {
    return this.repository.listSessions()
  }

  listTurns(sessionId: string): AgentTurn[] {
    return this.repository.listTurns(sessionId)
  }

  getTurn(id: string): AgentTurn | null {
    return this.repository.getTurn(id)
  }

  getOperation(id: string): AgentOperation | null {
    return this.repository.getOperation(id)
  }

  listOperations(turnId: string): AgentOperation[] {
    return this.repository.listOperations(turnId)
  }

  cancelTurn(turnId: string): void {
    const controller = this.activeControllers.get(turnId)
    if (controller) {
      controller.abort()
      this.activeControllers.delete(turnId)
    }
    const turn = this.repository.getTurn(turnId)
    if (turn && (turn.status === 'queued' || turn.status === 'running')) {
      this.repository.transitionTurn(turnId, 'cancelled', this.now())
    }
  }

  reconcileOnStartup(): { reconciledOperations: number; settledTurns: number } {
    let reconciledCount = 0
    let recTurnsCount = 0
    try {
      const rec = reconcileStartupOperations(
        this.library.appDb,
        (this.library as unknown as { files: WorkFiles }).files,
        this.now()
      )
      reconciledCount = rec.reconciledOperations.length
      recTurnsCount = rec.reconciledTurns.length
    } catch {
      // ignore
    }

    let settledTurns = recTurnsCount
    const unsettled = this.repository.listUnsettledTurns()
    const now = this.now()
    for (const turn of unsettled) {
      this.repository.transitionTurn(turn.id, 'interrupted', now, {
        answer: 'Phiên làm việc bị gián đoạn do ứng dụng đóng bất ngờ.'
      })
      settledTurns++
    }
    return { reconciledOperations: reconciledCount, settledTurns }
  }

  async send(input: AgentSendInput): Promise<AgentSendResult> {
    const now = this.now()
    const requestId = randomUUID()

    // 1. Session resolution
    let session = input.sessionId ? this.repository.getSession(input.sessionId) : null
    if (!session) {
      session = this.createSession(input.instruction.slice(0, 30))
    }

    const sessionId = session.id
    const turnId = input.turnId ?? randomUUID()
    let isClarifyResume = false

    // Check if continuing a waiting_user turn
    if (input.turnId) {
      const existing = this.repository.getTurn(input.turnId)
      if (existing && existing.status === 'waiting_user') {
        isClarifyResume = true
        this.repository.transitionTurn(input.turnId, 'running', now)
      }
    }

    if (!isClarifyResume) {
      try {
        this.repository.createTurn({
          id: turnId,
          sessionId,
          instruction: input.instruction,
          context: input.context ?? {},
          now
        })
        this.repository.transitionTurn(turnId, 'running', now)
      } catch (error) {
        if (error instanceof StorageError && error.code === 'conflict') {
          // Emit error event to stream if present
          input.onStream?.({
            requestId,
            turnId,
            eventSeq: 1,
            kind: 'error',
            error: { code: 'turn_in_progress', message: 'Đã có lượt đang chạy trong cùng phiên.' }
          })
          throw new StorageError('conflict', 'Đã có lượt đang chạy trong cùng phiên.')
        }
        throw error
      }
    }

    // Stream event emitter ensuring monotonic eventSeq and exactly one terminal event
    let eventSeq = 0
    let terminalEmitted = false

    const emit = (
      eventData:
        | { kind: 'reasoning-delta'; text: string }
        | { kind: 'answer-delta'; text: string }
        | { kind: 'activity-start'; activityId: string; stepSeq: number; activity: unknown }
        | { kind: 'activity-update'; activityId: string; stepSeq: number; activity: unknown }
        | { kind: 'activity-finish'; activityId: string; stepSeq: number; activity: unknown }
        | { kind: 'operation'; operation: unknown }
        | { kind: 'done'; turnState: 'completed' | 'waiting_user'; usage: unknown }
        | { kind: 'error'; error: unknown }
    ) => {
      if (terminalEmitted) return
      eventSeq++
      const fullEvent = {
        requestId,
        turnId,
        eventSeq,
        ...eventData
      } as AgentStreamEvent

      if (fullEvent.kind === 'done' || fullEvent.kind === 'error') {
        terminalEmitted = true
      }
      input.onStream?.(fullEvent)
    }

    // Abort controller
    const abortController = new AbortController()
    this.activeControllers.set(turnId, abortController)
    if (input.signal) {
      input.signal.addEventListener('abort', () => abortController.abort())
    }

    const existingActivities = this.repository.listActivities(turnId)
    let stepSeq =
      existingActivities.length > 0 ? Math.max(...existingActivities.map((a) => a.stepSeq)) : 0
    let finalAnswer = ''
    let collectedUsage: TokenUsage | null = null
    let turnStatus: AgentTurnState = 'completed'

    try {
      const instruction = input.instruction.trim()
      const context = input.context ?? {}

      // Intent classification (Task 5.2):
      // Question vs Write vs Ambiguous
      const isQuestion =
        /^(là ai|ai là|giải thích|tìm|danh sách|liệt kê|cho biết|hỏi|tóm tắt|\?|what|who|search|list)/i.test(
          instruction
        )
      const isTranslateCommand = !isQuestion && /(dịch|translate)/i.test(instruction)

      if (isTranslateCommand) {
        // Resolve target
        const resolveResult = this.resolver.resolve(instruction, context)
        stepSeq++
        const actId = randomUUID()
        const resolveAct = this.repository.putActivity({
          id: actId,
          turnId,
          operationId: null,
          stepSeq,
          kind: 'resolve',
          state: 'running',
          label: 'Xác định chương cần dịch',
          detail: null,
          now: this.now()
        })
        emit({
          kind: 'activity-start',
          activityId: actId,
          stepSeq,
          activity: resolveAct
        })

        if (resolveResult.status === 'ambiguous') {
          // Ambiguous scenario: do NOT create operation!
          const candidateNames = resolveResult.candidates
            .map((c) => (c.chapterLabel ? `${c.workLabel} - ${c.chapterLabel}` : c.workLabel))
            .join('", "')
          finalAnswer = `Có nhiều ứng viên phù hợp: "${candidateNames}". Bạn muốn thao tác với chương nào?`
          this.repository.putActivity({
            id: actId,
            turnId,
            operationId: null,
            stepSeq,
            kind: 'resolve',
            state: 'completed',
            label: 'Xác định chương cần dịch',
            detail: { candidates: resolveResult.candidates },
            now: this.now()
          })
          emit({
            kind: 'activity-finish',
            activityId: actId,
            stepSeq,
            activity: { ...resolveAct, state: 'completed' }
          })

          turnStatus = 'waiting_user'
          this.repository.transitionTurn(turnId, 'waiting_user', this.now(), {
            answer: finalAnswer
          })
          emit({
            kind: 'answer-delta',
            text: finalAnswer
          })
          emit({
            kind: 'done',
            turnState: 'waiting_user',
            usage: null
          })
          return {
            sessionId,
            turnId,
            status: 'waiting_user',
            answer: finalAnswer,
            usage: null,
            costUsd: null
          }
        }

        if (resolveResult.status === 'not_found' || !resolveResult.target) {
          finalAnswer = 'Không tìm thấy chương phù hợp để dịch. Vui lòng nêu rõ tên hoặc số chương.'
          this.repository.putActivity({
            id: actId,
            turnId,
            operationId: null,
            stepSeq,
            kind: 'resolve',
            state: 'failed',
            label: 'Xác định chương cần dịch',
            detail: null,
            now: this.now()
          })
          emit({
            kind: 'activity-finish',
            activityId: actId,
            stepSeq,
            activity: { ...resolveAct, state: 'failed' }
          })

          turnStatus = 'waiting_user'
          this.repository.transitionTurn(turnId, 'waiting_user', this.now(), {
            answer: finalAnswer
          })
          emit({ kind: 'answer-delta', text: finalAnswer })
          emit({ kind: 'done', turnState: 'waiting_user', usage: null })
          return {
            sessionId,
            turnId,
            status: 'waiting_user',
            answer: finalAnswer,
            usage: null,
            costUsd: null
          }
        }

        // Exact target resolved!
        const target = resolveResult.target
        this.repository.putActivity({
          id: actId,
          turnId,
          operationId: null,
          stepSeq,
          kind: 'resolve',
          state: 'completed',
          label: `Đích: "${target.kind === 'chapter' ? target.chapterLabel : target.workLabel}"`,
          detail: null,
          now: this.now()
        })
        emit({
          kind: 'activity-finish',
          activityId: actId,
          stepSeq,
          activity: { ...resolveAct, state: 'completed' }
        })

        // Create write operation in DB & emit snapshot
        const opId = randomUUID()
        const commandId = input.commandId ?? `cmd-${opId}`
        const modelRef: ModelRef | undefined = input.modelSelection
          ? {
              connectionId: input.modelSelection.connectionId,
              entryId: input.modelSelection.entryId
            }
          : undefined

        this.repository.createOperation({
          id: opId,
          turnId,
          commandId,
          capability: 'translate_chapter',
          target,
          model: modelRef,
          now: this.now()
        })
        this.repository.transitionOperation(opId, 'running', { now: this.now() })
        emit({ kind: 'operation', operation: this.repository.getOperation(opId) })

        // Create write activity
        stepSeq++
        const writeActId = randomUUID()
        const writeAct = this.repository.putActivity({
          id: writeActId,
          turnId,
          operationId: opId,
          stepSeq,
          kind: 'write',
          state: 'running',
          label: `Dịch chương "${target.kind === 'chapter' ? target.chapterLabel : ''}"`,
          detail: null,
          now: this.now()
        })
        emit({
          kind: 'activity-start',
          activityId: writeActId,
          stepSeq,
          activity: writeAct
        })

        // Execute write capability
        const capRes = await this.registry.execute(
          'translate_chapter',
          {
            connectionId: input.modelSelection?.connectionId,
            entryId: input.modelSelection?.entryId
          },
          {
            turnId,
            commandId,
            operationId: opId,
            target,
            library: this.library,
            now: this.now()
          }
        )

        const capVal = capRes.value as
          | {
              state: string
              appliedUnits: number
              totalUnits: number
              summary: string
              lastAppliedRev: number | null
            }
          | undefined

        finalAnswer = capVal?.summary ?? 'Đã hoàn tất thao tác.'
        if (capVal && 'usage' in capVal && capVal.usage) {
          collectedUsage = capVal.usage as TokenUsage
        }

        const finalOpState =
          capVal?.state === 'completed'
            ? 'completed'
            : capVal?.state === 'partially_completed'
              ? 'partially_completed'
              : capVal?.state === 'cancelled'
                ? 'cancelled'
                : 'conflict'

        this.repository.transitionOperation(opId, finalOpState, {
          now: this.now(),
          progress: {
            completed: capVal?.appliedUnits ?? 0,
            total: capVal?.totalUnits ?? 0,
            unit: 'segments'
          },
          result: capVal
        })
        emit({ kind: 'operation', operation: this.repository.getOperation(opId) })

        this.repository.putActivity({
          id: writeActId,
          turnId,
          operationId: opId,
          stepSeq,
          kind: 'write',
          state: finalOpState === 'conflict' ? 'failed' : 'completed',
          label: `Dịch chương "${target.kind === 'chapter' ? target.chapterLabel : ''}"`,
          detail: null,
          now: this.now()
        })
        emit({
          kind: 'activity-finish',
          activityId: writeActId,
          stepSeq,
          activity: { ...writeAct, state: 'completed' }
        })

        turnStatus = 'completed'
      } else {
        // Read / question scenario: no write operation created!
        stepSeq++
        const actId = randomUUID()
        const readAct = this.repository.putActivity({
          id: actId,
          turnId,
          operationId: null,
          stepSeq,
          kind: 'read',
          state: 'running',
          label: 'Đọc thông tin tra cứu',
          detail: null,
          now: this.now()
        })
        emit({
          kind: 'activity-start',
          activityId: actId,
          stepSeq,
          activity: readAct
        })

        // Execute read capabilities if targeting works/chapters
        if (/chương/i.test(instruction) && context.workId) {
          const listRes = await this.registry.execute(
            'list_chapters',
            {},
            {
              turnId,
              commandId: `cmd-read-${turnId}`,
              target: { kind: 'work', workId: context.workId, workLabel: 'Tác phẩm' },
              library: this.library,
              now: this.now()
            }
          )
          const chList = (listRes.value as Array<{ id: string; title: string }>) ?? []
          finalAnswer = `Tác phẩm có ${chList.length} chương: ${chList
            .map((c) => c.title)
            .slice(0, 5)
            .join(', ')}${chList.length > 5 ? '...' : ''}.`
        } else {
          const worksRes = await this.registry.execute(
            'list_works',
            {},
            {
              turnId,
              commandId: `cmd-read-${turnId}`,
              library: this.library,
              now: this.now()
            }
          )
          const wList = (worksRes.value as Array<{ id: string; title: string }>) ?? []
          finalAnswer = `Thư viện hiện có ${wList.length} tác phẩm.`
        }

        this.repository.putActivity({
          id: actId,
          turnId,
          operationId: null,
          stepSeq,
          kind: 'read',
          state: 'completed',
          label: 'Đọc thông tin tra cứu',
          detail: null,
          now: this.now()
        })
        emit({
          kind: 'activity-finish',
          activityId: actId,
          stepSeq,
          activity: { ...readAct, state: 'completed' }
        })

        turnStatus = 'completed'
      }

      // Calculate cost
      let costUsd: number | null = null
      if (collectedUsage && input.modelSelection) {
        const modelInfo = lookupModel(input.modelSelection.entryId)
        costUsd = calculateTurnCost(collectedUsage, modelInfo).costUsd
      }

      // Update turn in DB
      this.repository.transitionTurn(turnId, turnStatus, this.now(), {
        answer: finalAnswer,
        usage: collectedUsage,
        costUsd
      })

      emit({ kind: 'answer-delta', text: finalAnswer })
      emit({
        kind: 'done',
        turnState: 'completed',
        usage: collectedUsage
      })

      return {
        sessionId,
        turnId,
        status: turnStatus,
        answer: finalAnswer,
        usage: collectedUsage,
        costUsd
      }
    } catch (error) {
      if (!terminalEmitted) {
        try {
          this.repository.transitionTurn(turnId, 'failed', this.now())
        } catch {
          // ignore transition error if already terminal
        }
        emit({
          kind: 'error',
          error: error instanceof Error ? { message: error.message } : error
        })
      }
      throw error
    } finally {
      this.activeControllers.delete(turnId)
    }
  }
}
