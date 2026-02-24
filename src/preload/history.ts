import { contextBridge, ipcRenderer } from 'electron';
import type { HistoryAPI } from '../types';

const api: HistoryAPI = {
  getHistory: (opts) => ipcRenderer.invoke('history:get', opts),
  getHistoryCount: (opts) => ipcRenderer.invoke('history:count', opts),
  deleteEntry: (id) => ipcRenderer.invoke('history:delete', id),
  archiveEntry: (id) => ipcRenderer.invoke('history:archive', id),
  unarchiveEntry: (id) => ipcRenderer.invoke('history:unarchive', id),
  copyText: (text) => ipcRenderer.invoke('history:copy', text),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
};

contextBridge.exposeInMainWorld('historyAPI', api);
