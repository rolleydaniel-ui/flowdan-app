use rusqlite::Connection;
use super::models::Settings;
use crate::errors::AppError;

pub fn get_settings(conn: &Connection) -> Result<Settings, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, openai_api_key, language, microphone_id, hotkey, auto_paste, sound_feedback,
                auto_start, theme, loopback_enabled, loopback_buffer_secs, ai_prompt,
                mic_hotkey, ai_hotkey
         FROM settings WHERE id = 1",
    )?;

    let settings = stmt.query_row([], |row| {
        Ok(Settings {
            id: row.get(0)?,
            openai_api_key: row.get(1)?,
            language: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "pl".to_string()),
            microphone_id: row.get(3)?,
            hotkey: row.get::<_, Option<String>>(4)?.unwrap_or_else(|| "Control+Home".to_string()),
            auto_paste: row.get::<_, i64>(5).unwrap_or(1) != 0,
            sound_feedback: row.get::<_, i64>(6).unwrap_or(1) != 0,
            auto_start: row.get::<_, i64>(7).unwrap_or(0) != 0,
            theme: row.get::<_, Option<String>>(8)?.unwrap_or_else(|| "dark".to_string()),
            loopback_enabled: row.get::<_, i64>(9).unwrap_or(0) != 0,
            loopback_buffer_secs: row.get::<_, i64>(10).unwrap_or(60),
            ai_prompt: row.get::<_, Option<String>>(11)?.unwrap_or_else(|| "Answer this question concisely".to_string()),
            mic_hotkey: row.get::<_, Option<String>>(12)?.unwrap_or_else(|| "Ctrl+Super".to_string()),
            ai_hotkey: row.get::<_, Option<String>>(13)?.unwrap_or_else(|| "Ctrl+Shift+Super".to_string()),
        })
    })?;

    Ok(settings)
}

pub fn update_settings(conn: &Connection, updates: &serde_json::Value) -> Result<(), AppError> {
    let current = get_settings(conn)?;

    let api_key = updates.get("openai_api_key")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .or(current.openai_api_key);
    let language = updates.get("language").and_then(|v| v.as_str()).unwrap_or(&current.language);
    let mic_id = updates.get("microphone_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .or(current.microphone_id);
    let hotkey = updates.get("hotkey").and_then(|v| v.as_str()).unwrap_or(&current.hotkey);
    let auto_paste = updates.get("auto_paste").and_then(|v| v.as_bool()).unwrap_or(current.auto_paste);
    let sound_feedback = updates.get("sound_feedback").and_then(|v| v.as_bool()).unwrap_or(current.sound_feedback);
    let auto_start = updates.get("auto_start").and_then(|v| v.as_bool()).unwrap_or(current.auto_start);
    let theme = updates.get("theme").and_then(|v| v.as_str()).unwrap_or(&current.theme);
    let loopback_enabled = updates.get("loopback_enabled").and_then(|v| v.as_bool()).unwrap_or(current.loopback_enabled);
    let loopback_buffer_secs = updates.get("loopback_buffer_secs").and_then(|v| v.as_i64()).unwrap_or(current.loopback_buffer_secs);
    let ai_prompt = updates.get("ai_prompt").and_then(|v| v.as_str()).unwrap_or(&current.ai_prompt);
    let mic_hotkey = updates.get("mic_hotkey").and_then(|v| v.as_str()).unwrap_or(&current.mic_hotkey);
    let ai_hotkey = updates.get("ai_hotkey").and_then(|v| v.as_str()).unwrap_or(&current.ai_hotkey);

    conn.execute(
        "UPDATE settings SET
            openai_api_key = ?1,
            language = ?2,
            microphone_id = ?3,
            hotkey = ?4,
            auto_paste = ?5,
            sound_feedback = ?6,
            auto_start = ?7,
            theme = ?8,
            loopback_enabled = ?9,
            loopback_buffer_secs = ?10,
            ai_prompt = ?11,
            mic_hotkey = ?12,
            ai_hotkey = ?13
        WHERE id = 1",
        rusqlite::params![
            api_key,
            language,
            mic_id,
            hotkey,
            auto_paste as i64,
            sound_feedback as i64,
            auto_start as i64,
            theme,
            loopback_enabled as i64,
            loopback_buffer_secs,
            ai_prompt,
            mic_hotkey,
            ai_hotkey,
        ],
    )?;

    Ok(())
}
