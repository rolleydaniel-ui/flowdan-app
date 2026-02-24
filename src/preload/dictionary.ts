import { contextBridge, ipcRenderer } from 'electron';
import type { DictionaryAPI } from '../types';

const api: DictionaryAPI = {
  getEntries: (opts) => ipcRenderer.invoke('dictionary:get', opts),
  addEntry: (entry) => ipcRenderer.invoke('dictionary:add', entry),
  updateEntry: (id, updates) => ipcRenderer.invoke('dictionary:update', id, updates),
  deleteEntry: (id) => ipcRenderer.invoke('dictionary:delete', id),
  exportEntries: () => ipcRenderer.invoke('dictionary:export'),
  importEntries: (json) => ipcRenderer.invoke('dictionary:import', json),
};

contextBridge.exposeInMainWorld('dictionaryAPI', api);
