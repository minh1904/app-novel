import type { AgentContext } from '../../../../../shared/contracts/agent'

export interface TargetRef {
  workId: string
  chapterId?: string
  side?: 'source' | 'target'
}

export interface TargetEditorHandler {
  isDirty: () => boolean
  flush: () => Promise<{ ok: boolean; error?: string; revision?: number }>
  revision?: () => number
  setReadOnly: (readOnly: boolean) => void
  reload: (rev?: number) => Promise<void>
}

export function targetKey(target: TargetRef): string {
  return `${target.workId}:${target.chapterId ?? '*'}:${target.side ?? '*'}`
}

export function isTargetMatch(a: TargetRef, b: TargetRef): boolean {
  if (a.workId !== b.workId) return false
  if (a.chapterId && b.chapterId && a.chapterId !== b.chapterId) return false
  if (a.side && b.side && a.side !== b.side) return false
  return true
}

/**
 * WorkspaceAgentAdapter coordinates write-intent, editor locking, and dirty-flushing
 * between AgentService and the workspace editor (D5, Task 6.2).
 */
export class WorkspaceAgentAdapter {
  private activeContextGetter: (() => AgentContext | null) | null = null
  private readonly registeredHandlers = new Map<string, TargetEditorHandler>()
  private readonly lockedTargets = new Set<string>()

  /** Register provider for current user focus context (workId, chapterId, range) */
  setActiveContextGetter(getter: () => AgentContext | null): void {
    this.activeContextGetter = getter
  }

  /** Captures current context snapshot; returns {} if outside workspace (HomeScreen, etc.) */
  captureContext(): AgentContext {
    return this.activeContextGetter?.() ?? {}
  }

  /** Registers editor handler for a specific (workId, chapterId, side) */
  registerEditor(target: TargetRef, handler: TargetEditorHandler): () => void {
    const key = targetKey(target)
    this.registeredHandlers.set(key, handler)

    // If target was already marked locked, apply readOnly immediately
    if (this.isLocked(target)) {
      handler.setReadOnly(true)
    }

    return () => {
      this.registeredHandlers.delete(key)
    }
  }

  /**
   * Flushes dirty edits for the target editor before write-intent ack.
   * If flush fails, returns { ok: false, error }.
   */
  async flushDirty(target: TargetRef): Promise<{ ok: boolean; error?: string; revision?: number }> {
    let revision: number | undefined
    for (const [key, handler] of this.registeredHandlers) {
      const [wId, cId, side] = key.split(':')
      const ref: TargetRef = {
        workId: wId!,
        chapterId: cId === '*' ? undefined : cId,
        side: side === '*' ? undefined : (side as 'source' | 'target')
      }
      if (isTargetMatch(ref, target)) {
        revision = handler.revision?.()
        if (handler.isDirty()) {
          const res = await handler.flush()
          if (!res.ok) return res
          revision = res.revision ?? handler.revision?.()
        }
      }
    }
    return { ok: true, ...(revision === undefined ? {} : { revision }) }
  }

  hasEditor(target: TargetRef): boolean {
    for (const key of this.registeredHandlers.keys()) {
      const [workId, chapterId, side] = key.split(':')
      if (
        isTargetMatch(
          {
            workId: workId!,
            chapterId: chapterId === '*' ? undefined : chapterId,
            side: side === '*' ? undefined : (side as 'source' | 'target')
          },
          target
        )
      ) {
        return true
      }
    }
    return false
  }

  /**
   * Locks or unlocks the specific target editor during an operation.
   * Only matching targets are locked; other editors remain unlocked.
   */
  setLocked(target: TargetRef, locked: boolean): void {
    const key = targetKey(target)
    if (locked) {
      this.lockedTargets.add(key)
    } else {
      this.lockedTargets.delete(key)
    }

    for (const [hKey, handler] of this.registeredHandlers) {
      const [wId, cId, side] = hKey.split(':')
      const ref: TargetRef = {
        workId: wId!,
        chapterId: cId === '*' ? undefined : cId,
        side: side === '*' ? undefined : (side as 'source' | 'target')
      }
      if (isTargetMatch(ref, target)) {
        handler.setReadOnly(locked)
      }
    }
  }

  isLocked(target: TargetRef): boolean {
    for (const lKey of this.lockedTargets) {
      const [wId, cId, side] = lKey.split(':')
      const ref: TargetRef = {
        workId: wId!,
        chapterId: cId === '*' ? undefined : cId,
        side: side === '*' ? undefined : (side as 'source' | 'target')
      }
      if (isTargetMatch(ref, target)) return true
    }
    return false
  }

  /** Reloads editor state once at terminal revision */
  async reloadTarget(target: TargetRef, rev?: number): Promise<void> {
    for (const [key, handler] of this.registeredHandlers) {
      const [wId, cId, side] = key.split(':')
      const ref: TargetRef = {
        workId: wId!,
        chapterId: cId === '*' ? undefined : cId,
        side: side === '*' ? undefined : (side as 'source' | 'target')
      }
      if (isTargetMatch(ref, target)) {
        await handler.reload(rev)
      }
    }
  }
}

export const defaultWorkspaceAgentAdapter = new WorkspaceAgentAdapter()
