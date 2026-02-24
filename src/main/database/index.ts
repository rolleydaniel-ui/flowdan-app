import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

let db: SqlJsDatabase;
let dbPath: string;

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/** Read config.json from %APPDATA%/FlowDan/ */
function loadConfigFile(): Record<string, string> {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return {};
}

/** Read .env file from project root and return key-value pairs */
function loadEnvFile(): Record<string, string> {
  const envPaths = [
    path.join(app.getAppPath(), '.env'),
    path.join(app.getAppPath(), '..', '.env'),
    path.join(process.cwd(), '.env'),
  ];

  for (const envPath of envPaths) {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        const result: Record<string, string> = {};
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx > 0) {
              result[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
            }
          }
        }
        return result;
      }
    } catch {
      // ignore
    }
  }
  return {};
}

export async function initDatabase(): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs();

  const userDataPath = app.getPath('userData');
  dbPath = path.join(userDataPath, 'flowdan.db');

  const isNewDb = !fs.existsSync(dbPath);

  if (!isNewDb) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  const schema = `
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      openai_api_key TEXT,
      language TEXT DEFAULT 'pl',
      microphone_id TEXT,
      hotkey TEXT DEFAULT 'Control+Home',
      auto_paste INTEGER DEFAULT 1,
      sound_feedback INTEGER DEFAULT 1,
      auto_start INTEGER DEFAULT 0,
      theme TEXT DEFAULT 'dark'
    );
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      asr_text TEXT NOT NULL,
      formatted_text TEXT,
      language TEXT NOT NULL,
      app_name TEXT,
      duration_ms INTEGER,
      num_words INTEGER,
      is_archived INTEGER DEFAULT 0,
      timestamp INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS dictionary (
      id TEXT PRIMARY KEY,
      phrase TEXT NOT NULL UNIQUE,
      replacement TEXT NOT NULL,
      is_snippet INTEGER DEFAULT 0,
      frequency_used INTEGER DEFAULT 0,
      language TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    INSERT OR IGNORE INTO settings (id) VALUES (1);
  `;
  db.run(schema);

  // Auto-seed API key: config.json > .env (if DB has no key set)
  const config = loadConfigFile();
  const env = loadEnvFile();
  const apiKey = config.openai_api_key || config.OPENAI_API_KEY || env.OPENAI_API_KEY;
  if (apiKey) {
    const stmt = db.prepare('SELECT openai_api_key FROM settings WHERE id = 1');
    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      if (!row.openai_api_key) {
        db.run('UPDATE settings SET openai_api_key = ? WHERE id = 1', [apiKey]);
        const source = (config.openai_api_key || config.OPENAI_API_KEY) ? 'config.json' : '.env';
        console.log(`[FlowDan] API key loaded from ${source}`);
      }
    }
    stmt.free();
  }

  saveDatabase();
  return db;
}

export function saveDatabase(): void {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
  }
}
