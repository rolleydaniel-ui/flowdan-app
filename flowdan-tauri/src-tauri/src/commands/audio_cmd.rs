use tauri::{State, AppHandle, Manager, Emitter};
use crate::state::{AppState, MeetingSession, MeetingStatus, MeetingState, TranscriptChunk, MeetingChatMessage};
use crate::errors::AppError;
use crate::audio::encoder;
use crate::audio::loopback::LoopbackCapture;
use crate::ai::openai_client::OpenAIClient;
use crate::ai::prompts;
use crate::db::settings_repo;

use std::sync::{Mutex, atomic::{AtomicBool, Ordering}};
use std::sync::Arc;

// Global loopback capture instance
static LOOPBACK: std::sync::OnceLock<Mutex<LoopbackCapture>> = std::sync::OnceLock::new();

// Meeting transcription loop cancel token
static MEETING_CANCEL: std::sync::OnceLock<Mutex<Option<Arc<AtomicBool>>>> = std::sync::OnceLock::new();

fn get_meeting_cancel() -> &'static Mutex<Option<Arc<AtomicBool>>> {
    MEETING_CANCEL.get_or_init(|| Mutex::new(None))
}

fn get_loopback(buffer_secs: usize) -> &'static Mutex<LoopbackCapture> {
    LOOPBACK.get_or_init(|| Mutex::new(LoopbackCapture::new(buffer_secs)))
}

/// Public accessor for meeting service
pub fn get_loopback_ref() -> Option<&'static Mutex<LoopbackCapture>> {
    LOOPBACK.get()
}

#[tauri::command]
pub async fn start_loopback_capture(
    state: State<'_, AppState>,
    _app_handle: AppHandle,
) -> Result<(), AppError> {
    let buffer_secs = {
        let db = state.db.lock().unwrap();
        let settings = settings_repo::get_settings(&db)?;
        settings.loopback_buffer_secs as usize
    };

    let loopback = get_loopback(buffer_secs);
    let mut capture = loopback.lock().unwrap();

    if capture.is_running() {
        return Ok(());
    }

    capture.start().map_err(|e| AppError::General(e))?;

    // Update state with actual format
    {
        let mut sr = state.loopback_sample_rate.lock().unwrap();
        *sr = capture.sample_rate;
        let mut ch = state.loopback_channels.lock().unwrap();
        *ch = capture.channels;
    }

    log::info!("Loopback capture started ({}s buffer)", buffer_secs);
    Ok(())
}

#[tauri::command]
pub async fn stop_loopback_capture(_state: State<'_, AppState>) -> Result<(), AppError> {
    if let Some(loopback) = LOOPBACK.get() {
        let mut capture = loopback.lock().unwrap();
        capture.stop();
    }
    log::info!("Loopback capture stopped");
    Ok(())
}

/// Internal function callable from hotkey handler
pub async fn trigger_ai_response_internal(app_handle: &AppHandle) -> Result<(), AppError> {
    let state = app_handle.state::<AppState>();

    let _ = app_handle.emit("ai-processing-start", ());

    // Show AI overlay immediately
    if let Some(overlay) = app_handle.get_webview_window("ai-overlay") {
        let _ = overlay.show();
    }

    // Get audio from loopback capture
    let (samples, sample_rate, channels) = if let Some(loopback) = LOOPBACK.get() {
        let capture = loopback.lock().unwrap();
        if !capture.is_running() {
            let _ = app_handle.emit("ai-response", serde_json::json!({
                "error": "AI Screen Assistant is not running. Enable it in Settings."
            }));
            return Ok(());
        }
        let buf = capture.get_buffer();
        let sr = capture.sample_rate;
        let ch = capture.channels;
        // Take last 30 seconds
        let samples_30s = sr as usize * ch as usize * 30;
        let start = buf.len().saturating_sub(samples_30s);
        (buf[start..].to_vec(), sr, ch)
    } else {
        let _ = app_handle.emit("ai-response", serde_json::json!({
            "error": "Loopback capture not initialized. Enable AI Screen Assistant in Settings."
        }));
        return Ok(());
    };

    if samples.is_empty() || samples.iter().all(|&s| s.abs() < 0.001) {
        let _ = app_handle.emit("ai-response", serde_json::json!({
            "error": "No audio detected. Make sure audio is playing on your screen."
        }));
        return Ok(());
    }

    log::info!("AI: captured {} samples ({}s of audio)", samples.len(),
        samples.len() as f32 / (sample_rate as f32 * channels as f32));

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
            "error": "No API key configured. Add your OpenAI key in Settings."
        }));
        return Ok(());
    }

    let client = OpenAIClient::new(&api_key);

    // Transcribe desktop audio
    let transcript = client.transcribe(wav_data, &language).await?;

    if transcript.trim().is_empty() {
        let _ = app_handle.emit("ai-response", serde_json::json!({
            "error": "No speech detected in the captured audio."
        }));
        return Ok(());
    }

    log::info!("AI transcript: {}", &transcript[..transcript.len().min(100)]);

    // Get AI response
    let system_prompt = prompts::ai_response_prompt(&ai_prompt);
    let response = client.ai_respond(&transcript, &system_prompt).await?;

    let _ = app_handle.emit("ai-response", serde_json::json!({
        "transcript": transcript,
        "response": response,
    }));

    log::info!("AI response generated");
    Ok(())
}

