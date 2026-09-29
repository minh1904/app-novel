import type { CreateWorkInput, WorkList, WorkPatch, WorkSummary } from './library'
import type { Result } from './result'

export interface AppInfo {
  name: string
  version: string
  platform: NodeJS.Platform
}

export interface WorksApi {
  list(): Promise<Result<WorkList>>
  get(id: string): Promise<Result<WorkSummary>>
  create(input: CreateWorkInput): Promise<Result<WorkSummary>>
  update(id: string, patch: WorkPatch): Promise<Result<WorkSummary>>
}

export interface DesktopApi {
  getAppInfo(): Promise<AppInfo>
  works: WorksApi
}
