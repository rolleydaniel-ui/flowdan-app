import { BrowserWindow, screen } from 'electron';

declare const WIDGET_WEBPACK_ENTRY: string;
declare const WIDGET_PRELOAD_WEBPACK_ENTRY: string;

export function createWidgetWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = display.workAreaSize;

  const size = 52;

  const win = new BrowserWindow({
    width: size,
    height: size,
    x: Math.round((screenWidth - size) / 2),
    y: Math.round((screenHeight - size) / 2),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: true,
    webPreferences: {
      preload: WIDGET_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true);
  win.loadURL(WIDGET_WEBPACK_ENTRY);

  return win;
}
