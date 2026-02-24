import { BrowserWindow } from 'electron';

declare const SETTINGS_WEBPACK_ENTRY: string;
declare const SETTINGS_PRELOAD_WEBPACK_ENTRY: string;

export function createSettingsWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 600,
    height: 700,
    title: 'FlowDan - Settings',
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: SETTINGS_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadURL(SETTINGS_WEBPACK_ENTRY);

  win.on('close', (e) => {
    e.preventDefault();
    win.hide();
  });

  return win;
}
