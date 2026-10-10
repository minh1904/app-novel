import type { JSX } from 'react'
import { LeaveGuardContext, useLeaveGuardRegistry } from './modules/workspace/public'
import { AppContent } from './app/AppContent'

export function App(): JSX.Element {
  const { registry, dialog } = useLeaveGuardRegistry()

  return (
    <LeaveGuardContext.Provider value={registry}>
      <AppContent registry={registry} />
      {dialog}
    </LeaveGuardContext.Provider>
  )
}
