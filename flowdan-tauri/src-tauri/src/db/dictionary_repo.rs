use rusqlite::Connection;
use super::models::{DictionaryEntry, NewDictionaryEntry, UpdateDictionaryEntry};
use crate::errors::AppError;

pub fn add(conn: &Connection, entry: &NewDictionaryEntry) -> Result<DictionaryEntry, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO dictionary (id, phrase, replacement, is_snippet, language)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![
            id,
            entry.phrase,
            entry.replacement,
            entry.is_snippet as i64,
            entry.language,
        ],
    )?;

    get_by_id(conn, &id)?.ok_or_else(|| AppError::General("Failed to retrieve inserted entry".to_string()))
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<Option<DictionaryEntry>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, phrase, replacement, is_snippet, frequency_used, language, created_at
         FROM dictionary WHERE id = ?1",
    )?;

    let entry = stmt.query_row([id], |row| {
        Ok(DictionaryEntry {
            id: row.get(0)?,
            phrase: row.get(1)?,
            replacement: row.get(2)?,
            is_snippet: row.get::<_, i64>(3)? != 0,
            frequency_used: row.get(4)?,
            language: row.get(5)?,
            created_at: row.get(6)?,
        })
    }).ok();

    Ok(entry)
}

pub fn get_all(
    conn: &Connection,
    search: Option<&str>,
    snippets_only: bool,
) -> Result<Vec<DictionaryEntry>, AppError> {
    let mut sql = "SELECT id, phrase, replacement, is_snippet, frequency_used, language, created_at
                   FROM dictionary WHERE 1=1".to_string();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if snippets_only {
        sql.push_str(" AND is_snippet = 1");
    }

    if let Some(search) = search {
        if !search.is_empty() {
            let idx = params.len() + 1;
            sql.push_str(&format!(" AND (phrase LIKE ?{} OR replacement LIKE ?{})", idx, idx));
            params.push(Box::new(format!("%{}%", search)));
        }
    }

    sql.push_str(" ORDER BY frequency_used DESC, created_at DESC");

    let mut stmt = conn.prepare(&sql)?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(DictionaryEntry {
            id: row.get(0)?,
            phrase: row.get(1)?,
            replacement: row.get(2)?,
            is_snippet: row.get::<_, i64>(3)? != 0,
            frequency_used: row.get(4)?,
            language: row.get(5)?,
            created_at: row.get(6)?,
        })
    })?;

    let mut entries = Vec::new();
    for row in rows {
        entries.push(row?);
    }
    Ok(entries)
}

pub fn update(conn: &Connection, id: &str, updates: &UpdateDictionaryEntry) -> Result<(), AppError> {
    let current = get_by_id(conn, id)?.ok_or_else(|| AppError::General("Entry not found".to_string()))?;

    let phrase = updates.phrase.as_deref().unwrap_or(&current.phrase);
    let replacement = updates.replacement.as_deref().unwrap_or(&current.replacement);
    let is_snippet = updates.is_snippet.unwrap_or(current.is_snippet);
    let language = updates.language.as_deref().or(current.language.as_deref());

    conn.execute(
        "UPDATE dictionary SET phrase = ?1, replacement = ?2, is_snippet = ?3, language = ?4 WHERE id = ?5",
        rusqlite::params![phrase, replacement, is_snippet as i64, language, id],
    )?;

    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM dictionary WHERE id = ?1", [id])?;
    Ok(())
}

pub fn increment_usage(conn: &Connection, phrase: &str) -> Result<(), AppError> {
    conn.execute(
        "UPDATE dictionary SET frequency_used = frequency_used + 1 WHERE phrase = ?1",
        [phrase],
    )?;
    Ok(())
}

pub fn apply_replacements(conn: &Connection, text: &str) -> Result<String, AppError> {
    let entries = get_all(conn, None, false)?;
    let mut result = text.to_string();

    for entry in &entries {
        if !entry.is_snippet {
            let pattern = format!(r"(?i)\b{}\b", regex::escape(&entry.phrase));
            if let Ok(re) = regex::Regex::new(&pattern) {
                if re.is_match(&result) {
                    result = re.replace_all(&result, entry.replacement.as_str()).to_string();
                    let _ = increment_usage(conn, &entry.phrase);
                }
            }
        }
    }

    Ok(result)
}

pub fn export_all(conn: &Connection) -> Result<String, AppError> {
    let entries = get_all(conn, None, false)?;
    Ok(serde_json::to_string_pretty(&entries)?)
}

pub fn import_all(conn: &Connection, json: &str) -> Result<i64, AppError> {
    let entries: Vec<DictionaryEntry> = serde_json::from_str(json)?;
    let mut count = 0i64;

    for e in &entries {
        let id = if e.id.is_empty() {
            uuid::Uuid::new_v4().to_string()
        } else {
            e.id.clone()
        };

        conn.execute(
            "INSERT OR REPLACE INTO dictionary (id, phrase, replacement, is_snippet, frequency_used, language, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![
                id,
                e.phrase,
                e.replacement,
                e.is_snippet as i64,
                e.frequency_used,
                e.language,
                e.created_at,
            ],
        )?;
        count += 1;
    }

    Ok(count)
}
