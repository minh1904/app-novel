import { describe, expect, it, vi } from 'vitest'
import { createLeaveGuardRegistry, type LeaveGuard } from './leaveGuard'

function guard(dirty: boolean, save = vi.fn().mockResolvedValue(true)): LeaveGuard {
  return { isDirty: () => dirty, save, discard: vi.fn().mockResolvedValue(undefined) }
}

describe('leave guard registry', () => {
  it('checks every mounted work when the window closes, including hidden tabs', () => {
    const registry = createLeaveGuardRegistry(async () => true)
    registry.register(guard(true), 'one')
    registry.register(guard(true), 'two')
    expect(registry.isDirty()).toBe(true)
    registry.register(null, 'one')
    expect(registry.isDirty()).toBe(true)
    registry.register(null, 'two')
    expect(registry.isDirty()).toBe(false)
  })

  it('cancels only the requested tab when the person stays', async () => {
    const request = vi.fn().mockResolvedValue(false)
    const registry = createLeaveGuardRegistry(request)
    const one = guard(true)
    const two = guard(true)
    registry.register(one, 'one')
    registry.register(two, 'two')
    expect(await registry.confirmLeave({ workId: 'one' })).toBe(false)
    expect(request).toHaveBeenCalledWith(one, false)
    expect(registry.isDirty('two')).toBe(true)
  })

  it('keeps a tab dirty when its save fails', async () => {
    const save = vi.fn().mockResolvedValue(false)
    const registry = createLeaveGuardRegistry((current) => current.save())
    registry.register(guard(true, save), 'one')
    expect(await registry.confirmLeave({ workId: 'one' })).toBe(false)
    expect(registry.isDirty('one')).toBe(true)
  })
})
