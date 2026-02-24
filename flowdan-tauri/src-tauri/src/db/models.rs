use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub id: i64,
    pub openai_api_key: Option<String>,
    pub language: String,
    pub microphone_id: Option<String>,
    pub hotkey: String,
    pub auto_paste: bool,
    pub sound_feedback: bool,
    pub auto_start: bool,
    pub theme: String,
    pub loopback_enabled: bool,
    pub loopback_buffer_secs: i64,
    pub ai_prompt: String,
    pub mic_hotkey: String,
    pub ai_hotkey: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    pub asr_text: String,
    pub formatted_text: Option<String>,
    pub language: String,
    pub app_name: Option<String>,
    pub duration_ms: Option<i64>,
    pub num_words: Option<i64>,
    pub is_archived: bool,
    pub source: String,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictionaryEntry {
    pub id: String,
    pub phrase: String,
    pub replacement: String,
    pub is_snippet: bool,
    pub frequency_used: i64,
    pub language: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDevice {
    pub device_id: String,
    pub label: String,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryQuery {
    pub search: Option<String>,
    pub archived: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryCountQuery {
    pub search: Option<String>,
    pub archived: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictionaryQuery {
    pub search: Option<String>,
    pub snippets_only: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewDictionaryEntry {
    pub phrase: String,
    pub replacement: String,
    pub is_snippet: bool,
    pub language: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDictionaryEntry {
    pub phrase: Option<String>,
    pub replacement: Option<String>,
    pub is_snippet: Option<bool>,
    pub language: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewHistoryEntry {
    pub asr_text: String,
    pub formatted_text: Option<String>,
    pub language: String,
    pub app_name: Option<String>,
    pub duration_ms: Option<i64>,
    pub num_words: Option<i64>,
    pub source: String,
}
