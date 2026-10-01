import { createContext, useContext, useEffect, useRef, useState, type JSX } from 'react'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'

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
  register(guard: LeaveGuard | null): void
  /**
   * True when it is fine to go on. With unsaved typing it asks: save and go on, drop the changes,
   * or stay. `reloadOnDiscard` also reloads the screen's text when the answer is "drop", for
   * actions that keep the screen open.
   */
  confirmLeave(options?: { reloadOnDiscard?: boolean }): Promise<boolean>
}

export const LeaveGuardContext = createContext<LeaveGuardRegistry | null>(null)

/** For the app shell: the registry and the dialog it asks with. */
export function useLeaveGuardRegistry(): { registry: LeaveGuardRegistry; dialog: JSX.Element } {
  const guard = useRef<LeaveGuard | null>(null)
  const [pending, setPending] = useState<{
    resolve(answer: boolean): void
    reloadOnDiscard: boolean
  } | null>(null)
  const [saving, setSaving] = useState(false)
  // One question at a time; a request while one is open means "no".
  const asking = useRef(false)
  const [registry] = useState<LeaveGuardRegistry>(() => ({
    register: (next) => {
      guard.current = next
    },
    confirmLeave: (options) => {
      const current = guard.current
      if (!current || !current.isDirty()) return Promise.resolve(true)
      if (asking.current) return Promise.resolve(false)
      asking.current = true
      return new Promise<boolean>((resolve) => {
        setPending({ resolve, reloadOnDiscard: options?.reloadOnDiscard ?? false })
      })
    }
  }))

  function answer(value: boolean): void {
    pending?.resolve(value)
    asking.current = false
    setPending(null)
  }

  async function saveAndGo(): Promise<void> {
    const current = guard.current
    setSaving(true)
    const ok = current ? await current.save() : true
    setSaving(false)
    answer(ok)
  }

  async function drop(): Promise<void> {
    if (pending?.reloadOnDiscard) await guard.current?.discard()
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
        <Button variant="secondary" disabled={saving} onClick={() => answer(false)}>
          Ở lại
        </Button>
        <Button variant="destructive" disabled={saving} onClick={() => void drop()}>
          Bỏ thay đổi
        </Button>
        <Button disabled={saving} onClick={() => void saveAndGo()}>
          {saving ? 'Đang lưu…' : 'Lưu rồi tiếp tục'}
        </Button>
      </div>
    </Dialog>
  )

  return { registry, dialog }
}

/**
 * For a screen with something to lose: registers it with the app, and asks the window to stop the
 * close while it is dirty (main answers with its own two-choice box).
 */
export function useRegisterLeaveGuard(guard: LeaveGuard): void {
  const registry = useContext(LeaveGuardContext)
  const latest = useRef(guard)
  useEffect(() => {
    latest.current = guard
  })

  useEffect(() => {
    registry?.register({
      isDirty: () => latest.current.isDirty(),
      save: () => latest.current.save(),
      discard: () => latest.current.discard()
    })
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (!latest.current.isDirty()) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      registry?.register(null)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [registry])
}

export function useConfirmLeave(): LeaveGuardRegistry['confirmLeave'] {
  const registry = useContext(LeaveGuardContext)
  return (options) => registry?.confirmLeave(options) ?? Promise.resolve(true)
}
