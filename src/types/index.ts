// ─── Database Models ───

export interface Settings {
  id: 1;
  openai_api_key: string | null;
  language: 'pl' | 'en';
  microphone_id: string | null;
  hotkey: string;
  auto_paste: boolean;
  sound_feedback: boolean;
  auto_start: boolean;
  theme: 'dark';
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

// ─── Audio Device (plain serializable object) ───

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: string;
  groupId: string;
}

// ─── IPC Channels ───

export type RecordingState = 'idle' | 'recording' | 'processing';

export interface RecordingStatus {
  state: RecordingState;
}

// ─── IPC API exposed via contextBridge ───

export interface OverlayAPI {
  onRecordingStateChange: (cb: (status: RecordingStatus) => void) => void;
  onAudioLevel: (cb: (level: number) => void) => void;
  getRecordingState: () => Promise<RecordingState>;
}

export interface SettingsAPI {
  getSettings: () => Promise<Settings>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  getAudioDevices: () => Promise<AudioDevice[]>;
  testOpenAIKey: (key: string) => Promise<boolean>;
  onSettingsChanged: (cb: (settings: Settings) => void) => void;
}

export interface HistoryAPI {
  getHistory: (opts: { search?: string; archived?: boolean; limit?: number; offset?: number }) => Promise<HistoryEntry[]>;
  getHistoryCount: (opts: { search?: string; archived?: boolean }) => Promise<number>;
  deleteEntry: (id: string) => Promise<void>;
  archiveEntry: (id: string) => Promise<void>;
  unarchiveEntry: (id: string) => Promise<void>;
  copyText: (text: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export interface DictionaryAPI {
  getEntries: (opts?: { search?: string; snippetsOnly?: boolean }) => Promise<DictionaryEntry[]>;
  addEntry: (entry: Pick<DictionaryEntry, 'phrase' | 'replacement' | 'is_snippet' | 'language'>) => Promise<DictionaryEntry>;
  updateEntry: (id: string, entry: Partial<DictionaryEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  exportEntries: () => Promise<string>;
  importEntries: (json: string) => Promise<number>;
}

declare global {
  interface Window {
    overlayAPI: OverlayAPI;
    settingsAPI: SettingsAPI;
    historyAPI: HistoryAPI;
    dictionaryAPI: DictionaryAPI;
  }
}
