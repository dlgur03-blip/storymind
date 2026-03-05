const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  readTextFiles: (folderPath) => ipcRenderer.invoke('read-text-files', folderPath),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  backupDb: () => ipcRenderer.invoke('backup-db'),
  restoreDb: () => ipcRenderer.invoke('restore-db'),
  isElectron: true
});
