import { createContext, useContext, useEffect, useRef, useState, type JSX } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'

/**
 * Leaving a screen that holds unsaved typing. The screen registers what it can do (is it dirty,
 * save, drop its changes); anything that would take the screen away asks `confirmLeave` first and
 * only goes ahead when it answers true.
 */
export interface LeaveGuard {
  isDirty(): boolean
  /** Saves; true when the text is now safe, false when the save failed (the screen shows why). */
  save(): Promise<boolean>
  /** Throws the unsaved typing away and shows the stored text again. */
  discard(): Promise<void>
}

export interface LeaveGuardRegistry {
  register(guard: LeaveGuard | null, workId?: string): void
  isDirty(workId?: string): boolean
  /**
   * True when it is fine to go on. With unsaved typing it asks: save and go on, drop the changes,
   * or stay. `reloadOnDiscard` also reloads the screen's text when the answer is "drop", for
   * actions that keep the screen open.
   */
  confirmLeave(options?: { reloadOnDiscard?: boolean; workId?: string }): Promise<boolean>
}

export const LeaveGuardContext = createContext<LeaveGuardRegistry | null>(null)
export const LeaveGuardScopeContext = createContext<string | null>(null)

/** One registry for all mounted work editors; prompts can still target a single work. */
export function createLeaveGuardRegistry(
  request: (guard: LeaveGuard, reloadOnDiscard: boolean) => Promise<boolean>
): LeaveGuardRegistry {
  const guards = new Map<string, LeaveGuard>()
  return {
    register: (next, workId = '__legacy__') => {
      if (next) guards.set(workId, next)
      else guards.delete(workId)
    },
    isDirty: (workId) =>
      workId === undefined
        ? [...guards.values()].some((guard) => guard.isDirty())
        : (guards.get(workId)?.isDirty() ?? false),
    confirmLeave: (options) => {
      const current = options?.workId
        ? guards.get(options.workId)
        : (guards.get('__legacy__') ?? [...guards.values()][0])
      return current?.isDirty()
        ? request(current, options?.reloadOnDiscard ?? false)
        : Promise.resolve(true)
    }
  }
}

/** For the app shell: the registry and the dialog it asks with. */
export function useLeaveGuardRegistry(): { registry: LeaveGuardRegistry; dialog: JSX.Element } {
  const [pending, setPending] = useState<{
    resolve(answer: boolean): void
    reloadOnDiscard: boolean
    guard: LeaveGuard
  } | null>(null)
  const [saving, setSaving] = useState(false)
  // One question at a time; a request while one is open means "no".
  const [control] = useState(() => {
    let asking = false
    return {
      registry: createLeaveGuardRegistry((guard, reloadOnDiscard) => {
        if (asking) return Promise.resolve(false)
        asking = true
        return new Promise<boolean>((resolve) => {
          setPending({ resolve, reloadOnDiscard, guard })
        })
      }),
      reset: () => {
        asking = false
      }
    }
  })
  const registry = control.registry

  function answer(value: boolean): void {
    pending?.resolve(value)
    control.reset()
    setPending(null)
  }

  async function saveAndGo(): Promise<void> {
    setSaving(true)
    const ok = pending ? await pending.guard.save() : true
    setSaving(false)
    answer(ok)
  }

  async function drop(): Promise<void> {
    if (pending?.reloadOnDiscard) await pending.guard.discard()
    answer(true)
  }

  const dialog = (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open && !saving) answer(false)
      }}
      title="Có thay đổi chưa lưu"
      description="Bạn đã sửa văn bản của chương này nhưng chưa lưu. Bạn muốn làm gì?"
    >
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="light" disabled={saving} onClick={() => answer(false)}>
          Ở lại
        </Button>
        <Button color="danger" variant="solid" disabled={saving} onClick={() => void drop()}>
          Bỏ thay đổi
        </Button>
        <Button variant="solid" disabled={saving} onClick={() => void saveAndGo()}>
          {saving ? 'Đang lưu…' : 'Lưu rồi tiếp tục'}
        </Button>
      </div>
    </Dialog>
  )

  return { registry, dialog }
}

/**
 * For a screen with something to lose: registers it with the app. The app's one beforeunload
 * listener checks every registered guard, including hidden work tabs.
 */
export function useRegisterLeaveGuard(guard: LeaveGuard): void {
  const registry = useContext(LeaveGuardContext)
  const workId = useContext(LeaveGuardScopeContext) ?? '__legacy__'
  const latest = useRef(guard)
  useEffect(() => {
    latest.current = guard
  })

  useEffect(() => {
    registry?.register(
      {
        isDirty: () => latest.current.isDirty(),
        save: () => latest.current.save(),
        discard: () => latest.current.discard()
      },
      workId
    )
    return () => {
      registry?.register(null, workId)
    }
  }, [registry, workId])
}

export function useConfirmLeave(): LeaveGuardRegistry['confirmLeave'] {
  const registry = useContext(LeaveGuardContext)
  const workId = useContext(LeaveGuardScopeContext)
  return (options) =>
    registry?.confirmLeave({ ...options, workId: options?.workId ?? workId ?? undefined }) ??
    Promise.resolve(true)
}
