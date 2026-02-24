import { getDb, saveDatabase } from '../index';
import type { Settings } from '../../../types';

export class SettingsRepo {
  getSettings(): Settings {
    const stmt = getDb().prepare('SELECT * FROM settings WHERE id = 1');
    if (!stmt.step()) {
      throw new Error('Settings row not found');
    }
    const row = stmt.getAsObject() as any;
    stmt.free();

    return {
      ...row,
      auto_paste: !!row.auto_paste,
      sound_feedback: !!row.sound_feedback,
      auto_start: !!row.auto_start,
    };
  }

  updateSettings(updates: Partial<Settings>): void {
    const current = this.getSettings();
    const merged = { ...current, ...updates };

    getDb().run(
      `UPDATE settings SET
        openai_api_key = ?,
        language = ?,
        microphone_id = ?,
        hotkey = ?,
        auto_paste = ?,
        sound_feedback = ?,
        auto_start = ?,
        theme = ?
      WHERE id = 1`,
      [
        merged.openai_api_key,
        merged.language,
        merged.microphone_id,
        merged.hotkey,
        merged.auto_paste ? 1 : 0,
        merged.sound_feedback ? 1 : 0,
        merged.auto_start ? 1 : 0,
        merged.theme,
      ],
    );
    saveDatabase();
  }
}
