import { getDb, saveDatabase } from '../index';
import type { DictionaryEntry } from '../../../types';
import { v4 as uuid } from 'uuid';

export class DictionaryRepo {
  add(entry: Pick<DictionaryEntry, 'phrase' | 'replacement' | 'is_snippet' | 'language'>): DictionaryEntry {
    const id = uuid();
    getDb().run(
      `INSERT INTO dictionary (id, phrase, replacement, is_snippet, language)
       VALUES (?, ?, ?, ?, ?)`,
      [id, entry.phrase, entry.replacement, entry.is_snippet ? 1 : 0, entry.language],
    );
    saveDatabase();
    return this.getById(id)!;
  }

  getById(id: string): DictionaryEntry | undefined {
    const stmt = getDb().prepare('SELECT * FROM dictionary WHERE id = ?');
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      return undefined;
    }
    const row = stmt.getAsObject() as any;
    stmt.free();
    return { ...row, is_snippet: !!row.is_snippet };
  }

  getAll(opts: { search?: string; snippetsOnly?: boolean } = {}): DictionaryEntry[] {
    const { search, snippetsOnly } = opts;
    let sql = 'SELECT * FROM dictionary WHERE 1=1';
    const params: any[] = [];

    if (snippetsOnly) {
      sql += ' AND is_snippet = 1';
    }

    if (search) {
      sql += ' AND (phrase LIKE ? OR replacement LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }

    sql += ' ORDER BY frequency_used DESC, created_at DESC';

    const results: DictionaryEntry[] = [];
    const stmt = getDb().prepare(sql);
    if (params.length > 0) stmt.bind(params);
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      results.push({ ...row, is_snippet: !!row.is_snippet });
    }
    stmt.free();
    return results;
  }

  update(id: string, updates: Partial<DictionaryEntry>): void {
    const current = this.getById(id);
    if (!current) return;

    const merged = { ...current, ...updates };
    getDb().run(
      'UPDATE dictionary SET phrase = ?, replacement = ?, is_snippet = ?, language = ? WHERE id = ?',
      [merged.phrase, merged.replacement, merged.is_snippet ? 1 : 0, merged.language, id],
    );
    saveDatabase();
  }

  incrementUsage(phrase: string): void {
    getDb().run('UPDATE dictionary SET frequency_used = frequency_used + 1 WHERE phrase = ?', [phrase]);
    saveDatabase();
  }

  delete(id: string): void {
    getDb().run('DELETE FROM dictionary WHERE id = ?', [id]);
    saveDatabase();
  }

  applyReplacements(text: string): string {
    const entries = this.getAll();
    let result = text;
    for (const entry of entries) {
      if (!entry.is_snippet) {
        const regex = new RegExp(`\\b${escapeRegex(entry.phrase)}\\b`, 'gi');
        if (regex.test(result)) {
          result = result.replace(regex, entry.replacement);
          this.incrementUsage(entry.phrase);
        }
      }
    }
    return result;
  }

  exportAll(): string {
    const entries = this.getAll();
    return JSON.stringify(entries, null, 2);
  }

  importAll(json: string): number {
    const entries: DictionaryEntry[] = JSON.parse(json);
    let count = 0;
    for (const e of entries) {
      getDb().run(
        `INSERT OR REPLACE INTO dictionary (id, phrase, replacement, is_snippet, frequency_used, language, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [e.id || uuid(), e.phrase, e.replacement, e.is_snippet ? 1 : 0, e.frequency_used || 0, e.language, e.created_at || Math.floor(Date.now() / 1000)],
      );
      count++;
    }
    saveDatabase();
    return count;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
