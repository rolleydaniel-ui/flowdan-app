import React, { useState, useEffect } from 'react';
import type { Settings, AudioDevice } from '../../types';

export function SettingsApp() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [openaiStatus, setOpenaiStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
    loadDevices();
    window.settingsAPI.onSettingsChanged((s) => setSettings(s));
  }, []);

  const loadSettings = async () => {
    const s = await window.settingsAPI.getSettings();
    setSettings(s);
  };

  const loadDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const d = await window.settingsAPI.getAudioDevices();
      setDevices(d);
    } catch { /* no mic permission */ }
  };

  const save = async (updates: Partial<Settings>) => {
    await window.settingsAPI.updateSettings(updates);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testOpenai = async () => {
    if (!settings?.openai_api_key) return;
    setOpenaiStatus('testing');
    const ok = await window.settingsAPI.testOpenAIKey(settings.openai_api_key);
    setOpenaiStatus(ok ? 'ok' : 'fail');
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-xs text-white/40 mt-1">FlowDan voice dictation</p>
        </div>
        {saved && (
          <span className="text-xs text-green-400 bg-green-400/10 px-3 py-1 rounded-full">Saved</span>
        )}
      </div>

      <div className="space-y-6">
        {/* API Key */}
        <section className="card">
          <h2 className="text-sm font-semibold text-white mb-4">OpenAI API Key</h2>
          <p className="text-xs text-white/40 mb-3">Used for Whisper (speech-to-text) and GPT-4o-mini (formatting)</p>
          <div className="flex gap-2">
            <input
              type="password"
              value={settings.openai_api_key || ''}
              onChange={e => setSettings({ ...settings, openai_api_key: e.target.value })}
              onBlur={() => save({ openai_api_key: settings.openai_api_key })}
              placeholder="sk-..."
              className="flex-1"
            />
            <button onClick={testOpenai} className="btn-secondary text-xs px-3" disabled={openaiStatus === 'testing'}>
              {openaiStatus === 'testing' ? '...' : openaiStatus === 'ok' ? 'OK' : openaiStatus === 'fail' ? 'Fail' : 'Test'}
            </button>
          </div>
        </section>

        {/* Recording */}
        <section className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Recording</h2>

          <div className="mb-4">
            <label className="label">Language</label>
            <select
              value={settings.language}
              onChange={e => {
                const lang = e.target.value as 'pl' | 'en';
                setSettings({ ...settings, language: lang });
                save({ language: lang });
              }}
              className="w-full"
            >
              <option value="pl">Polski</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="label">Microphone</label>
            <select
              value={settings.microphone_id || ''}
              onChange={e => {
                const id = e.target.value || null;
                setSettings({ ...settings, microphone_id: id });
                save({ microphone_id: id });
              }}
              className="w-full"
            >
              <option value="">Default microphone</option>
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${(d.deviceId || '').slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Hotkey</label>
            <input
              type="text"
              value={settings.hotkey}
              onChange={e => setSettings({ ...settings, hotkey: e.target.value })}
              onBlur={() => save({ hotkey: settings.hotkey })}
              className="w-full font-mono"
            />
            <p className="text-xs text-white/30 mt-1">Default: CommandOrControl+Shift+Space</p>
          </div>
        </section>

        {/* Preferences */}
        <section className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Preferences</h2>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_paste}
                onChange={e => {
                  setSettings({ ...settings, auto_paste: e.target.checked });
                  save({ auto_paste: e.target.checked });
                }}
                className="w-4 h-4 rounded accent-accent"
              />
              <span className="text-sm text-white/70">Auto-paste to active window</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sound_feedback}
                onChange={e => {
                  setSettings({ ...settings, sound_feedback: e.target.checked });
                  save({ sound_feedback: e.target.checked });
                }}
                className="w-4 h-4 rounded accent-accent"
              />
              <span className="text-sm text-white/70">Sound feedback</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_start}
                onChange={e => {
                  setSettings({ ...settings, auto_start: e.target.checked });
                  save({ auto_start: e.target.checked });
                }}
                className="w-4 h-4 rounded accent-accent"
              />
              <span className="text-sm text-white/70">Start with Windows</span>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
