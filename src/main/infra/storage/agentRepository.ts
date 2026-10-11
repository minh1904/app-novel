import type {
  AgentActivity,
  AgentActivityState,
  AgentContext,
  AgentOperation,
  AgentOperationState,
  AgentProgress,
  AgentTurnState,
  ResolvedTarget
} from '../../../shared/contracts/agent'
import {
  canTransitionActivity,
  canTransitionOperation,
  canTransitionTurn
} from '../../../shared/contracts/agent'
import type { ModelRef } from '../../../shared/contracts/aiPreferences'
import type { TokenUsage } from '../../../shared/contracts/usage'
import { StorageError } from './errors'
import type { Db } from './sqlite'

export interface AgentSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface AgentLegacyRef {
  workId: string
  sessionId: string
  turnId: string
}

export interface AgentTurn {
  id: string
  sessionId: string
  instruction: string
  answer: string
  reasoning: string
  context: AgentContext
  status: AgentTurnState
  usage: TokenUsage | null
  costUsd: number | null
  legacyRef: AgentLegacyRef | null
  createdAt: number
  updatedAt: number
}

interface SessionRow {
  id: string
  title: string
  created_at: number
  updated_at: number
}

interface TurnRow {
  id: string
  session_id: string
  instruction: string
  answer: string
  reasoning: string
  context_json: string
  status: AgentTurnState
  usage_json: string | null
  cost_usd: number | null
  legacy_ref_json: string | null
  created_at: number
  updated_at: number
}

interface OperationRow {
  id: string
  turn_id: string
  command_id: string
  capability: string
  target_json: string
  state: AgentOperationState
  progress_json: string | null
  model_ref_json: string | null
  usage_json: string | null
  result_json: string | null
  error_json: string | null
  created_at: number
  updated_at: number
}

interface ActivityRow {
  id: string
  turn_id: string
  operation_id: string | null
  step_seq: number
  kind: AgentActivity['kind']
  state: AgentActivityState
  label: string
  detail_json: string | null
  created_at: number
  updated_at: number
}