#[tauri::command]
pub async fn trigger_ai_response(
    _state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    trigger_ai_response_internal(&app_handle).await
}

// ─── Meeting Session Commands ───

pub async fn start_meeting_session_internal(app_handle: &AppHandle) -> Result<(), AppError> {
    let state = app_handle.state::<AppState>();

    // Check if already in a meeting
    {
        let session = state.meeting_session.lock().unwrap();
        if session.is_some() {
            return Err(AppError::General("Meeting session already active".into()));
        }
    }

    // Start session capture on loopback
    if let Some(loopback) = LOOPBACK.get() {
        let capture = loopback.lock().unwrap();
        if !capture.is_running() {
            return Err(AppError::General("Loopback capture is not running".into()));
        }
        capture.start_session_capture();
    } else {
        return Err(AppError::General("Loopback not initialized".into()));
    }

    // Create meeting session
    {
        let mut session = state.meeting_session.lock().unwrap();
        *session = Some(MeetingSession {
            started_at: std::time::SystemTime::now(),
            transcript_chunks: Vec::new(),
            chat_messages: Vec::new(),
            summary: None,
            status: MeetingStatus::Recording,
        });
    }

    // Show ai-overlay as side panel — top-right corner
    if let Some(overlay) = app_handle.get_webview_window("ai-overlay") {
        if let Ok(Some(monitor)) = overlay.primary_monitor() {
            let screen = monitor.size();
            let scale = monitor.scale_factor();
            let panel_w = 340.0;
            let panel_h = (screen.height as f64 / scale * 0.75).min(800.0);
            let x = screen.width as f64 / scale - panel_w - 8.0;
            let y = 8.0; // top edge
            let _ = overlay.set_size(tauri::PhysicalSize::new(
                (panel_w * scale) as u32,
                (panel_h * scale) as u32,
            ));
            let _ = overlay.set_position(tauri::PhysicalPosition::new(
                (x * scale) as i32,
                (y * scale) as i32,
            ));
        }
        let _ = overlay.show();
        let _ = overlay.set_focus();
    }

    let _ = app_handle.emit("meeting-started", ());

    // Start background transcription loop
    let cancel = Arc::new(AtomicBool::new(false));
    {
        let mut c = get_meeting_cancel().lock().unwrap();
        *c = Some(cancel.clone());
    }
    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        crate::services::meeting::transcription_loop(handle, cancel).await;
    });

    Ok(())
}

