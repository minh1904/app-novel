import type * as v from 'valibot'
import type {
  AgentActivity,
  AgentContext,
  AgentProgress,
  AgentTurnState,
  ResolvedTarget
} from '../../../shared/contracts/agent'
import type { TokenUsage } from '../../../shared/contracts/usage'
import type { LibraryStore } from '../library/library'

export type CapabilityKind = 'read' | 'reversible-write' | 'destructive' | 'external'

export interface CapabilityBudget {
  maxCallsPerTurn?: number
  maxInputChars?: number
  maxOutputChars?: number
}

export interface CapabilityExecutionInput<TArgs = unknown> {
  turnId: string
  commandId: string
  operationId?: string
  target?: ResolvedTarget
  args: TArgs
  library: LibraryStore
  now: number
  signal?: AbortSignal
  onProgress?: (progress: AgentProgress) => void
}

export interface CapabilityExecutionResult<TResult = unknown> {
  ok: boolean
  value?: TResult
  error?: { code: string; message: string; details?: unknown }
  progress?: AgentProgress
  hasChanges?: boolean
}

export interface CapabilityDefinition<TArgs = any, TResult = any> {
  name: string
  description: string
  kind: CapabilityKind
  schema: v.GenericSchema<TArgs>
  budget?: CapabilityBudget
  targetPolicy: 'requires_target' | 'no_target' | 'target_optional'
  handler: (input: CapabilityExecutionInput<TArgs>) => Promise<CapabilityExecutionResult<TResult>>
  activityAdapter?: (
    input: CapabilityExecutionInput<TArgs>,
    result?: CapabilityExecutionResult<TResult>
  ) => { label: string; kind: AgentActivity['kind']; detail?: unknown }
}

export interface AgentRunner {
  runTurn(input: {
    sessionId: string
    turnId: string
    instruction: string
    context: AgentContext
  }): Promise<{ status: AgentTurnState; answer: string; usage?: TokenUsage | null }>
}
