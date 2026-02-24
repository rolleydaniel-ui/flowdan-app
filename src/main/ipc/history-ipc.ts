import { ipcMain, clipboard } from 'electron';
import { HistoryRepo } from '../database/repositories/history';

export function registerHistoryIPC(historyRepo: HistoryRepo): void {
  ipcMain.handle('history:get', (_event, opts) => {
    return historyRepo.getAll(opts);
  });

  ipcMain.handle('history:count', (_event, opts) => {
    return historyRepo.count(opts);
  });

  ipcMain.handle('history:delete', (_event, id: string) => {
    historyRepo.delete(id);
  });

  ipcMain.handle('history:archive', (_event, id: string) => {
    historyRepo.archive(id);
  });

  ipcMain.handle('history:unarchive', (_event, id: string) => {
    historyRepo.unarchive(id);
  });

  ipcMain.handle('history:copy', (_event, text: string) => {
    clipboard.writeText(text);
  });

  ipcMain.handle('history:clear', () => {
    historyRepo.clear();
  });
}