pub async fn stop_meeting_session_internal(app_handle: &AppHandle) -> Result<(), AppError> {
    let state = app_handle.state::<AppState>();

    // Check if meeting is active
    {
        let session = state.meeting_session.lock().unwrap();
        if session.is_none() {
            return Err(AppError::General("No active meeting session".into()));
        }
    }

    // Update status to Processing
    {
        let mut session = state.meeting_session.lock().unwrap();
        if let Some(ref mut s) = *session {
            s.status = MeetingStatus::Processing;
        }
    }
    let _ = app_handle.emit("meeting-processing", ());

    // Stop session capture — no new audio will be added to session buffer
    if let Some(loopback) = LOOPBACK.get() {
        let capture = loopback.lock().unwrap();
        capture.stop_session_capture();
    }

    // Cancel transcription loop
    {
        let mut c = get_meeting_cancel().lock().unwrap();
        if let Some(cancel) = c.take() {
            cancel.store(true, Ordering::SeqCst);
        }
    }

    // Wait for transcription loop to exit
    tokio::time::sleep(std::time::Duration::from_millis(300)).await;

    // Process ALL remaining audio that the loop didn't get to
    // This is critical for short meetings (<30s) where the loop never fired
    crate::services::meeting::process_all_remaining(app_handle).await;

    // Generate summary (wrapped in a helper to ensure cleanup on error)
    let result = generate_summary_and_save(app_handle, &state).await;
    if let Err(ref e) = result {
        log::error!("Meeting summary/save error: {}", e);
    }

    // Always finalize — even if summary failed
    {
        let mut session = state.meeting_session.lock().unwrap();
        if let Some(ref mut s) = *session {
            s.status = MeetingStatus::Finished;
        }
    }
    let _ = app_handle.emit("meeting-finished", ());

    // Sync hotkey flag
    crate::services::hotkey::MEETING_ACTIVE.store(false, Ordering::SeqCst);

    Ok(())
}

/// Generate summary and save to history. Errors don't prevent session from finishing.
async fn generate_summary_and_save(app_handle: &AppHandle, state: &AppState) -> Result<(), AppError> {
    let transcript_text = {
        let session = state.meeting_session.lock().unwrap();
        if let Some(ref s) = *session {
            s.transcript_chunks.iter()
                .map(|c| c.text.clone())
                .collect::<Vec<_>>()
                .join(" ")
        } else {
            String::new()
        }
    };

    if transcript_text.trim().is_empty() {
        log::info!("Meeting: no transcript to summarize");
        return Ok(());
    }

    let (api_key, language) = {
        let db = state.db.lock().unwrap();
        let settings = settings_repo::get_settings(&db)?;
        (settings.openai_api_key.unwrap_or_default(), settings.language)
    };

    if api_key.is_empty() {
        return Err(AppError::General("No API key".into()));
    }

    let client = OpenAIClient::new(&api_key);
    let summary_prompt = prompts::meeting_summary_prompt();
    let summary = client.ai_respond(&transcript_text, &summary_prompt).await?;

    // Store summary in session
    {
        let mut session = state.meeting_session.lock().unwrap();
        if let Some(ref mut s) = *session {
            s.summary = Some(summary.clone());
        }
    }
    let _ = app_handle.emit("meeting-summary", &summary);

    // Save to history
    let duration_ms = {
        let session = state.meeting_session.lock().unwrap();
        session.as_ref()
            .and_then(|s| s.started_at.elapsed().ok())
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0)
    };
    let word_count = transcript_text.split_whitespace().count() as i64;
    let history_text = format!("{}\n\n---\n\n{}", summary, transcript_text);
    let entry = crate::db::models::NewHistoryEntry {
        asr_text: transcript_text,
        formatted_text: Some(history_text),
        language,
        app_name: Some("Meeting".to_string()),
        duration_ms: Some(duration_ms),
        num_words: Some(word_count),
        source: "meeting".to_string(),
    };
    let db = state.db.lock().unwrap();
    let _ = crate::db::history_repo::add(&db, &entry);

    Ok(())
}

#[tauri::command]
pub async fn start_meeting_session(
    _state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    start_meeting_session_internal(&app_handle).await
}

#[tauri::command]
pub async fn stop_meeting_session(
    _state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    stop_meeting_session_internal(&app_handle).await
}

#[tauri::command]
pub async fn get_meeting_state(
    state: State<'_, AppState>,
) -> Result<Option<MeetingState>, AppError> {
    let session = state.meeting_session.lock().unwrap();
    match &*session {
        None => Ok(None),
        Some(s) => {
            let elapsed = s.started_at.elapsed()
                .map(|d| d.as_secs())
                .unwrap_or(0);
            let started_at = s.started_at
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);
            Ok(Some(MeetingState {
                active: true,
                status: s.status.clone(),
                started_at,
                elapsed_secs: elapsed,
                transcript_chunks: s.transcript_chunks.clone(),
                chat_messages: s.chat_messages.clone(),
                summary: s.summary.clone(),
            }))
        }
    }
}

