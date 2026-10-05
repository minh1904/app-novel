import * as v from 'valibot'

export const workspaceLocationSchema = v.variant('name', [
  v.object({ name: v.literal('work') }),
  v.object({ name: v.literal('chapter'), chapterId: v.string() })
])

export const workspaceTabSchema = v.object({
  workId: v.string(),
  areaId: v.string(),
  location: workspaceLocationSchema
})

export const workspaceStateSchema = v.object({
  version: v.literal(1),
  tabs: v.array(workspaceTabSchema),
  activeWorkId: v.nullable(v.string())
})

export type WorkspaceLocation = v.InferOutput<typeof workspaceLocationSchema>
export type WorkspaceTab = v.InferOutput<typeof workspaceTabSchema>
export type WorkspaceState = v.InferOutput<typeof workspaceStateSchema>

export interface WorkspaceLoad {
  state: WorkspaceState
  notices: string[]
}

export const emptyWorkspace: WorkspaceState = { version: 1, tabs: [], activeWorkId: null }
