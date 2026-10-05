import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAllStores } from './resetStores'
import { useUiStore, type View } from './uiStore'
import type { LeaveGuardRegistry } from '../features/editor/leaveGuard'

describe('uiStore', () => {
  beforeEach(() => {
    resetAllStores()
  })

  it('initializes with default values', () => {
    const state = useUiStore.getState()
    expect(state.view).toEqual({ name: 'library', section: 'all' })
    expect(state.sidebarOpen).toBe(true)
    expect(state.beforeSettings).toBeNull()
  })

  it('navigates to next view directly when no leaveGuard is registered', async () => {
    const next: View = { name: 'work', workId: 'work-1' }
    const ok = await useUiStore.getState().navigate(next)

    expect(ok).toBe(true)
    expect(useUiStore.getState().view).toEqual(next)
  })

  it('blocks navigation when leaveGuard denies leaving', async () => {
    const mockRegistry: LeaveGuardRegistry = {
      register: vi.fn(),
      confirmLeave: vi.fn().mockResolvedValue(false)
    }

    useUiStore.getState().setLeaveGuardRegistry(mockRegistry)

    const next: View = { name: 'work', workId: 'work-1' }
    const ok = await useUiStore.getState().navigate(next)

    expect(ok).toBe(false)
    expect(useUiStore.getState().view).toEqual({ name: 'library', section: 'all' })
    expect(mockRegistry.confirmLeave).toHaveBeenCalledTimes(1)
  })

  it('allows navigation when leaveGuard confirms leaving', async () => {
    const mockRegistry: LeaveGuardRegistry = {
      register: vi.fn(),
      confirmLeave: vi.fn().mockResolvedValue(true)
    }

    useUiStore.getState().setLeaveGuardRegistry(mockRegistry)

    const next: View = { name: 'work', workId: 'work-1' }
    const ok = await useUiStore.getState().navigate(next)

    expect(ok).toBe(true)
    expect(useUiStore.getState().view).toEqual(next)
    expect(mockRegistry.confirmLeave).toHaveBeenCalledTimes(1)
  })

  it('saves previous view on openSettings and restores it on closeSettings', async () => {
    const workView: View = { name: 'work', workId: 'w-123' }
    await useUiStore.getState().navigate(workView)

    await useUiStore.getState().openSettings()
    expect(useUiStore.getState().view).toEqual({ name: 'settings' })
    expect(useUiStore.getState().beforeSettings).toEqual(workView)

    await useUiStore.getState().closeSettings()
    expect(useUiStore.getState().view).toEqual(workView)
    expect(useUiStore.getState().beforeSettings).toBeNull()
  })

  it('toggles sidebar and theme', () => {
    expect(useUiStore.getState().sidebarOpen).toBe(true)
    useUiStore.getState().toggleSidebar()
    expect(useUiStore.getState().sidebarOpen).toBe(false)
    useUiStore.getState().toggleSidebar()
    expect(useUiStore.getState().sidebarOpen).toBe(true)

    useUiStore.getState().setTheme('light')
    expect(useUiStore.getState().theme).toBe('light')
    useUiStore.getState().toggleTheme()
    expect(useUiStore.getState().theme).toBe('dark')
    useUiStore.getState().toggleTheme()
    expect(useUiStore.getState().theme).toBe('light')
  })
})
