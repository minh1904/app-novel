export interface AppInfo {
  name: string
  version: string
  platform: NodeJS.Platform
}

export interface DesktopApi {
  getAppInfo(): Promise<AppInfo>
}
