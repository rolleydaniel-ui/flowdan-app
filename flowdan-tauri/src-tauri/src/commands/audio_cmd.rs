use tauri::{State, AppHandle, Manager, Emitter};
use crate::state::AppState;
use crate::errors::AppError;
use crate::audio::encoder;
use crate::ai::openai_client::OpenAIClient;
use crate::ai::prompts;
use crate::db::settings_repo;

#[tauri::command]
pub async fn start_loopback_capture(state: State<'_, AppState>) -> Result<(), AppError> {
    let mut running = state.loopback_running.lock().unwrap();
    if *running {
        return Ok(());
    }
    *running = true;
    drop(running);

    // Initialize buffer with settings
    let buffer_secs = {
        let db = state.db.lock().unwrap();
        let settings = settings_repo::get_settings(&db)?;
        settings.loopback_buffer_secs as usize
    };

    // Reset buffer
    let sample_rate = *state.loopback_sample_rate.lock().unwrap();
    let channels = *state.loopback_channels.lock().unwrap();

    let mut buffer = state.loopback_buffer.lock().unwrap();
    buffer.clear();
    // Pre-allocate for ring buffer (buffer_secs * sample_rate * channels)
    let capacity = buffer_secs * sample_rate as usize * channels as usize;
    buffer.reserve(capacity);

    log::info!("Loopback capture started ({}s buffer)", buffer_secs);
    Ok(())
}

#[tauri::command]
pub async fn stop_loopback_capture(state: State<'_, AppState>) -> Result<(), AppError> {
    let mut running = state.loopback_running.lock().unwrap();
    *running = false;

    let mut buffer = state.loopback_buffer.lock().unwrap();
    buffer.clear();

    log::info!("Loopback capture stopped");
    Ok(())
}

#[tauri::command]
pub async fn trigger_ai_response(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    let _ = app_handle.emit("ai-processing-start", ());

    // Get last 30s from loopback buffer
    let (samples, sample_rate, channels) = {
        let buffer = state.loopback_buffer.lock().unwrap();
        let sr = *state.loopback_sample_rate.lock().unwrap();
        let ch = *state.loopback_channels.lock().unwrap();
        // Take last 30 seconds worth of samples
        let samples_30s = sr as usize * ch as usize * 30;
        let start = buffer.len().saturating_sub(samples_30s);
        (buffer[start..].to_vec(), sr, ch)
    };

    if samples.is_empty() {
        let _ = app_handle.emit("ai-response", serde_json::json!({
            "error": "No audio captured. Make sure loopback is enabled."
        }));
        return Ok(());
    }

    // Encode to WAV
    let wav_data = encoder::encode_wav(&samples, sample_rate, channels)
        .map_err(|e| AppError::Audio(e))?;

    // Get settings
    let (api_key, language, ai_prompt) = {
        let db = state.db.lock().unwrap();
        let settings = settings_repo::get_settings(&db)?;
        (
            settings.openai_api_key.clone().unwrap_or_default(),
            settings.language.clone(),
            settings.ai_prompt.clone(),
        )
    };

    if api_key.is_empty() {
        let _ = app_handle.emit("ai-response", serde_json::json!({
            "error": "No API key configured"
        }));
        return Ok(());
    }

    let client = OpenAIClient::new(&api_key);

    // Transcribe desktop audio
    let transcript = client.transcribe(wav_data, &language).await?;

    if transcript.trim().is_empty() {
        let _ = app_handle.emit("ai-response", serde_json::json!({
            "error": "No speech detected in audio"
        }));
        return Ok(());
    }

    // Get AI response
    let system_prompt = prompts::ai_response_prompt(&ai_prompt);
    let response = client.ai_respond(&transcript, &system_prompt).await?;

    // Show AI overlay
    if let Some(overlay) = app_handle.get_webview_window("ai-overlay") {
        let _ = overlay.show();
    }

    let _ = app_handle.emit("ai-response", serde_json::json!({
        "transcript": transcript,
        "response": response,
    }));

    log::info!("AI response generated");
    Ok(())
}
