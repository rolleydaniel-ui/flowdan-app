import React, { useState, useEffect } from 'react';
import type { Settings, AudioDevice } from '../../types';

export function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
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

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Placeholder subscription data (will connect to Supabase in Phase 3)
  const plan = 'Free Trial';
  const minutesUsed = 0;
  const minutesTotal = 30;
  const usagePercent = Math.round((minutesUsed / minutesTotal) * 100);
  const daysLeft = 7;

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h1 className="panel-title">Settings</h1>
          <p className="panel-subtitle">Configure voice dictation preferences</p>
        </div>
        {saved && <span className="save-badge">Saved</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Plan & Usage */}
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(245,158,11,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <h2 className="card-title">Plan & Usage</h2>
                <p className="card-desc">Manage your subscription</p>
              </div>
            </div>
            <span className="badge badge-amber">{plan}</span>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)' }}>
                {minutesUsed} / {minutesTotal} min used
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>
                {daysLeft} days left
              </span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-bar-fill ${usagePercent > 80 ? 'warning' : ''} ${usagePercent > 95 ? 'danger' : ''}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn-amber text-xs" style={{ padding: '8px 16px' }}>
              Upgrade Plan
            </button>
            <button className="btn-secondary text-xs" style={{ padding: '8px 16px' }}>
              View Plans
            </button>
          </div>
        </section>

        {/* Recording */}
        <section className="card">
          <div className="flex items-center gap-3 mb-4">
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(99,102,241,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <h2 className="card-title">Recording</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
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
            <div>
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
                <option value="">Default</option>
                {devices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Mic ${(d.deviceId || '').slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="label">Hotkey</label>
            <input
              type="text"
              value={settings.hotkey}
              onChange={e => setSettings({ ...settings, hotkey: e.target.value })}
              onBlur={() => save({ hotkey: settings.hotkey })}
              className="w-full font-mono"
              style={{ fontSize: 12 }}
            />
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.20)', marginTop: 4 }}>Hold Ctrl+Win to record (push-to-talk)</p>
          </div>
        </section>

        {/* Preferences */}
        <section className="card">
          <div className="flex items-center gap-3 mb-4">
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(99,102,241,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h2 className="card-title">Preferences</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { key: 'auto_paste' as const, label: 'Auto-paste to active window' },
              { key: 'sound_feedback' as const, label: 'Sound feedback' },
              { key: 'auto_start' as const, label: 'Start with Windows' },
            ].map(({ key, label }) => (
              <div
                key={key}
                className="toggle-row"
                onClick={() => {
                  const val = !settings[key];
                  setSettings({ ...settings, [key]: val });
                  save({ [key]: val });
                }}
              >
                <div className={`toggle ${settings[key] ? 'active' : ''}`}>
                  <div className="toggle-knob" />
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
