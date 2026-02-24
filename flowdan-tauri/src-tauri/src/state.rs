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
    });

    Ok(())
}