const sessionFrom = (row: SessionRow): AgentSession => ({
  id: row.id,
  title: row.title,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

const turnFrom = (row: TurnRow): AgentTurn => ({
  id: row.id,
  sessionId: row.session_id,
  instruction: row.instruction,
  answer: row.answer,
  reasoning: row.reasoning,
  context: JSON.parse(row.context_json || '{}'),
  status: row.status,
  usage: row.usage_json ? JSON.parse(row.usage_json) : null,
  costUsd: row.cost_usd,
  legacyRef: row.legacy_ref_json ? JSON.parse(row.legacy_ref_json) : null,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

const operationFrom = (row: OperationRow): AgentOperation => ({
  id: row.id,
  turnId: row.turn_id,
  commandId: row.command_id,
  capability: row.capability,
  target: JSON.parse(row.target_json),
  state: row.state,
  progress: row.progress_json ? JSON.parse(row.progress_json) : null,
  model: row.model_ref_json ? JSON.parse(row.model_ref_json) : null,
  usage: row.usage_json ? JSON.parse(row.usage_json) : null,
  result: row.result_json ? JSON.parse(row.result_json) : null,
  error: row.error_json ? JSON.parse(row.error_json) : null,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

const activityFrom = (row: ActivityRow): AgentActivity => ({
  id: row.id,
  turnId: row.turn_id,
  operationId: row.operation_id,
  stepSeq: row.step_seq,
  kind: row.kind,
  state: row.state,
  label: row.label,
  detail: row.detail_json ? JSON.parse(row.detail_json) : null,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

export class AgentRepository {
  constructor(private readonly db: Db) {}

  createSession(input: { id: string; title?: string; now: number }): AgentSession {
    this.db
      .prepare('INSERT INTO agent_session (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)')
      .run(input.id, input.title ?? '', input.now, input.now)
    return this.getSession(input.id)!
  }

  getSession(id: string): AgentSession | null {
    const row = this.db
      .prepare('SELECT id, title, created_at, updated_at FROM agent_session WHERE id = ?')
      .get<SessionRow>(id)
    return row ? sessionFrom(row) : null
  }

  listSessions(): AgentSession[] {
    return this.db
      .prepare(
        'SELECT id, title, created_at, updated_at FROM agent_session ORDER BY updated_at DESC, id'
      )
      .all<SessionRow>()
      .map(sessionFrom)
  }

  createTurn(input: {
    id: string
    sessionId: string
    instruction: string
    context: AgentContext
    now: number
    legacyRef?: AgentLegacyRef
  }): AgentTurn {
    const active = this.db
      .prepare("SELECT id FROM agent_turn WHERE session_id = ? AND status IN ('queued', 'running')")
      .get<{ id: string }>(input.sessionId)
    if (active) {
      throw new StorageError('conflict', 'Đã có lượt đang chạy hoặc chờ trong cùng phiên.')
    }

    try {
      this.db
        .prepare(
          `INSERT INTO agent_turn
            (id, session_id, instruction, answer, reasoning, context_json, status, legacy_ref_json, created_at, updated_at)
           VALUES (?, ?, ?, '', '', ?, 'queued', ?, ?, ?)`
        )
        .run(
          input.id,
          input.sessionId,
          input.instruction,
          JSON.stringify(input.context ?? {}),
          input.legacyRef ? JSON.stringify(input.legacyRef) : null,
          input.now,
          input.now
        )
    } catch (error) {
      if (error instanceof Error && error.message.includes('agent_turn_one_active')) {
        throw new StorageError('conflict', 'Đã có lượt đang chạy hoặc chờ trong cùng phiên.')
      }
      throw error
    }

    this.db
      .prepare('UPDATE agent_session SET updated_at = ? WHERE id = ?')
      .run(input.now, input.sessionId)
    return this.getTurn(input.id)!
  }

  getTurn(id: string): AgentTurn | null {
    const row = this.db
      .prepare(
        `SELECT id, session_id, instruction, answer, reasoning, context_json, status,
                usage_json, cost_usd, legacy_ref_json, created_at, updated_at
         FROM agent_turn WHERE id = ?`
      )
      .get<TurnRow>(id)
    return row ? turnFrom(row) : null
  }

  listTurns(sessionId: string): AgentTurn[] {
    return this.db
      .prepare(
        `SELECT id, session_id, instruction, answer, reasoning, context_json, status,
                usage_json, cost_usd, legacy_ref_json, created_at, updated_at
         FROM agent_turn WHERE session_id = ? ORDER BY created_at ASC, id ASC`
      )
      .all<TurnRow>(sessionId)
      .map(turnFrom)
  }

  listUnsettledTurns(): AgentTurn[] {
    return this.db
      .prepare(
        `SELECT id, session_id, instruction, answer, reasoning, context_json, status,
                usage_json, cost_usd, legacy_ref_json, created_at, updated_at
         FROM agent_turn WHERE status IN ('queued', 'running') ORDER BY created_at ASC, id ASC`
      )
      .all<TurnRow>()
      .map(turnFrom)
  }

  transitionTurn(
    id: string,
    status: AgentTurnState,
    now: number,
    updates?: {
      answer?: string
      reasoning?: string
      usage?: TokenUsage | null
      costUsd?: number | null
    }
  ): AgentTurn {
    const current = this.getTurn(id)
    if (!current) throw new StorageError('not_found', 'Không tìm thấy lượt agent.')
    if (!canTransitionTurn(current.status, status)) {
      throw new StorageError(
        'conflict',
        `Không thể chuyển trạng thái lượt từ ${current.status} sang ${status}.`
      )
    }

    const answer = updates?.answer !== undefined ? updates.answer : current.answer
    const reasoning = updates?.reasoning !== undefined ? updates.reasoning : current.reasoning
    const usage = updates?.usage !== undefined ? updates.usage : current.usage
    const costUsd = updates?.costUsd !== undefined ? updates.costUsd : current.costUsd

    this.db
      .prepare(
        `UPDATE agent_turn
         SET status = ?, answer = ?, reasoning = ?, usage_json = ?, cost_usd = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(status, answer, reasoning, usage ? JSON.stringify(usage) : null, costUsd, now, id)

    this.db
      .prepare('UPDATE agent_session SET updated_at = ? WHERE id = ?')
      .run(now, current.sessionId)

    return this.getTurn(id)!
  }

  createOperation(input: {
    id: string
    turnId: string
    commandId: string
    capability: string
    target: ResolvedTarget
    now: number
    model?: ModelRef
  }): AgentOperation {
    const existing = this.db
      .prepare('SELECT id FROM agent_operation WHERE command_id = ?')
      .get<{ id: string }>(input.commandId)
    if (existing) {
      return this.getOperation(existing.id)!
    }

    this.db
      .prepare(
        `INSERT INTO agent_operation
          (id, turn_id, command_id, capability, target_json, state, model_ref_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'queued', ?, ?, ?)`
      )
      .run(
        input.id,
        input.turnId,
        input.commandId,
        input.capability,
        JSON.stringify(input.target),
        input.model ? JSON.stringify(input.model) : null,
        input.now,
        input.now
      )

    return this.getOperation(input.id)!
  }

  getOperation(id: string): AgentOperation | null {
    const row = this.db
      .prepare(
        `SELECT id, turn_id, command_id, capability, target_json, state, progress_json,
                model_ref_json, usage_json, result_json, error_json, created_at, updated_at
         FROM agent_operation WHERE id = ?`
      )
      .get<OperationRow>(id)
    return row ? operationFrom(row) : null
  }

  listOperations(turnId: string): AgentOperation[] {
    return this.db
      .prepare(
        `SELECT id, turn_id, command_id, capability, target_json, state, progress_json,
                model_ref_json, usage_json, result_json, error_json, created_at, updated_at
         FROM agent_operation WHERE turn_id = ? ORDER BY created_at ASC, id ASC`
      )
      .all<OperationRow>(turnId)
      .map(operationFrom)
  }

  listUnsettledOperations(): AgentOperation[] {
    return this.db
      .prepare(
        `SELECT id, turn_id, command_id, capability, target_json, state, progress_json,
                model_ref_json, usage_json, result_json, error_json, created_at, updated_at
         FROM agent_operation WHERE state IN ('queued', 'running') ORDER BY created_at ASC, id ASC`
      )
      .all<OperationRow>()
      .map(operationFrom)
  }

  transitionOperation(
    id: string,
    state: AgentOperationState,
    options: {
      now: number
      progress?: AgentProgress
      result?: unknown
      error?: unknown
      hasChanges?: boolean
    }
  ): AgentOperation {
    const current = this.getOperation(id)
    if (!current) throw new StorageError('not_found', 'Không tìm thấy operation.')
    if (!canTransitionOperation(current.state, state, options.hasChanges ?? false)) {
      throw new StorageError(
        'conflict',
        `Không thể chuyển trạng thái operation từ ${current.state} sang ${state}.`
      )
    }

    const progress = options.progress !== undefined ? options.progress : current.progress
    const result = options.result !== undefined ? options.result : current.result
    const error = options.error !== undefined ? options.error : current.error

    this.db
      .prepare(
        `UPDATE agent_operation
         SET state = ?, progress_json = ?, result_json = ?, error_json = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        state,
        progress ? JSON.stringify(progress) : null,
        result ? JSON.stringify(result) : null,
        error ? JSON.stringify(error) : null,
        options.now,
        id
      )

    return this.getOperation(id)!
  }

  putActivity(input: {
    id: string
    turnId: string
    operationId: string | null
    stepSeq: number
    kind: AgentActivity['kind']
    state: AgentActivityState
    label: string
    detail: unknown
    now: number
  }): AgentActivity {
    const existing = this.db
      .prepare(
        `SELECT id, turn_id, operation_id, step_seq, kind, state, label, detail_json, created_at, updated_at
         FROM agent_activity WHERE turn_id = ? AND step_seq = ?`
      )
      .get<ActivityRow>(input.turnId, input.stepSeq)

    if (existing) {
      if (existing.id !== input.id) {
        throw new StorageError(
          'conflict',
          `Bước ${input.stepSeq} đã có activity ${existing.id}, không thể ghi đè bằng ${input.id}.`
        )
      }
      if (!canTransitionActivity(existing.state, input.state) && existing.state !== input.state) {
        throw new StorageError(
          'conflict',
          `Không thể chuyển trạng thái activity từ ${existing.state} sang ${input.state}.`
        )
      }
      this.db
        .prepare(
          `UPDATE agent_activity
           SET operation_id = ?, kind = ?, state = ?, label = ?, detail_json = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(
          input.operationId,
          input.kind,
          input.state,
          input.label,
          input.detail ? JSON.stringify(input.detail) : null,
          input.now,
          input.id
        )
      return this.getActivity(input.id)!
    }

    this.db
      .prepare(
        `INSERT INTO agent_activity
          (id, turn_id, operation_id, step_seq, kind, state, label, detail_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.turnId,
        input.operationId,
        input.stepSeq,
        input.kind,
        input.state,
        input.label,
        input.detail ? JSON.stringify(input.detail) : null,
        input.now,
        input.now
      )

    return this.getActivity(input.id)!
  }

  getActivity(id: string): AgentActivity | null {
    const row = this.db
      .prepare(
        `SELECT id, turn_id, operation_id, step_seq, kind, state, label, detail_json, created_at, updated_at
         FROM agent_activity WHERE id = ?`
      )
      .get<ActivityRow>(id)
    return row ? activityFrom(row) : null
  }

  listActivities(turnId: string): AgentActivity[] {
    return this.db
      .prepare(
        `SELECT id, turn_id, operation_id, step_seq, kind, state, label, detail_json, created_at, updated_at
         FROM agent_activity WHERE turn_id = ? ORDER BY step_seq ASC, id ASC`
      )
      .all<ActivityRow>(turnId)
      .map(activityFrom)
  }

  recordLegacyImport(
    workId: string,
    legacySessionId: string,
    agentSessionId: string,
    now: number
  ): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO agent_legacy_import
          (work_id, legacy_session_id, agent_session_id, imported_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(workId, legacySessionId, agentSessionId, now)
  }

  recordLegacyTurnImport(
    workId: string,
    legacySessionId: string,
    legacyTurnId: string,
    agentTurnId: string,
    now: number
  ): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO agent_legacy_turn_import
          (work_id, legacy_session_id, legacy_turn_id, agent_turn_id, imported_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(workId, legacySessionId, legacyTurnId, agentTurnId, now)
  }

  findLegacyImport(workId: string, legacySessionId: string): string | null {
    const row = this.db
      .prepare(
        'SELECT agent_session_id FROM agent_legacy_import WHERE work_id = ? AND legacy_session_id = ?'
      )
      .get<{ agent_session_id: string }>(workId, legacySessionId)
    return row ? row.agent_session_id : null
  }

  findLegacyTurnImport(
    workId: string,
    legacySessionId: string,
    legacyTurnId: string
  ): string | null {
    const row = this.db
      .prepare(
        `SELECT agent_turn_id FROM agent_legacy_turn_import
         WHERE work_id = ? AND legacy_session_id = ? AND legacy_turn_id = ?`
      )
      .get<{ agent_turn_id: string }>(workId, legacySessionId, legacyTurnId)
    return row ? row.agent_turn_id : null
  }
}
