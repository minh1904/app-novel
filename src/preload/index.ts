import { contextBridge, ipcRenderer } from 'electron';
import type { IpcChannelMap, IpcEventMap } from '../shared/types';

function typedInvoke<K extends keyof IpcChannelMap>(
  channel: K,
  ...args: IpcChannelMap[K]['args']
): Promise<IpcChannelMap[K]['return']> {
  return ipcRenderer.invoke(channel, ...args);
}

// Dùng khi cần subscribe event từ main process (main→renderer push)
export function typedOn<K extends keyof IpcEventMap>(
  channel: K,
  callback: (...args: IpcEventMap[K]['args']) => void,
): () => void {
  const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
    callback(...(args as IpcEventMap[K]['args']));
  };
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => typedInvoke('ping'),
});
