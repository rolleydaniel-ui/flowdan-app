import { BrowserWindow } from 'electron';

declare const DICTIONARY_WEBPACK_ENTRY: string;
declare const DICTIONARY_PRELOAD_WEBPACK_ENTRY: string;

export function createDictionaryWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 700,
    height: 550,
    title: 'FlowDan - Dictionary',
    show: false,
    webPreferences: {
      preload: DICTIONARY_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadURL(DICTIONARY_WEBPACK_ENTRY);

  win.on('close', (e) => {
    e.preventDefault();
    win.hide();
  });

  return win;
}
