import { ipcMain, BrowserWindow } from 'electron';
import { SettingsRepo } from '../database/repositories/settings';
import { OpenAIService } from '../services/openai';
import type { Settings } from '../../types';

export function registerSettingsIPC(
  settingsRepo: SettingsRepo,
  onSettingsChanged: (settings: Settings) => void,
): void {
  ipcMain.handle('settings:get', () => {
    return settingsRepo.getSettings();
  });

  ipcMain.handle('settings:update', (_event, updates: Partial<Settings>) => {
    settingsRepo.updateSettings(updates);
    const newSettings = settingsRepo.getSettings();
    onSettingsChanged(newSettings);

    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('settings:changed', newSettings);
    });
  });

  ipcMain.handle('settings:test-openai', async (_event, key: string) => {
    return OpenAIService.testKey(key);
  });
}
