import { createContext, useContext, useEffect, useRef, useState, type JSX } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'

/**
 * Quản lý rời khỏi màn hình khi có nội dung chưa lưu. Màn hình đăng ký trạng thái
 * (chưa lưu, lưu, hủy thay đổi); các thao tác điều hướng ra khỏi màn hình sẽ gọi `confirmLeave`
 * trước và chỉ tiếp tục khi người dùng xác nhận cho phép.
 */
export interface LeaveGuard {
  isDirty(): boolean
  /** Lưu nội dung; trả về true nếu đã lưu an toàn, false nếu thất bại (màn hình hiển thị lý do lỗi). */
  save(): Promise<boolean>
  /** Hủy các thay đổi chưa lưu và khôi phục lại văn bản đã lưu trước đó. */
  discard(): Promise<void>
}

export interface LeaveGuardRegistry {
  register(guard: LeaveGuard | null, workId?: string): void
  isDirty(workId?: string): boolean
  /**
   * Trả về true khi có thể tiếp tục điều hướng. Nếu có nội dung chưa lưu, hiển thị hộp thoại hỏi:
   * lưu và tiếp tục, hủy thay đổi, hoặc ở lại. `reloadOnDiscard` cũng tải lại nội dung màn hình
   * khi chọn "hủy thay đổi", dành cho các hành động vẫn giữ màn hình mở.
   */
  confirmLeave(options?: { reloadOnDiscard?: boolean; workId?: string }): Promise<boolean>
}

export const LeaveGuardContext = createContext<LeaveGuardRegistry | null>(null)
export const LeaveGuardScopeContext = createContext<string | null>(null)

/** Đăng ký chung cho tất cả các trình biên tập tác phẩm đang mở; cho phép hỏi theo từng tác phẩm cụ thể. */
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

/** Dành cho vỏ ứng dụng: trả về registry và hộp thoại xác nhận khi rời màn hình. */
export function useLeaveGuardRegistry(): { registry: LeaveGuardRegistry; dialog: JSX.Element } {
  const [pending, setPending] = useState<{
    resolve(answer: boolean): void
    reloadOnDiscard: boolean
    guard: LeaveGuard
  } | null>(null)
  const [saving, setSaving] = useState(false)
  // Mỗi thời điểm chỉ xử lý một yêu cầu hỏi; yêu cầu mới khi đang mở hộp thoại sẽ trả về false.
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
 * Đăng ký guard cho màn hình có dữ liệu chưa lưu vào hệ thống ứng dụng.
 * Sự kiện beforeunload của ứng dụng sẽ kiểm tra mọi guard đã đăng ký, bao gồm cả các tab tác phẩm đang ẩn.
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
