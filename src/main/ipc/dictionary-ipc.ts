import { ipcMain } from 'electron';
import { DictionaryRepo } from '../database/repositories/dictionary';

export function registerDictionaryIPC(dictionaryRepo: DictionaryRepo): void {
  ipcMain.handle('dictionary:get', (_event, opts) => {
    return dictionaryRepo.getAll(opts);
  });

  ipcMain.handle('dictionary:add', (_event, entry) => {
    return dictionaryRepo.add(entry);
  });

  ipcMain.handle('dictionary:update', (_event, id: string, updates) => {
    dictionaryRepo.update(id, updates);
  });

  ipcMain.handle('dictionary:delete', (_event, id: string) => {
    dictionaryRepo.delete(id);
  });

  ipcMain.handle('dictionary:export', () => {
    return dictionaryRepo.exportAll();
  });

  ipcMain.handle('dictionary:import', (_event, json: string) => {
    return dictionaryRepo.importAll(json);
  });
}
