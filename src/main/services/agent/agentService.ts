import { createHash, randomUUID } from 'node:crypto'
import type {
  AgentContext,
  AgentOperation,
  AgentStreamEvent,
  AgentTargetChanged,
  AgentTurnState,
  AgentWriteIntent,
  AgentWriteIntentAck
} from '../../../shared/contracts/agent'
import type { ModelRef } from '../../../shared/contracts/aiPreferences'
import type { TokenUsage } from '../../../shared/contracts/usage'
import { StorageError } from '../../infra/storage/errors'
import { lookupModel } from '../../infra/providers/modelCatalog'
import type { AgentRepository, AgentSession, AgentTurn } from '../../infra/storage/agentRepository'
import type { LibraryStore } from '../library/library'
import type { ConnectionService } from '../ai/connectionService'
import type { CapabilityRegistry } from './registry'
import { TargetResolver } from './resolver'
import { calculateTurnCost } from './agentUsage'
import { createWriteCapabilities } from './capabilities/writeCapabilities'
import { AgentWriteCoordinator } from './writeCoordinator'

export interface AgentServiceOptions {
  library: LibraryStore
  connections: ConnectionService
  repository: AgentRepository
  registry: CapabilityRegistry
  resolver?: TargetResolver
  now?: () => number
  writeCoordinator?: AgentWriteCoordinator
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
  onWriteIntent?: (intent: AgentWriteIntent) => void
  onTargetChanged?: (event: AgentTargetChanged) => void
}

export interface AgentAcceptedTurn {
  requestId: string
  sessionId: string
  turnId: string
  created: boolean
}

export interface AgentSendResult {
  sessionId: string
  turnId: string
  status: AgentTurnState
  answer: string
  usage: TokenUsage | null
  costUsd: number | null
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']'
  if (value !== null && typeof value === 'object') {
    return (
      '{' +
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => JSON.stringify(key) + ':' + canonicalJson(item))
        .join(',') +
      '}'
    )
  }
  return JSON.stringify(value)
}

function digestPayload(value: unknown): string {
  return 'sha256:' + createHash('sha256').update(canonicalJson(value)).digest('hex')
}

export class AgentService {
  private readonly library: LibraryStore
  private readonly connections: ConnectionService
  private readonly repository: AgentRepository
  private readonly registry: CapabilityRegistry
  private readonly resolver: TargetResolver
  private readonly now: () => number
  private readonly writeCoordinator: AgentWriteCoordinator
  private readonly activeControllers = new Map<string, AbortController>()
  private shuttingDown = false

