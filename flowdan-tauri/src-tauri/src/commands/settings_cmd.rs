use tauri::State;
use crate::state::AppState;
use crate::db::{settings_repo, models::Settings, models::AudioDevice};
use crate::errors::AppError;

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<Settings, AppError> {
    let db = state.db.lock().unwrap();
    settings_repo::get_settings(&db)
}

#[tauri::command]
pub fn update_settings(state: State<'_, AppState>, updates: serde_json::Value) -> Result<Settings, AppError> {
    let db = state.db.lock().unwrap();
    settings_repo::update_settings(&db, &updates)?;
    settings_repo::get_settings(&db)
}

#[tauri::command]
pub async fn test_openai_key(api_key: String) -> Result<bool, AppError> {
    crate::ai::openai_client::OpenAIClient::test_key(&api_key).await
}

#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<AudioDevice>, AppError> {
    let devices = crate::audio::microphone::list_input_devices()
        .map_err(|e| AppError::Audio(e))?;

    Ok(devices.into_iter().map(|(name, is_default)| AudioDevice {
        device_id: name.clone(),
        label: name,
        is_default,
    }).collect())
}
