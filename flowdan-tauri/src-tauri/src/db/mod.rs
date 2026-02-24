pub mod models;
pub mod settings_repo;
pub mod history_repo;
pub mod dictionary_repo;

use rusqlite::Connection;
use std::path::Path;

pub fn init_database(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            openai_api_key TEXT,
            language TEXT DEFAULT 'pl',
            microphone_id TEXT,
            hotkey TEXT DEFAULT 'Control+Home',
            auto_paste INTEGER DEFAULT 1,
            sound_feedback INTEGER DEFAULT 1,
            auto_start INTEGER DEFAULT 0,
            theme TEXT DEFAULT 'dark',
            loopback_enabled INTEGER DEFAULT 0,
            loopback_buffer_secs INTEGER DEFAULT 60,
            ai_prompt TEXT DEFAULT 'Answer this question concisely',
            mic_hotkey TEXT DEFAULT 'Ctrl+Super',
            ai_hotkey TEXT DEFAULT 'Ctrl+Shift+Super'
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
            source TEXT DEFAULT 'microphone',
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
        ",
    )?;

    // Run migrations for existing databases (add new columns if missing)
    migrate(conn)?;

    Ok(())
}

fn migrate(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Add new columns to settings if they don't exist
    let columns_to_add = [
        ("settings", "loopback_enabled", "INTEGER DEFAULT 0"),
        ("settings", "loopback_buffer_secs", "INTEGER DEFAULT 60"),
        ("settings", "ai_prompt", "TEXT DEFAULT 'Answer this question concisely'"),
        ("settings", "mic_hotkey", "TEXT DEFAULT 'Ctrl+Super'"),
        ("settings", "ai_hotkey", "TEXT DEFAULT 'Ctrl+Shift+Super'"),
        ("history", "source", "TEXT DEFAULT 'microphone'"),
    ];

    for (table, column, col_type) in &columns_to_add {
        let sql = format!("ALTER TABLE {} ADD COLUMN {} {}", table, column, col_type);
        // Ignore error if column already exists
        let _ = conn.execute(&sql, []);
    }

    Ok(())
}

pub fn seed_api_key(conn: &Connection, app_dir: &Path) {
    // Try config.json
    let config_path = app_dir.join("config.json");
    if let Ok(content) = std::fs::read_to_string(&config_path) {
        if let Ok(config) = serde_json::from_str::<serde_json::Value>(&content) {
            let key = config.get("openai_api_key")
                .or_else(|| config.get("OPENAI_API_KEY"))
                .and_then(|v| v.as_str());

            if let Some(key) = key {
                if !key.is_empty() {
                    seed_if_empty(conn, key);
                    return;
                }
            }
        }
    }

    // Try .env file in app dir, parent dirs, CWD (walking up), and exe dir
    let mut env_paths = vec![
        app_dir.join(".env"),
        app_dir.parent().map(|p| p.join(".env")).unwrap_or_default(),
    ];
    // Walk up from CWD (covers src-tauri -> flowdan-tauri -> flowdan)
    if let Ok(cwd) = std::env::current_dir() {
        let mut dir = cwd.clone();
        for _ in 0..4 {
            env_paths.push(dir.join(".env"));
            if !dir.pop() { break; }
        }
    }
    // Check exe directory and parents
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            env_paths.push(exe_dir.join(".env"));
        }
    }

    for env_path in &env_paths {
        if let Ok(content) = std::fs::read_to_string(env_path) {
            log::info!("Found .env at: {}", env_path.display());
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with('#') || trimmed.is_empty() {
                    continue;
                }
                if let Some(pos) = trimmed.find('=') {
                    let key_name = trimmed[..pos].trim();
                    let value = trimmed[pos + 1..].trim();
                    if key_name == "OPENAI_API_KEY" && !value.is_empty() {
                        seed_if_empty(conn, value);
                        return;
                    }
                }
            }
        }
    }
}

fn seed_if_empty(conn: &Connection, api_key: &str) {
    let current: Option<String> = conn
        .query_row(
            "SELECT openai_api_key FROM settings WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .ok()
        .flatten();

    if current.is_none() || current.as_deref() == Some("") {
        let _ = conn.execute(
            "UPDATE settings SET openai_api_key = ?1 WHERE id = 1",
            [api_key],
        );
        log::info!("API key seeded from config file");
    }
}
