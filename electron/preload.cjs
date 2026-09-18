// Electron Preload Script with Context Bridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  onOpenAddTicker: (callback) => ipcRenderer.on('open-add-ticker', callback),
  sendNotification: (title, body) => {
    new Notification(title, { body });
  }
});
