import type { AgentOperationState, AgentProgress } from '../../../shared/contracts/agent'
import {
  markAgentOperationTerminal,
  readAgentOperationEvidence,
  type AgentOperationTerminalState
} from '../../infra/storage/agentOperationJournal'
import { AgentRepository } from '../../infra/storage/agentRepository'
import type { Db } from '../../infra/storage/sqlite'
import type { WorkFiles } from '../../infra/storage/workFiles'

export interface ReconciledOperationSummary {
  operationId: string
  from: AgentOperationState
  to: AgentOperationState
  batchesCommitted: number
  appliedUnits: number
  totalUnits: number
  reason: string
}

export interface ReconcileStartupOperationsResult {
  reconciledOperations: ReconciledOperationSummary[]
  reconciledTurns: string[]
}

/**
 * Reconciles unsettled operations ('queued', 'running') on app startup against
 * work database journals (D7).
 *
 * Ground truth rules:
 * 1. A standalone 'prepared' checkpoint with 0 committed batches is NOT evidence of applied data.
 *    Operation becomes 'interrupted'.
 * 2. If batches are committed in `agent_operation_batch`:
 *    - If all units applied (appliedUnits >= totalUnits > 0): becomes 'completed'.
 *    - If partial units applied (0 < appliedUnits < totalUnits): becomes 'partially_completed' (with hasChanges: true).
 * 3. If work DB has already committed a terminal marker (`checkpoint.terminalState`):
 *    - Transitions operation to that terminal state with its terminal result.
 * 4. If target work DB cannot be opened:
 *    - Transitions operation to 'interrupted' while keeping target unchanged.
 * 5. Any active turn with all operations terminal is transitioned to 'completed' or 'interrupted'.
 */
export function reconcileStartupOperations(
  libraryDb: Db,
  workFiles: WorkFiles,
  now: number
): ReconcileStartupOperationsResult {
  const repo = new AgentRepository(libraryDb)
  const operations = repo.listUnsettledOperations()
  const reconciledOperations: ReconciledOperationSummary[] = []
  const touchedTurnIds = new Set<string>()

  for (const op of operations) {
    const target = op.target
    const workId = target?.kind === 'chapter' || target?.kind === 'work' ? target.workId : undefined

    if (!workId) {
      repo.transitionOperation(op.id, 'interrupted', {
        now,
        error: {
          code: 'interrupted',
          message: 'Operation bị gián đoạn do app khởi động lại (không có target tác phẩm hợp lệ).'
        }
      })
      reconciledOperations.push({
        operationId: op.id,
        from: op.state,
        to: 'interrupted',
        batchesCommitted: 0,
        appliedUnits: 0,
        totalUnits: 0,
        reason: 'missing_work_target'
      })
      touchedTurnIds.add(op.turnId)
      continue
    }

    let reconciledState: AgentOperationState = 'interrupted'
    let terminalResult: unknown = null
    let progress: AgentProgress | undefined
    let reason = 'no_batches_committed'
    let batchesCount = 0
    let appliedUnits = 0
    let totalUnits = 0
    let hasChanges = false

    try {
      workFiles.withWork(workId, (workDb) => {
        const evidence = readAgentOperationEvidence(workDb, op.id)
        if (!evidence) {
          reason = 'no_checkpoint_in_work_db'
          return
        }

        const { checkpoint, batches } = evidence
        batchesCount = batches.length
        appliedUnits = checkpoint.appliedUnits
        totalUnits = checkpoint.totalUnits
        hasChanges = batchesCount > 0

        if (checkpoint.terminalState) {
          // Terminal marker was committed in work DB, but library.db was not yet updated before crash
          reconciledState = checkpoint.terminalState
          terminalResult = checkpoint.terminalResult
          progress = {
            completed: appliedUnits,
            total: totalUnits,
            unit: 'segments'
          }
          reason = 'work_db_already_terminal'
        } else if (batchesCount > 0) {
          // One or more batches committed, but app crashed before terminal marker
          if (totalUnits > 0 && appliedUnits >= totalUnits) {
            reconciledState = 'completed'
            reason = 'all_batches_committed'
          } else {
            reconciledState = 'partially_completed'
            reason = 'partial_batches_committed'
          }
          terminalResult = {
            appliedUnits,
            totalUnits,
            lastAppliedRev: checkpoint.lastAppliedRev
          }
          progress = {
            completed: appliedUnits,
            total: totalUnits,
            unit: 'segments'
          }
          // Mark terminal in work DB so checkpoint reflects ground truth
          markAgentOperationTerminal(
            workDb,
            op.id,
            reconciledState as AgentOperationTerminalState,
            terminalResult,
            now
          )
        } else {
          // Standalone prepared checkpoint with 0 batches committed
          reconciledState = 'interrupted'
          reason = 'prepared_checkpoint_no_batches'
          markAgentOperationTerminal(
            workDb,
            op.id,
            'interrupted',
            { reason: 'crash_before_first_batch' },
            now
          )
        }
      })
    } catch (error) {
      // Work DB cannot be opened or is corrupted
      reconciledState = 'interrupted'
      reason = 'work_db_unavailable'
      terminalResult = { error: error instanceof Error ? error.message : String(error) }
    }

    repo.transitionOperation(op.id, reconciledState, {
      now,
      progress,
      result: terminalResult,
      error: reconciledState === 'interrupted' ? { code: 'interrupted', reason } : undefined,
      hasChanges
    })

    reconciledOperations.push({
      operationId: op.id,
      from: op.state,
      to: reconciledState,
      batchesCommitted: batchesCount,
      appliedUnits,
      totalUnits,
      reason
    })
    touchedTurnIds.add(op.turnId)
  }

  // Reconcile unsettled turns
  const reconciledTurns: string[] = []
  const unsettledTurns = repo.listUnsettledTurns()

  for (const turn of unsettledTurns) {
    const ops = repo.listOperations(turn.id)
    const anyOpRunningOrQueued = ops.some((o) => o.state === 'queued' || o.state === 'running')
    if (!anyOpRunningOrQueued) {
      const anyOpNotCompleted = ops.some((o) => o.state !== 'completed')
      const turnNextState = anyOpNotCompleted || ops.length === 0 ? 'interrupted' : 'completed'
      repo.transitionTurn(turn.id, turnNextState, now, {
        answer:
          turnNextState === 'interrupted'
            ? 'Phiên làm việc bị gián đoạn do ứng dụng đóng bất ngờ.'
            : undefined
      })
      reconciledTurns.push(turn.id)
    }
  }

  return { reconciledOperations, reconciledTurns }
}