#[tauri::command]
pub async fn get_meeting_transcript(
    state: State<'_, AppState>,
) -> Result<Vec<TranscriptChunk>, AppError> {
    let session = state.meeting_session.lock().unwrap();
    match &*session {
        None => Ok(Vec::new()),
        Some(s) => Ok(s.transcript_chunks.clone()),
    }
}

#[tauri::command]
pub async fn meeting_chat(
    state: State<'_, AppState>,
    app_handle: AppHandle,
    question: String,
) -> Result<String, AppError> {
    let (transcript_text, chat_history_text) = {
        let session = state.meeting_session.lock().unwrap();
        match &*session {
            None => return Err(AppError::General("No active meeting".into())),
            Some(s) => {
                let transcript = s.transcript_chunks.iter()
                    .map(|c| c.text.clone())
                    .collect::<Vec<_>>()
                    .join(" ");
                let chat = s.chat_messages.iter()
                    .map(|m| format!("{}: {}", m.role, m.content))
                    .collect::<Vec<_>>()
                    .join("\n");
                (transcript, chat)
            }
        }
    };

    // Store user message
    {
        let mut session = state.meeting_session.lock().unwrap();
        if let Some(ref mut s) = *session {
            s.chat_messages.push(MeetingChatMessage {
                role: "user".to_string(),
                content: question.clone(),
            });
        }
    }

    let (api_key, _) = {
        let db = state.db.lock().unwrap();
        let settings = settings_repo::get_settings(&db)?;
        (settings.openai_api_key.unwrap_or_default(), settings.language)
    };

    if api_key.is_empty() {
        return Err(AppError::General("No API key configured".into()));
    }

    let client = OpenAIClient::new(&api_key);
    let system = prompts::meeting_chat_prompt(&transcript_text, &chat_history_text);
    let response = client.ai_respond(&question, &system).await?;

    // Store assistant message
    {
        let mut session = state.meeting_session.lock().unwrap();
        if let Some(ref mut s) = *session {
            s.chat_messages.push(MeetingChatMessage {
                role: "assistant".to_string(),
                content: response.clone(),
            });
        }
    }

    let _ = app_handle.emit("meeting-chat-response", &response);
    Ok(response)
}

#[tauri::command]
pub async fn dismiss_meeting(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    // Stop session capture if still running
    if let Some(loopback) = LOOPBACK.get() {
        let capture = loopback.lock().unwrap();
        if capture.is_session_active() {
            capture.stop_session_capture();
        }
    }

    // Cancel transcription loop
    {
        let mut c = get_meeting_cancel().lock().unwrap();
        if let Some(cancel) = c.take() {
            cancel.store(true, Ordering::SeqCst);
        }
    }

    // Clear session
    {
        let mut session = state.meeting_session.lock().unwrap();
        *session = None;
    }

    // Sync hotkey flag so next Ctrl+Shift+Win will start a new meeting
    crate::services::hotkey::MEETING_ACTIVE.store(false, Ordering::SeqCst);

    // Hide ai-overlay
    if let Some(overlay) = app_handle.get_webview_window("ai-overlay") {
        let _ = overlay.hide();
    }

    Ok(())
}

#[tauri::command]
pub async fn trigger_ai_followup(
    state: State<'_, AppState>,
    app_handle: AppHandle,
    question: String,
    context: String,
    transcript: String,
) -> Result<(), AppError> {
    let api_key = {
        let db = state.db.lock().unwrap();
        let settings = settings_repo::get_settings(&db)?;
        settings.openai_api_key.clone().unwrap_or_default()
    };

    if api_key.is_empty() {
        let _ = app_handle.emit("ai-response", serde_json::json!({
            "error": "No API key configured."
        }));
        return Ok(());
    }

    let client = OpenAIClient::new(&api_key);

    let system = format!(
        "You are a real-time AI assistant. The user captured audio from their screen.\n\
         Original transcript: \"{}\"\n\
         Previous conversation:\n{}\n\n\
         The user is now asking a follow-up question. Answer concisely (2-4 sentences). \
         Respond in the same language the user writes in.",
        if transcript.len() > 500 { &transcript[..500] } else { &transcript },
        context
    );

    let response = client.ai_respond(&question, &system).await?;

    let _ = app_handle.emit("ai-response", serde_json::json!({
        "response": response,
    }));

    Ok(())
}
