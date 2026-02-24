import { contextBridge, ipcRenderer } from 'electron';
import type { SettingsAPI, HistoryAPI, DictionaryAPI, Settings } from '../types';

// ─── Settings API ───
const settingsAPI: SettingsAPI = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: Partial<Settings>) => ipcRenderer.invoke('settings:update', settings),
  getAudioDevices: async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label, kind: d.kind, groupId: d.groupId }));
    } catch {
      return [];
    }
  },
  testOpenAIKey: (key: string) => ipcRenderer.invoke('settings:test-openai', key),
  onSettingsChanged: (cb: (settings: Settings) => void) => {
    ipcRenderer.on('settings:changed', (_event, settings) => cb(settings));
  },
};

// ─── History API ───
const historyAPI: HistoryAPI = {
  getHistory: (opts) => ipcRenderer.invoke('history:get', opts),
  getHistoryCount: (opts) => ipcRenderer.invoke('history:count', opts),
  deleteEntry: (id) => ipcRenderer.invoke('history:delete', id),
  archiveEntry: (id) => ipcRenderer.invoke('history:archive', id),
  unarchiveEntry: (id) => ipcRenderer.invoke('history:unarchive', id),
  copyText: (text) => ipcRenderer.invoke('history:copy', text),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
};

// ─── Dictionary API ───
const dictionaryAPI: DictionaryAPI = {
  getEntries: (opts) => ipcRenderer.invoke('dictionary:get', opts),
  addEntry: (entry) => ipcRenderer.invoke('dictionary:add', entry),
  updateEntry: (id, updates) => ipcRenderer.invoke('dictionary:update', id, updates),
  deleteEntry: (id) => ipcRenderer.invoke('dictionary:delete', id),
  exportEntries: () => ipcRenderer.invoke('dictionary:export'),
  importEntries: (json) => ipcRenderer.invoke('dictionary:import', json),
};

// ─── Dashboard API (recording status) ───
const dashboardAPI = {
  onRecordingState: (cb: (state: string) => void) => {
    ipcRenderer.on('recording-state', (_event, status) => cb(status.state));
  },
  getRecordingState: () => ipcRenderer.invoke('recording:get-state'),
};

contextBridge.exposeInMainWorld('settingsAPI', settingsAPI);
contextBridge.exposeInMainWorld('historyAPI', historyAPI);
contextBridge.exposeInMainWorld('dictionaryAPI', dictionaryAPI);
contextBridge.exposeInMainWorld('dashboardAPI', dashboardAPI);
