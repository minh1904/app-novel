import { useEffect } from 'react'
import type { LeaveGuardRegistry } from '../chapter-editor/leaveGuard'
import { useAiChatStore } from '../store/aiChatStore'
import { useWorkspaceStore } from '../store/workspaceStore'

export function useWorkspaceLifecycle(registry: LeaveGuardRegistry): void {
  useEffect(() => {
    useWorkspaceStore.getState().setLeaveGuardRegistry(registry)
  }, [registry])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (!registry.isDirty()) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [registry])

  useEffect(() => useAiChatStore.getState().startListening(), [])
}

export function useWorkspaceRestore(libraryLoad: 'loading' | 'ready' | 'failed'): void {
  const workspaceReady = useWorkspaceStore((state) => state.workspaceReady)

  useEffect(() => {
    if (libraryLoad !== 'ready' || workspaceReady) return
    let current = true
    if (!window.mira?.workspace) {
      useWorkspaceStore
        .getState()
        .restoreWorkspace({ version: 1, tabs: [], activeWorkId: null }, [])
      return
    }
    void window.mira.workspace
      .load()
      .then((result) => {
        if (!current) return
        if (result.ok)
          useWorkspaceStore.getState().restoreWorkspace(result.value.state, result.value.notices)
        else
          useWorkspaceStore
            .getState()
            .restoreWorkspace({ version: 1, tabs: [], activeWorkId: null }, [
              'Không khôi phục được phiên tab: ' + result.error.message
            ])
      })
      .catch(() => {
        if (current)
          useWorkspaceStore
            .getState()
            .restoreWorkspace({ version: 1, tabs: [], activeWorkId: null }, [
              'Không khôi phục được phiên tab.'
            ])
      })
    return () => {
      current = false
    }
  }, [libraryLoad, workspaceReady])
}
