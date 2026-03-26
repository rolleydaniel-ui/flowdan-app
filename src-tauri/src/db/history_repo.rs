use rusqlite::Connection;
use super::models::{HistoryEntry, NewHistoryEntry};
use crate::errors::AppError;

pub fn add(conn: &Connection, entry: &NewHistoryEntry) -> Result<HistoryEntry, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO history (id, asr_text, formatted_text, language, app_name, duration_ms, num_words, source)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            id,
            entry.asr_text,
            entry.formatted_text,
            entry.language,
            entry.app_name,
            entry.duration_ms,
            entry.num_words,
            entry.source,
        ],
    )?;

    get_by_id(conn, &id)?.ok_or_else(|| AppError::General("Failed to retrieve inserted entry".to_string()))
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<Option<HistoryEntry>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, asr_text, formatted_text, language, app_name, duration_ms, num_words,
                is_archived, source, timestamp
         FROM history WHERE id = ?1",
    )?;

    let entry = stmt.query_row([id], |row| {
        Ok(HistoryEntry {
            id: row.get(0)?,
            asr_text: row.get(1)?,
            formatted_text: row.get(2)?,
            language: row.get(3)?,
            app_name: row.get(4)?,
            duration_ms: row.get(5)?,
            num_words: row.get(6)?,
            is_archived: row.get::<_, i64>(7)? != 0,
            source: row.get::<_, Option<String>>(8)?.unwrap_or_else(|| "microphone".to_string()),
            timestamp: row.get(9)?,
        })
    }).ok();

    Ok(entry)
}

pub fn get_all(
    conn: &Connection,
    search: Option<&str>,
    archived: bool,
    limit: i64,
    offset: i64,
) -> Result<Vec<HistoryEntry>, AppError> {
    let mut sql = "SELECT id, asr_text, formatted_text, language, app_name, duration_ms, num_words,
                          is_archived, source, timestamp
                   FROM history WHERE is_archived = ?1".to_string();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(archived as i64)];

    if let Some(search) = search {
        if !search.is_empty() {
            sql.push_str(" AND (asr_text LIKE ?2 OR formatted_text LIKE ?2 OR app_name LIKE ?2)");
            params.push(Box::new(format!("%{}%", search)));
        }
    }

    sql.push_str(" ORDER BY timestamp DESC LIMIT ?");
    let limit_idx = params.len() + 1;
    sql = sql.replace("LIMIT ?", &format!("LIMIT ?{}", limit_idx));
    params.push(Box::new(limit));

    sql.push_str(&format!(" OFFSET ?{}", limit_idx + 1));
    params.push(Box::new(offset));

    let mut stmt = conn.prepare(&sql)?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(HistoryEntry {
            id: row.get(0)?,
            asr_text: row.get(1)?,
            formatted_text: row.get(2)?,
            language: row.get(3)?,
            app_name: row.get(4)?,
            duration_ms: row.get(5)?,
            num_words: row.get(6)?,
            is_archived: row.get::<_, i64>(7)? != 0,
            source: row.get::<_, Option<String>>(8)?.unwrap_or_else(|| "microphone".to_string()),
            timestamp: row.get(9)?,
        })
    })?;

    let mut entries = Vec::new();
    for row in rows {
        entries.push(row?);
    }
    Ok(entries)
}

pub fn count(
    conn: &Connection,
    search: Option<&str>,
    archived: bool,
) -> Result<i64, AppError> {
    let mut sql = "SELECT COUNT(*) FROM history WHERE is_archived = ?1".to_string();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(archived as i64)];

    if let Some(search) = search {
        if !search.is_empty() {
            sql.push_str(" AND (asr_text LIKE ?2 OR formatted_text LIKE ?2 OR app_name LIKE ?2)");
            params.push(Box::new(format!("%{}%", search)));
        }
    }

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let count: i64 = conn.query_row(&sql, param_refs.as_slice(), |row| row.get(0))?;
    Ok(count)
}

pub fn archive(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("UPDATE history SET is_archived = 1 WHERE id = ?1", [id])?;
    Ok(())
}

pub fn unarchive(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("UPDATE history SET is_archived = 0 WHERE id = ?1", [id])?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM history WHERE id = ?1", [id])?;
    Ok(())
}

pub fn clear(conn: &Connection) -> Result<(), AppError> {
    conn.execute("DELETE FROM history", [])?;
    Ok(())
}
