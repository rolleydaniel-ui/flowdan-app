use tauri::{State, Manager, AppHandle, Emitter};
use crate::state::{AppState, RecordingState};
use crate::errors::AppError;
use crate::audio::encoder;
use crate::ai::openai_client::OpenAIClient;
use crate::db::{settings_repo, history_repo, dictionary_repo, models::NewHistoryEntry};
use crate::services::{text_injection, active_window};

#[tauri::command]
pub fn get_recording_state(state: State<'_, AppState>) -> Result<String, AppError> {
    let rec = state.recording_state.lock().unwrap();
    Ok(match *rec {
        RecordingState::Idle => "idle".to_string(),
        RecordingState::Recording => "recording".to_string(),
        RecordingState::Processing => "processing".to_string(),
    })
}

#[tauri::command]
pub async fn start_mic_recording(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    {
        let mut rec = state.recording_state.lock().unwrap();
        if *rec != RecordingState::Idle {
            return Ok(());
        }
        *rec = RecordingState::Recording;
    }

    let _ = app_handle.emit("recording-state-changed", "recording");

    if let Some(overlay) = app_handle.get_webview_window("overlay") {
        let _ = overlay.show();
    }

    Ok(())
}

#[tauri::command]
pub async fn stop_mic_recording(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    {
        let mut rec = state.recording_state.lock().unwrap();
        if *rec != RecordingState::Recording {
            return Ok(());
        }
        *rec = RecordingState::Processing;
    }
    let _ = app_handle.emit("recording-state-changed", "processing");

    // Note: actual processing is handled by hotkey.rs pipeline
    // This command is a thin wrapper for UI button fallback only
    Ok(())
}

/// Full recording pipeline - called internally after mic capture completes
pub async fn process_recorded_audio(
    app_handle: &AppHandle,
    samples: Vec<f32>,
    sample_rate: u32,
    channels: u16,
    duration_ms: i64,
) -> Result<(), AppError> {
    let state = app_handle.state::<AppState>();

    // Encode to WAV
    let wav_data = encoder::encode_wav(&samples, sample_rate, channels)
        .map_err(AppError::Audio)?;

    if wav_data.len() < 1000 {
        log::info!("Audio too small, skipping");
        return Ok(());
    }

    // Get settings
    let (api_key, language, auto_paste) = {
        let db = state.db.lock().unwrap();
        let settings = settings_repo::get_settings(&db)?;
        (
            settings.openai_api_key.clone().unwrap_or_default(),
            settings.language.clone(),
            settings.auto_paste,
        )
    };

    if api_key.is_empty() {
        return Err(AppError::General("No API key".to_string()));
    }

    // Transcribe and format
    let client = OpenAIClient::new(&api_key);
    let (asr_text, formatted_text) = client.transcribe_and_format(wav_data, &language).await?;

    if asr_text.trim().is_empty() {
        return Ok(());
    }

    // Apply dictionary replacements
    let final_text = {
        let db = state.db.lock().unwrap();
        dictionary_repo::apply_replacements(&db, &formatted_text)?
    };

    // Get active window name
    let app_name = active_window::get_active_app_name();

    // Auto-paste
    if auto_paste {
        text_injection::inject_text(app_handle, &final_text).await
            .map_err(AppError::General)?;
    }

    // Save to history
    {
        let db = state.db.lock().unwrap();
        history_repo::add(&db, &NewHistoryEntry {
            asr_text,
            formatted_text: Some(final_text.clone()),
            language,
            app_name,
            duration_ms: Some(duration_ms),
            num_words: Some(final_text.split_whitespace().count() as i64),
            source: "microphone".to_string(),
        })?;
    }

    log::info!("Text processed and pasted");
    Ok(())
}
