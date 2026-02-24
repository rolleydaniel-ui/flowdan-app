import { getDb, saveDatabase } from '../index';
import type { HistoryEntry } from '../../../types';
import { v4 as uuid } from 'uuid';

export class HistoryRepo {
  add(entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'is_archived'>): HistoryEntry {
    const id = uuid();
    getDb().run(
      `INSERT INTO history (id, asr_text, formatted_text, language, app_name, duration_ms, num_words)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, entry.asr_text, entry.formatted_text, entry.language, entry.app_name, entry.duration_ms, entry.num_words],
    );
    saveDatabase();
    return this.getById(id)!;
  }

  getById(id: string): HistoryEntry | undefined {
    const stmt = getDb().prepare('SELECT * FROM history WHERE id = ?');
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      return undefined;
    }
    const row = stmt.getAsObject() as any;
    stmt.free();
    return { ...row, is_archived: !!row.is_archived };
  }

  getAll(opts: { search?: string; archived?: boolean; limit?: number; offset?: number } = {}): HistoryEntry[] {
    const { search, archived = false, limit = 50, offset = 0 } = opts;
    let sql = 'SELECT * FROM history WHERE is_archived = ?';
    const params: any[] = [archived ? 1 : 0];

    if (search) {
      sql += ' AND (asr_text LIKE ? OR formatted_text LIKE ? OR app_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const results: HistoryEntry[] = [];
    const stmt = getDb().prepare(sql);
    stmt.bind(params);
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      results.push({ ...row, is_archived: !!row.is_archived });
    }
    stmt.free();
    return results;
  }

  count(opts: { search?: string; archived?: boolean } = {}): number {
    const { search, archived = false } = opts;
    let sql = 'SELECT COUNT(*) as cnt FROM history WHERE is_archived = ?';
    const params: any[] = [archived ? 1 : 0];

    if (search) {
      sql += ' AND (asr_text LIKE ? OR formatted_text LIKE ? OR app_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const stmt = getDb().prepare(sql);
    stmt.bind(params);
    stmt.step();
    const row = stmt.getAsObject() as any;
    stmt.free();
    return row.cnt;
  }

  archive(id: string): void {
    getDb().run('UPDATE history SET is_archived = 1 WHERE id = ?', [id]);
    saveDatabase();
  }

  unarchive(id: string): void {
    getDb().run('UPDATE history SET is_archived = 0 WHERE id = ?', [id]);
    saveDatabase();
  }

  delete(id: string): void {
    getDb().run('DELETE FROM history WHERE id = ?', [id]);
    saveDatabase();
  }

  clear(): void {
    getDb().run('DELETE FROM history');
    saveDatabase();
  }
}
