use std::sync::Mutex;
use rusqlite::Connection;
use tauri::Manager;

use crate::db;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub recording_state: Mutex<RecordingState>,
    pub recording_start: Mutex<Option<std::time::Instant>>,
    pub loopback_running: Mutex<bool>,
    pub loopback_buffer: Mutex<Vec<f32>>,
    pub loopback_sample_rate: Mutex<u32>,
    pub loopback_channels: Mutex<u16>,
    pub meeting_session: Mutex<Option<MeetingSession>>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum RecordingState {
    Idle,
    Recording,
    Processing,
}

impl Default for RecordingState {
    fn default() -> Self {
        Self::Idle
    }
}

// ─── Meeting Session ───

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TranscriptChunk {
    pub text: String,
    pub timestamp_sec: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MeetingChatMessage {
    pub role: String,    // "user" | "assistant"
    pub content: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MeetingStatus {
    Recording,
    Processing,
    Finished,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MeetingState {
    pub active: bool,
    pub status: MeetingStatus,
    pub started_at: u64,        // epoch secs
    pub elapsed_secs: u64,
    pub transcript_chunks: Vec<TranscriptChunk>,
    pub chat_messages: Vec<MeetingChatMessage>,
    pub summary: Option<String>,
}

#[derive(Debug)]
pub struct MeetingSession {
    pub started_at: std::time::SystemTime,
    pub transcript_chunks: Vec<TranscriptChunk>,
    pub chat_messages: Vec<MeetingChatMessage>,
    pub summary: Option<String>,
    pub status: MeetingStatus,
}

pub fn init_app_state(app_handle: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_dir = app_handle.path().app_data_dir()
        .expect("failed to get app data dir");

    std::fs::create_dir_all(&app_dir)?;

    let db_path = app_dir.join("flowdan.db");
    let conn = Connection::open(&db_path)?;

    db::init_database(&conn)?;

    // Try to seed API key from config.json or .env
    db::seed_api_key(&conn, &app_dir);

    app_handle.manage(AppState {
        db: Mutex::new(conn),
        recording_state: Mutex::new(RecordingState::Idle),
        recording_start: Mutex::new(None),
        loopback_running: Mutex::new(false),
        loopback_buffer: Mutex::new(Vec::new()),
        loopback_sample_rate: Mutex::new(48000),
        loopback_channels: Mutex::new(2),
        meeting_session: Mutex::new(None),
    });

    Ok(())
}
