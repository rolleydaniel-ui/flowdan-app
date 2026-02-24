import { contextBridge, ipcRenderer } from 'electron';

const api = {
  openDashboard: () => ipcRenderer.send('widget:open-dashboard'),
  hideWidget: () => ipcRenderer.send('widget:hide'),
  dragStart: (x: number, y: number) => ipcRenderer.send('widget:drag-start', x, y),
  dragMove: (x: number, y: number) => ipcRenderer.send('widget:drag-move', x, y),
  onRecordingState: (cb: (state: string) => void) => {
    ipcRenderer.on('recording-state', (_event, status) => cb(status.state));
  },
  getRecordingState: () => ipcRenderer.invoke('recording:get-state'),
};

contextBridge.exposeInMainWorld('widgetAPI', api);
