export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
