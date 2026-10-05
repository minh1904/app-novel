import { CHANNELS } from '../../../shared/contracts/channels'
import { workspaceStateSchema } from '../../../shared/contracts/workspace'
import { WorkspaceService } from '../../services/workspace/workspaceService'
import { createHandler } from '../handler'
import type { AreaHandlers, HandlerDeps } from './deps'

export function workspaceHandlers({ library }: HandlerDeps): AreaHandlers<'workspace'> {
  const service = new WorkspaceService(library)
  return {
    [CHANNELS.workspaceLoad]: createHandler(null, () => service.load()),
    [CHANNELS.workspaceSave]: createHandler(workspaceStateSchema, (state) => service.save(state))
  }
}
