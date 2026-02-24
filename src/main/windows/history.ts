import { BrowserWindow } from 'electron';

declare const HISTORY_WEBPACK_ENTRY: string;
declare const HISTORY_PRELOAD_WEBPACK_ENTRY: string;

export function createHistoryWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'FlowDan - History',
    show: false,
    webPreferences: {
      preload: HISTORY_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadURL(HISTORY_WEBPACK_ENTRY);

  win.on('close', (e) => {
    e.preventDefault();
    win.hide();
  });

  return win;
}
