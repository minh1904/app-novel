import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAllStores } from './resetStores'
import { useAiChatStore } from './aiChatStore'
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
      isDirty: vi.fn().mockReturnValue(true),
      confirmLeave: vi.fn().mockResolvedValue(false)
    }

    useUiStore.getState().setLeaveGuardRegistry(mockRegistry)
    await useUiStore.getState().navigate({ name: 'chapter', workId: 'work-1', chapterId: 'one' })
    const next: View = { name: 'chapter', workId: 'work-1', chapterId: 'two' }
    const ok = await useUiStore.getState().navigate(next)

    expect(ok).toBe(false)
    expect(useUiStore.getState().view).toEqual({
      name: 'chapter',
      workId: 'work-1',
      chapterId: 'one'
    })
    expect(mockRegistry.confirmLeave).toHaveBeenCalledWith({ workId: 'work-1' })
  })

  it('allows navigation when leaveGuard confirms leaving', async () => {
    const mockRegistry: LeaveGuardRegistry = {
      register: vi.fn(),
      isDirty: vi.fn().mockReturnValue(true),
      confirmLeave: vi.fn().mockResolvedValue(true)
    }

    useUiStore.getState().setLeaveGuardRegistry(mockRegistry)
    await useUiStore.getState().navigate({ name: 'chapter', workId: 'work-1', chapterId: 'one' })
    const next: View = { name: 'work', workId: 'work-1' }
    const ok = await useUiStore.getState().navigate(next)

    expect(ok).toBe(true)
    expect(useUiStore.getState().view).toEqual(next)
    expect(mockRegistry.confirmLeave).toHaveBeenCalledTimes(1)
  })

  it('keeps one tab per work and restores its chapter on activation', async () => {
    const store = useUiStore.getState()
    await store.navigate({ name: 'chapter', workId: 'one', chapterId: 'c1' })
    await store.navigate({ name: 'work', workId: 'two' })
    store.activateTab('one')
    expect(useUiStore.getState().view).toEqual({ name: 'chapter', workId: 'one', chapterId: 'c1' })
    expect(useUiStore.getState().tabs.map((tab) => tab.workId)).toEqual(['one', 'two'])
  })

  it('restores the selected work, chapter and area from a saved workspace', () => {
    useUiStore.getState().restoreWorkspace(
      {
        version: 1,
        tabs: [
          { workId: 'one', areaId: 'context', location: { name: 'work' } },
          { workId: 'two', areaId: 'chapters', location: { name: 'chapter', chapterId: 'c2' } }
        ],
        activeWorkId: 'two'
      },
      []
    )
    expect(useUiStore.getState().view).toEqual({ name: 'chapter', workId: 'two', chapterId: 'c2' })
    useUiStore.getState().activateTab('one')
    expect(useUiStore.getState().tabs[0].areaId).toBe('context')
    expect(useUiStore.getState().view).toEqual({ name: 'work', workId: 'one' })
  })

  it('returns to another open tab when closing the tab behind settings', async () => {
    await useUiStore.getState().navigate({ name: 'work', workId: 'one' })
    await useUiStore.getState().navigate({ name: 'work', workId: 'two' })
    await useUiStore.getState().openSettings()
    expect(await useUiStore.getState().closeTab('two')).toBe(true)
    await useUiStore.getState().closeSettings()
    expect(useUiStore.getState().view).toEqual({ name: 'work', workId: 'one' })
  })

  it('does not cancel a Main AI request when its work tab closes', async () => {
    const chat = useAiChatStore.getState()
    chat.selectWork('one')
    const turn = chat.beginTurn({ question: 'Dịch', mode: 'hoi', context: [], range: null })
    chat.attachRequestIdForWork('one', turn.localId, 'request-one')
    await useUiStore.getState().navigate({ name: 'work', workId: 'one' })
    await useUiStore.getState().navigate({ name: 'work', workId: 'two' })
    chat.selectWork('two')
    expect(await useUiStore.getState().closeTab('one')).toBe(true)
    chat.receiveChunk({ requestId: 'request-one', kind: 'delta', text: 'Kết quả A' })
    expect(useAiChatStore.getState().session.turns).toEqual([])
    chat.selectWork('one')
    expect(useAiChatStore.getState().session.turns[0].answer).toBe('Kết quả A')
  })

  it('switches tabs without a leave prompt and rejects closing a dirty tab when cancelled', async () => {
    const mockRegistry: LeaveGuardRegistry = {
      register: vi.fn(),
      isDirty: vi.fn().mockReturnValue(true),
      confirmLeave: vi.fn().mockResolvedValue(false)
    }
    useUiStore.getState().setLeaveGuardRegistry(mockRegistry)
    await useUiStore.getState().navigate({ name: 'chapter', workId: 'one', chapterId: 'c1' })
    await useUiStore.getState().navigate({ name: 'work', workId: 'two' })
    useUiStore.getState().activateTab('one')
    expect(mockRegistry.confirmLeave).not.toHaveBeenCalled()
    expect(await useUiStore.getState().closeTab('one')).toBe(false)
    expect(mockRegistry.confirmLeave).toHaveBeenCalledWith({ workId: 'one' })
    expect(useUiStore.getState().tabs).toHaveLength(2)
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
