import { BrowserWindow } from 'electron';

declare const DASHBOARD_WEBPACK_ENTRY: string;
declare const DASHBOARD_PRELOAD_WEBPACK_ENTRY: string;

export function createDashboardWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 960,
    height: 660,
    minWidth: 800,
    minHeight: 550,
    title: 'FlowDan',
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#09090b',
      symbolColor: '#52525b',
      height: 40,
    },
    backgroundColor: '#09090b',
    webPreferences: {
      preload: DASHBOARD_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadURL(DASHBOARD_WEBPACK_ENTRY);

  win.on('close', (e) => {
    e.preventDefault();
    win.hide();
  });

  return win;
}
