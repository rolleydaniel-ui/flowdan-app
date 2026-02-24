import { useState, useEffect } from "react";
import type { Settings, AudioDevice } from "../../types";
import { getSettings, updateSettings, listAudioDevices } from "../../types/tauri";

export function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
    loadDevices();
  }, []);

  const loadSettings = async () => {
    const s = await getSettings();
    setSettings(s);
  };

  const loadDevices = async () => {
    try {
      const d = await listAudioDevices();
      setDevices(d);
    } catch { /* no devices */ }
  };

  const save = async (updates: Partial<Settings>) => {
    const result = await updateSettings(updates);
    setSettings(result);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div style={{ width: 18, height: 18, border: "2px solid rgba(99,102,241,0.15)", borderTopColor: "rgba(99,102,241,0.5)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
      </div>
    );
  }

  // Placeholder subscription data
  const plan = "Free Trial";
  const minutesUsed = 12;
  const minutesTotal = 30;
  const usagePercent = Math.round((minutesUsed / minutesTotal) * 100);
  const daysLeft = 5;

  return (
    <div className="panel" style={{ paddingTop: 8 }}>
      <div className="panel-header">
        <div>
          <h1 className="panel-title">Settings</h1>
          <p className="panel-subtitle">Configure voice dictation</p>
        </div>
        {saved && <span className="badge-saved">Saved</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Plan & Usage */}
        <section className="card" style={{ borderColor: "rgba(245,158,11,0.12)" }}>
          <div className="card-header">
            <div className="card-icon amber">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <h2 className="card-title">Plan & Usage</h2>
              <p className="card-desc">Your subscription and usage</p>
            </div>
            <span className="badge badge-amber">{plan}</span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                {minutesUsed} / {minutesTotal} minutes used
              </span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                {daysLeft} days left
              </span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-bar-fill ${usagePercent > 80 ? "warning" : ""} ${usagePercent > 95 ? "danger" : ""}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>

          <button className="btn-amber" style={{ width: "100%", padding: "9px 18px" }}>
            Upgrade to Pro - $9.99/mo
          </button>
        </section>

        {/* Recording */}
        <section className="card">
          <div className="card-header">
            <div className="card-icon indigo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <h2 className="card-title">Voice Dictation</h2>
              <p className="card-desc">Push-to-talk microphone recording</p>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <span className="kbd">Ctrl</span>
              <span style={{ color: "rgba(255,255,255,0.1)", fontSize: 10, display: "flex", alignItems: "center" }}>+</span>
              <span className="kbd">Win</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Language</label>
              <select
                value={settings.language}
                onChange={(e) => {
                  const lang = e.target.value as "pl" | "en";
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
                value={settings.microphone_id || ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setSettings({ ...settings, microphone_id: id });
                  save({ microphone_id: id });
                }}
                className="w-full"
              >
                <option value="">System default</option>
                {devices.map((d) => (
                  <option key={d.device_id} value={d.device_id}>
                    {d.label || `Mic ${d.device_id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* AI Screen Assistant */}
        <section className="card" style={{ borderColor: settings.loopback_enabled ? "rgba(139,92,246,0.15)" : undefined }}>
          <div className="card-header">
            <div className="card-icon violet">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4H8" />
                <rect width="16" height="12" x="4" y="8" rx="2" />
                <path d="M2 14h2" />
                <path d="M20 14h2" />
                <path d="M15 13v2" />
                <path d="M9 13v2" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <h2 className="card-title">AI Screen Assistant</h2>
              <p className="card-desc">Listens to your screen audio and answers with AI</p>
            </div>
            <div className={`toggle ${settings.loopback_enabled ? "active" : ""}`}
              onClick={() => {
                const val = !settings.loopback_enabled;
                setSettings({ ...settings, loopback_enabled: val });
                save({ loopback_enabled: val });
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="toggle-knob" />
            </div>
          </div>

          {/* Feature explanation */}
          {!settings.loopback_enabled && (
            <div style={{
              background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.08)",
              borderRadius: 10, padding: 14, marginBottom: 0,
            }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "rgba(139,92,246,0.08)", display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: 6 }}>
                    Captures audio playing on your screen (meetings, videos, podcasts) and sends it to AI for instant answers.
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Trigger:</span>
                    <span className="kbd">Ctrl</span>
                    <span style={{ color: "rgba(255,255,255,0.1)", fontSize: 9 }}>+</span>
                    <span className="kbd">Shift</span>
                    <span style={{ color: "rgba(255,255,255,0.1)", fontSize: 9 }}>+</span>
                    <span className="kbd">Win</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {settings.loopback_enabled && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Hotkey display */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(139,92,246,0.04)", borderRadius: 8, padding: "8px 12px",
              }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Trigger hotkey</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <span className="kbd">Ctrl</span>
                  <span style={{ color: "rgba(255,255,255,0.1)", fontSize: 9, display: "flex", alignItems: "center" }}>+</span>
                  <span className="kbd">Shift</span>
                  <span style={{ color: "rgba(255,255,255,0.1)", fontSize: 9, display: "flex", alignItems: "center" }}>+</span>
                  <span className="kbd">Win</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Buffer duration</label>
                  <select
                    value={settings.loopback_buffer_secs}
                    onChange={(e) => {
                      const secs = parseInt(e.target.value);
                      setSettings({ ...settings, loopback_buffer_secs: secs });
                      save({ loopback_buffer_secs: secs });
                    }}
                    className="w-full"
                  >
                    <option value={30}>Last 30 seconds</option>
                    <option value={60}>Last 60 seconds</option>
                    <option value={120}>Last 2 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="label">AI instruction</label>
                  <input
                    type="text"
                    value={settings.ai_prompt}
                    onChange={(e) => setSettings({ ...settings, ai_prompt: e.target.value })}
                    onBlur={() => save({ ai_prompt: settings.ai_prompt })}
                    className="w-full"
                    placeholder="Answer concisely"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Preferences */}
        <section className="card">
          <div className="card-header">
            <div className="card-icon emerald">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
                <path d="m6.08 9.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59" />
              </svg>
            </div>
            <h2 className="card-title">Preferences</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {([
              { key: "auto_paste" as const, label: "Auto-paste to active window" },
              { key: "sound_feedback" as const, label: "Sound feedback on start/stop" },
              { key: "auto_start" as const, label: "Launch on system startup" },
            ]).map(({ key, label }) => (
              <div
                key={key}
                className="toggle-row"
                onClick={() => {
                  const val = !settings[key];
                  setSettings({ ...settings, [key]: val });
                  save({ [key]: val });
                }}
              >
                <div className={`toggle ${settings[key] ? "active" : ""}`}>
                  <div className="toggle-knob" />
                </div>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
