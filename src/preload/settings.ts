import { contextBridge, ipcRenderer } from 'electron';
import type { SettingsAPI, Settings } from '../types';

const api: SettingsAPI = {
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

contextBridge.exposeInMainWorld('settingsAPI', api);
