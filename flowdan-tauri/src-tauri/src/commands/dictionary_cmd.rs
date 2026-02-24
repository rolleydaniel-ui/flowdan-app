use tauri::State;
use crate::state::AppState;
use crate::db::{dictionary_repo, models::{DictionaryEntry, DictionaryQuery, NewDictionaryEntry, UpdateDictionaryEntry}};
use crate::errors::AppError;

#[tauri::command]
pub fn get_dictionary_entries(state: State<'_, AppState>, query: Option<DictionaryQuery>) -> Result<Vec<DictionaryEntry>, AppError> {
    let db = state.db.lock().unwrap();
    let q = query.unwrap_or(DictionaryQuery { search: None, snippets_only: None });
    dictionary_repo::get_all(&db, q.search.as_deref(), q.snippets_only.unwrap_or(false))
}

#[tauri::command]
pub fn add_dictionary_entry(state: State<'_, AppState>, entry: NewDictionaryEntry) -> Result<DictionaryEntry, AppError> {
    let db = state.db.lock().unwrap();
    dictionary_repo::add(&db, &entry)
}

#[tauri::command]
pub fn update_dictionary_entry(state: State<'_, AppState>, id: String, updates: UpdateDictionaryEntry) -> Result<(), AppError> {
    let db = state.db.lock().unwrap();
    dictionary_repo::update(&db, &id, &updates)
}

#[tauri::command]
pub fn delete_dictionary_entry(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    let db = state.db.lock().unwrap();
    dictionary_repo::delete(&db, &id)
}

#[tauri::command]
pub fn export_dictionary(state: State<'_, AppState>) -> Result<String, AppError> {
    let db = state.db.lock().unwrap();
    dictionary_repo::export_all(&db)
}

#[tauri::command]
pub fn import_dictionary(state: State<'_, AppState>, json: String) -> Result<i64, AppError> {
    let db = state.db.lock().unwrap();
    dictionary_repo::import_all(&db, &json)
}
