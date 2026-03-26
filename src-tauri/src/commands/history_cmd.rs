use tauri::State;
use crate::state::AppState;
use crate::db::{history_repo, models::{HistoryEntry, HistoryQuery, HistoryCountQuery}};
use crate::errors::AppError;

#[tauri::command]
pub fn get_history(state: State<'_, AppState>, query: HistoryQuery) -> Result<Vec<HistoryEntry>, AppError> {
    let db = state.db.lock().unwrap();
    history_repo::get_all(
        &db,
        query.search.as_deref(),
        query.archived.unwrap_or(false),
        query.limit.unwrap_or(50),
        query.offset.unwrap_or(0),
    )
}

#[tauri::command]
pub fn get_history_count(state: State<'_, AppState>, query: HistoryCountQuery) -> Result<i64, AppError> {
    let db = state.db.lock().unwrap();
    history_repo::count(&db, query.search.as_deref(), query.archived.unwrap_or(false))
}

#[tauri::command]
pub fn delete_history_entry(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    let db = state.db.lock().unwrap();
    history_repo::delete(&db, &id)
}

#[tauri::command]
pub fn archive_history_entry(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    let db = state.db.lock().unwrap();
    history_repo::archive(&db, &id)
}

#[tauri::command]
pub fn unarchive_history_entry(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    let db = state.db.lock().unwrap();
    history_repo::unarchive(&db, &id)
}

#[tauri::command]
pub fn clear_history(state: State<'_, AppState>) -> Result<(), AppError> {
    let db = state.db.lock().unwrap();
    history_repo::clear(&db)
}
