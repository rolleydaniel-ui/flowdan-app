// ─── Database Models ───

export interface Settings {
  id: number;
  openai_api_key: string | null;
  language: "pl" | "en";
  microphone_id: string | null;
  hotkey: string;
  auto_paste: boolean;
  sound_feedback: boolean;
  auto_start: boolean;
  theme: "dark";
  loopback_enabled: boolean;
  loopback_buffer_secs: number;
  ai_prompt: string;
  mic_hotkey: string;
  ai_hotkey: string;
}

export interface HistoryEntry {
  id: string;
  asr_text: string;
  formatted_text: string | null;
  language: string;
  app_name: string | null;
  duration_ms: number | null;
  num_words: number | null;
  is_archived: boolean;
  source: "microphone" | "loopback";
  timestamp: number;
}

export interface DictionaryEntry {
  id: string;
  phrase: string;
  replacement: string;
  is_snippet: boolean;
  frequency_used: number;
  language: string | null;
  created_at: number;
}

export interface AudioDevice {
  device_id: string;
  label: string;
  is_default: boolean;
}

// ─── Recording ───

export type RecordingState = "idle" | "recording" | "processing";

// ─── AI Response ───

export interface AiResponse {
  transcript?: string;
  response?: string;
  error?: string;
}
