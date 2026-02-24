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
