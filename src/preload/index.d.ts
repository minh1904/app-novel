// Global ambient declarations — no `export` so this is a script file, not a module.
// TypeScript includes all .d.ts scripts automatically; no import needed.

interface ElectronAPI {
  ping: () => Promise<string>;
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
}

interface Window {
  electronAPI: ElectronAPI;
}