  constructor(options: AgentServiceOptions) {
    this.library = options.library
    this.connections = options.connections
    this.repository = options.repository
    this.registry = options.registry
    this.resolver = options.resolver ?? new TargetResolver({ library: options.library })
    this.now = options.now ?? Date.now
    this.writeCoordinator = options.writeCoordinator ?? new AgentWriteCoordinator()

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

  cancelTurn(turnId: string): AgentTurnState {
    const controller = this.activeControllers.get(turnId)
    if (controller) {
      controller.abort()
    }
    const turn = this.repository.getTurn(turnId)
    if (!turn) throw new StorageError('not_found', 'Không tìm thấy lượt agent.')
    if (turn && (turn.status === 'queued' || turn.status === 'running')) {
      return this.repository.transitionTurn(turnId, 'cancelled', this.now()).status
    }
    return turn.status
  }

  acknowledgeWriteIntent(ack: AgentWriteIntentAck): void {
    this.writeCoordinator.acknowledge(ack)
  }

  undoOperation(operationId: string): { targetRev: number; target: AgentOperation['target'] } {
    const operation = this.repository.getOperation(operationId)
    if (!operation) throw new StorageError('not_found', 'Không tìm thấy operation.')
    if (operation.target.kind !== 'chapter') {
      throw new StorageError('validation', 'Operation không trỏ tới một chương có thể hoàn tác.')
    }
    const undone = this.library.undoAgentOperation(operation.target.workId, operationId)
    const previousResult =
      operation.result !== null && typeof operation.result === 'object'
        ? operation.result
        : { previousResult: operation.result }
    this.repository.transitionOperation(operationId, 'undone', {
      now: this.now(),
      hasChanges: true,
      result: { ...previousResult, restoredRev: undone.restoredRev }
    })
    return { targetRev: undone.restoredRev, target: operation.target }
  }

  shutdown(): void {
    this.shuttingDown = true
    this.writeCoordinator.close()
    const now = this.now()
    for (const [turnId, controller] of this.activeControllers) {
      controller.abort()
      const turn = this.repository.getTurn(turnId)
      if (turn?.status === 'running') {
        this.repository.transitionTurn(turnId, 'interrupted', now, {
          answer: 'Phiên làm việc bị gián đoạn do ứng dụng đóng.'
        })
      }
    }
    this.activeControllers.clear()
  }

  reconcileOnStartup(): { reconciledOperations: number; settledTurns: number } {
    const rec = this.library.reconcileOperations()
    const reconciledCount = rec.reconciledOperations.length
    const recTurnsCount = rec.reconciledTurns.length

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

  acceptTurn(input: {
    sessionId?: string
    clientCommandId: string
    instruction: string
    context?: AgentContext
    modelSelection?: AgentSendInput['modelSelection']
  }): AgentAcceptedTurn {
    if (this.shuttingDown) throw new StorageError('cancelled', 'Runtime agent đang đóng.')
    let session = input.sessionId ? this.repository.getSession(input.sessionId) : null
    if (input.sessionId && !session)
      throw new StorageError('not_found', 'Không tìm thấy phiên agent.')
    if (!session) session = this.createSession(input.instruction.slice(0, 30))
    const accepted = this.repository.acceptTurn({
      id: randomUUID(),
      sessionId: session.id,
      clientCommandId: input.clientCommandId,
      payloadDigest: digestPayload({
        sessionId: session.id,
        instruction: input.instruction.trim(),
        context: input.context ?? {},
        modelSelection: input.modelSelection
      }),
      instruction: input.instruction.trim(),
      context: input.context ?? {},
      now: this.now()
    })
    return {
      requestId: input.clientCommandId,
      sessionId: accepted.turn.sessionId,
      turnId: accepted.turn.id,
      created: accepted.created
    }
  }

  async send(input: AgentSendInput): Promise<AgentSendResult> {
    const accepted = input.turnId
      ? {
          requestId: input.commandId ?? randomUUID(),
          turnId: input.turnId,
          sessionId: this.repository.getTurn(input.turnId)?.sessionId ?? '',
          created: false
        }
      : this.acceptTurn({
          sessionId: input.sessionId,
          clientCommandId: input.commandId ?? randomUUID(),
          instruction: input.instruction,
          context: input.context,
          modelSelection: input.modelSelection
        })
    return this.runExistingTurn({ ...input, ...accepted })
  }

  async runExistingTurn(
    input: AgentSendInput & { requestId: string; turnId: string; sessionId: string }
  ): Promise<AgentSendResult> {
    const { requestId, turnId, sessionId } = input
    const existing = this.repository.getTurn(turnId)
    if (!existing) throw new StorageError('not_found', 'Không tìm thấy lượt agent.')
    if (existing.status === 'queued') {
      this.repository.transitionTurn(turnId, 'running', this.now())
    } else if (existing.status === 'waiting_user') {
      this.repository.transitionTurn(turnId, 'running', this.now())
    } else if (existing.status !== 'running') {
      return {
        sessionId,
        turnId,
        status: existing.status,
        answer: existing.answer,
        usage: existing.usage,
        costUsd: existing.costUsd
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
        | { kind: 'cancelled'; usage: unknown }
    ) => {
      if (terminalEmitted) return
      eventSeq++
      const fullEvent = {
        requestId,
        turnId,
        eventSeq,
        ...eventData
      } as AgentStreamEvent

      if (
        fullEvent.kind === 'done' ||
        fullEvent.kind === 'error' ||
        fullEvent.kind === 'cancelled'
      ) {
        terminalEmitted = true
      }
      input.onStream?.(fullEvent)
    }

    // Abort controller
    const abortController = new AbortController()
    this.activeControllers.set(turnId, abortController)
    if (this.shuttingDown) abortController.abort()
    if (input.signal) {
      input.signal.addEventListener('abort', () => abortController.abort())
    }

    const existingActivities = this.repository.listActivities(turnId)
    let stepSeq =
      existingActivities.length > 0 ? Math.max(...existingActivities.map((a) => a.stepSeq)) : 0
    let finalAnswer = ''
    let collectedUsage: TokenUsage | null = null
    let turnStatus: AgentTurnState = 'completed'
    let activeOperationId: string | null = null
    let activeTarget: AgentTargetChanged['target'] | null = null
    let selectedModelEntryId: string | null = null

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
        if (target.kind !== 'chapter') {
          throw new StorageError('validation', 'Lệnh dịch cần target là một chương.')
        }
        this.repository.putActivity({
          id: actId,
          turnId,
          operationId: null,
          stepSeq,
          kind: 'resolve',
          state: 'completed',
          label: `Đích: "${target.chapterLabel}"`,
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
        activeOperationId = opId
        const commandId = input.commandId ?? `cmd-${opId}`
        const selected: AgentSendInput['modelSelection'] =
          input.modelSelection ??
          (() => {
            const connection = this.connections
              .list()
              .connections.find((item) => item.enabled && item.models.length > 0)
            const entry =
              connection?.models.find((item) => item.id === connection.defaultEntryId) ??
              connection?.models[0]
            return connection && entry
              ? { connectionId: connection.id, entryId: entry.id }
              : undefined
          })()
        if (!selected) {
          throw new StorageError('validation', 'Chưa có cấu hình kết nối AI nào khả dụng.')
        }
        const translator = this.connections.translator(selected.connectionId, selected.entryId)
        if (selected.settingsKey && selected.settingsKey !== translator.settingsKey) {
          throw new StorageError('conflict', 'Cấu hình model đã đổi. Vui lòng gửi lại lệnh.')
        }
        const modelRef: ModelRef & { settingsKey: string } = {
          connectionId: selected.connectionId,
          entryId: selected.entryId,
          settingsKey: translator.settingsKey
        }
        selectedModelEntryId = modelRef.entryId
        activeTarget = {
          workId: target.workId,
          chapterId: target.chapterId,
          side: 'target'
        }

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
        await this.writeCoordinator.request(opId, target, input.onWriteIntent)
        if (abortController.signal.aborted) {
          this.repository.transitionOperation(opId, 'cancelled', { now: this.now() })
          throw new StorageError('cancelled', 'Lượt agent đã được hủy.')
        }

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
          label: `Dịch chương "${target.chapterLabel}"`,
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
            connectionId: modelRef.connectionId,
            entryId: modelRef.entryId,
            settingsKey: modelRef.settingsKey
          },
          {
            turnId,
            commandId,
            operationId: opId,
            target,
            library: this.library,
            now: this.now(),
            signal: abortController.signal,
            onProgress: (progress) => {
              const operation = this.repository.transitionOperation(opId, 'running', {
                now: this.now(),
                progress
              })
              emit({ kind: 'operation', operation })
            }
          }
        )

        const capVal = capRes.value as
          | {
              state: string
              appliedUnits: number
              totalUnits: number
              summary: string
              lastAppliedRev: number | null
              usage?: TokenUsage | null
            }
          | undefined

        finalAnswer = capVal?.summary ?? capRes.error?.message ?? 'Không thể hoàn tất thao tác.'
        if (capVal && 'usage' in capVal && capVal.usage) {
          collectedUsage = capVal.usage as TokenUsage
        }

        const finalOpState: AgentOperation['state'] =
          capVal?.state === 'completed'
            ? 'completed'
            : capVal?.state === 'partially_completed'
              ? 'partially_completed'
              : capVal?.state === 'cancelled'
                ? 'cancelled'
                : capVal?.state === 'conflict' || capRes.error?.code === 'conflict'
                  ? 'conflict'
                  : capRes.error?.code === 'cancelled'
                    ? 'cancelled'
                    : 'failed'

        this.repository.transitionOperation(opId, finalOpState, {
          now: this.now(),
          progress: {
            completed: capVal?.appliedUnits ?? 0,
            total: capVal?.totalUnits ?? 0,
            unit: 'segments'
          },
          result: capVal,
          error: capRes.ok ? undefined : capRes.error,
          usage: collectedUsage
        })
        emit({ kind: 'operation', operation: this.repository.getOperation(opId) })

        this.repository.putActivity({
          id: writeActId,
          turnId,
          operationId: opId,
          stepSeq,
          kind: 'write',
          state:
            finalOpState === 'conflict' || finalOpState === 'failed'
              ? 'failed'
              : finalOpState === 'cancelled'
                ? 'cancelled'
                : 'completed',
          label: `Dịch chương "${target.chapterLabel}"`,
          detail: null,
          now: this.now()
        })
        emit({
          kind: 'activity-finish',
          activityId: writeActId,
          stepSeq,
          activity: {
            ...writeAct,
            state:
              finalOpState === 'conflict' || finalOpState === 'failed'
                ? 'failed'
                : finalOpState === 'cancelled'
                  ? 'cancelled'
                  : 'completed'
          }
        })

        if (!capRes.ok && finalOpState !== 'cancelled') {
          throw new StorageError(
            finalOpState === 'conflict' ? 'conflict' : 'io',
            capRes.error?.message ?? 'Capability thất bại.'
          )
        }
        turnStatus = finalOpState === 'cancelled' ? 'cancelled' : 'completed'
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
          if (!listRes.ok) {
            throw new StorageError('io', listRes.error?.message ?? 'Không thể đọc danh mục chương.')
          }
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
          if (!worksRes.ok) {
            throw new StorageError('io', worksRes.error?.message ?? 'Không thể đọc thư viện.')
          }
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
      if (collectedUsage && selectedModelEntryId) {
        const modelInfo = lookupModel(selectedModelEntryId)
        costUsd = calculateTurnCost(collectedUsage, modelInfo).costUsd
      }

      const currentTurn = this.repository.getTurn(turnId)
      if (turnStatus === 'cancelled') {
        if (currentTurn?.status === 'running') {
          this.repository.transitionTurn(turnId, 'cancelled', this.now(), {
            answer: finalAnswer,
            usage: collectedUsage,
            costUsd
          })
        }
        emit({ kind: 'cancelled', usage: collectedUsage })
      } else {
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
      }

      return {
        sessionId,
        turnId,
        status: turnStatus,
        answer: finalAnswer,
        usage: collectedUsage,
        costUsd
      }
    } catch (error) {
      const cancelled =
        (error instanceof StorageError && error.code === 'cancelled') ||
        abortController.signal.aborted
      if (activeOperationId) {
        const operation = this.repository.getOperation(activeOperationId)
        if (operation?.state === 'queued' || operation?.state === 'running') {
          this.repository.transitionOperation(
            activeOperationId,
            cancelled ? 'cancelled' : 'failed',
            {
              now: this.now(),
              error: cancelled
                ? { code: 'cancelled', message: 'Lượt agent đã được hủy.' }
                : {
                    code: error instanceof StorageError ? error.code : 'internal',
                    message: error instanceof Error ? error.message : String(error)
                  }
            }
          )
        }
      }
      for (const activity of this.repository.listActivities(turnId)) {
        if (activity.state !== 'running') continue
        this.repository.putActivity({
          id: activity.id,
          turnId,
          operationId: activity.operationId,
          stepSeq: activity.stepSeq,
          kind: activity.kind,
          state: cancelled ? 'cancelled' : 'failed',
          label: activity.label,
          detail: activity.detail,
          now: this.now()
        })
      }
      const currentTurn = this.repository.getTurn(turnId)
      if (!this.shuttingDown && currentTurn?.status === 'running') {
        this.repository.transitionTurn(turnId, cancelled ? 'cancelled' : 'failed', this.now())
      }
      const persistedTurn = this.repository.getTurn(turnId)
      if (
        !this.shuttingDown &&
        !terminalEmitted &&
        (persistedTurn?.status === 'cancelled' || persistedTurn?.status === 'failed')
      ) {
        emit(
          persistedTurn.status === 'cancelled'
            ? { kind: 'cancelled', usage: collectedUsage }
            : {
                kind: 'error',
                error: {
                  code: error instanceof StorageError ? error.code : 'internal',
                  message: error instanceof Error ? error.message : String(error)
                }
              }
        )
      }
      throw error
    } finally {
      if (activeOperationId && activeTarget && input.onTargetChanged) {
        try {
          const lastAppliedRev = this.library.readText(
            activeTarget.workId,
            activeTarget.chapterId,
            activeTarget.side
          ).rev
          input.onTargetChanged({
            target: activeTarget,
            lastAppliedRev,
            operationId: activeOperationId
          })
        } catch {
          // Target reload is best effort after the durable operation state has been written.
        }
      }
      this.activeControllers.delete(turnId)
    }
  }
}
