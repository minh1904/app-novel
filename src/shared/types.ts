export type IpcResult<T> = { success: true; data: T } | { success: false; error: string };

// Single source of truth cho IPC contracts.
// Thêm channel mới ở đây — type error sẽ propagate sang main handler và preload.
export type IpcChannelMap = {
  ping: { args: []; return: string };
  'window:minimize': { args: []; return: undefined };
  'window:maximize': { args: []; return: undefined };
  'window:close': { args: []; return: undefined };
  'window:is-maximized': { args: []; return: boolean };
};

// Main→renderer push events (send/on pattern, không có return value)
export type IpcEventMap = {
  // Ví dụ: 'update-status': { args: [status: string] };
};
