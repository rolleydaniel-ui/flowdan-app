import { invoke } from "@tauri-apps/api/core";
import type {
  Settings,
  HistoryEntry,
  DictionaryEntry,
  AudioDevice,
  MeetingState,
  TranscriptChunk,
} from "./index";

// ─── Settings ───

export async function getSettings(): Promise<Settings> {
  return invoke("get_settings");
}

export async function updateSettings(
  updates: Partial<Settings>
): Promise<Settings> {
  return invoke("update_settings", { updates });
}

export async function testOpenaiKey(apiKey: string): Promise<boolean> {
  return invoke("test_openai_key", { apiKey });
}

export async function listAudioDevices(): Promise<AudioDevice[]> {
  return invoke("list_audio_devices");
}

// ─── History ───

export async function getHistory(opts: {
  search?: string;
  archived?: boolean;
  limit?: number;
  offset?: number;
}): Promise<HistoryEntry[]> {
  return invoke("get_history", { query: opts });
}

export async function getHistoryCount(opts: {
  search?: string;
  archived?: boolean;
}): Promise<number> {
  return invoke("get_history_count", { query: opts });
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  return invoke("delete_history_entry", { id });
}

export async function archiveHistoryEntry(id: string): Promise<void> {
  return invoke("archive_history_entry", { id });
}

export async function unarchiveHistoryEntry(id: string): Promise<void> {
  return invoke("unarchive_history_entry", { id });
}

export async function clearHistory(): Promise<void> {
  return invoke("clear_history");
}

// ─── Dictionary ───

export async function getDictionaryEntries(opts?: {
  search?: string;
  snippetsOnly?: boolean;
}): Promise<DictionaryEntry[]> {
  return invoke("get_dictionary_entries", {
    query: opts
      ? { search: opts.search, snippets_only: opts.snippetsOnly }
      : null,
  });
}

export async function addDictionaryEntry(entry: {
  phrase: string;
  replacement: string;
  is_snippet: boolean;
  language: string | null;
}): Promise<DictionaryEntry> {
  return invoke("add_dictionary_entry", { entry });
}

export async function updateDictionaryEntry(
  id: string,
  updates: {
    phrase?: string;
    replacement?: string;
    is_snippet?: boolean;
    language?: string | null;
  }
): Promise<void> {
  return invoke("update_dictionary_entry", { id, updates });
}

export async function deleteDictionaryEntry(id: string): Promise<void> {
  return invoke("delete_dictionary_entry", { id });
}

export async function exportDictionary(): Promise<string> {
  return invoke("export_dictionary");
}

export async function importDictionary(json: string): Promise<number> {
  return invoke("import_dictionary", { json });
}

// ─── Recording ───

export async function getRecordingState(): Promise<string> {
  return invoke("get_recording_state");
}

export async function startMicRecording(): Promise<void> {
  return invoke("start_mic_recording");
}

export async function stopMicRecording(): Promise<void> {
  return invoke("stop_mic_recording");
}

// ─── Audio (Loopback) ───

export async function startLoopbackCapture(): Promise<void> {
  return invoke("start_loopback_capture");
}

export async function stopLoopbackCapture(): Promise<void> {
  return invoke("stop_loopback_capture");
}

export async function triggerAiResponse(): Promise<void> {
  return invoke("trigger_ai_response");
}

// ─── Meeting ───

export async function startMeetingSession(): Promise<void> {
  return invoke("start_meeting_session");
}

export async function stopMeetingSession(): Promise<void> {
  return invoke("stop_meeting_session");
}

export async function getMeetingState(): Promise<MeetingState | null> {
  return invoke("get_meeting_state");
}

export async function getMeetingTranscript(): Promise<TranscriptChunk[]> {
  return invoke("get_meeting_transcript");
}

export async function meetingChat(question: string): Promise<string> {
  return invoke("meeting_chat", { question });
}

export async function dismissMeeting(): Promise<void> {
  return invoke("dismiss_meeting");
}

// ─── Window ───

export async function showDashboard(): Promise<void> {
  return invoke("show_dashboard");
}

export async function hideDashboard(): Promise<void> {
  return invoke("hide_dashboard");
}

export async function closeApp(): Promise<void> {
  return invoke("close_app");
}
