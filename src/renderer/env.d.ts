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
