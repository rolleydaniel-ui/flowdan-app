import { useState, useEffect } from "react";
import type { Settings, AudioDevice } from "../../types";
import { getSettings, updateSettings, listAudioDevices } from "../../types/tauri";
import { appDataDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { Select } from "../shared/Select";

export function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [saved, setSaved] = useState(false);
  const [dataPath, setDataPath] = useState("");

  useEffect(() => {
    loadSettings();
    loadDevices();
    appDataDir().then(setDataPath).catch(() => {});
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
        <div className="w-[18px] h-[18px] border-2 border-accent/15 border-t-accent/50 rounded-full animate-spin" />
      </div>
    );
  }

  const languageOptions = [
    { value: "pl", label: "Polski" },
    { value: "en", label: "English" },
    { value: "de", label: "Deutsch" },
    { value: "fr", label: "Fran\u00e7ais" },
    { value: "es", label: "Espa\u00f1ol" },
    { value: "it", label: "Italiano" },
    { value: "pt", label: "Portugu\u00eas" },
    { value: "nl", label: "Nederlands" },
    { value: "uk", label: "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430" },
    { value: "cs", label: "\u010ce\u0161tina" },
    { value: "sv", label: "Svenska" },
    { value: "da", label: "Dansk" },
    { value: "no", label: "Norsk" },
    { value: "fi", label: "Suomi" },
    { value: "ja", label: "\u65e5\u672c\u8a9e" },
    { value: "ko", label: "\ud55c\uad6d\uc5b4" },
    { value: "zh", label: "\u4e2d\u6587" },
    { value: "ar", label: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629" },
    { value: "hi", label: "\u0939\u093f\u0928\u094d\u0926\u0940" },
    { value: "tr", label: "T\u00fcrk\u00e7e" },
    { value: "ru", label: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439" },
  ];

  const micOptions = [
    { value: "", label: "System default" },
    ...devices.map((d) => ({
      value: d.device_id,
      label: d.label || `Mic ${d.device_id.slice(0, 8)}`,
    })),
  ];

  return (
    <div className="panel pt-2">
      {saved && (
        <div className="floating-toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          Settings saved
        </div>
      )}

      <div className="panel-header">
        <div>
          <h1 className="panel-title">Settings</h1>
          <p className="panel-subtitle">Configure voice dictation</p>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
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
            <div className="flex-1">
              <h2 className="card-title">Voice Dictation</h2>
              <p className="card-desc">Push-to-talk microphone recording</p>
            </div>
            <div className="flex gap-1 items-center">
              <span className="kbd">Ctrl</span>
              <span className="text-[10px] text-white/10">+</span>
              <span className="kbd">Win</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Language</label>
              <Select
                value={settings.language}
                options={languageOptions}
                onChange={(val) => {
                  setSettings({ ...settings, language: val as string });
                  save({ language: val });
                }}
              />
            </div>
            <div>
              <label className="label">Microphone</label>
              <Select
                value={settings.microphone_id || ""}
                options={micOptions}
                onChange={(val) => {
                  const id = val || null;
                  setSettings({ ...settings, microphone_id: id });
                  save({ microphone_id: id });
                }}
              />
            </div>
          </div>
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

          <div className="flex flex-col">
            {([
              { key: "auto_paste" as const, label: "Auto-paste to active window" },
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
                <span className="text-[13px] text-white/55 flex-1">{label}</span>
                <div className={`toggle ${settings[key] ? "active" : ""}`}>
                  <div className="toggle-knob" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Data & Storage */}
        <section className="card">
          <div className="card-header">
            <div className="card-icon" style={{ background: "rgba(255,255,255,0.04)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="card-title">Data & Storage</h2>
              <p className="card-desc">Your transcriptions, settings, and vocabulary are stored locally</p>
            </div>
          </div>

          {dataPath && (
            <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-3 mb-3">
              <p className="text-[10px] text-white/25 mb-1">Storage location:</p>
              <p className="text-[11px] text-white/45 font-mono break-all leading-relaxed">{dataPath}</p>
            </div>
          )}

          <button
            className="btn-ghost w-full py-2.5 text-xs flex items-center justify-center gap-2"
            onClick={async () => {
              try { await invoke("open_data_folder"); } catch { /* ignore */ }
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <path d="M12 11v6" /><path d="M9 14l3-3 3 3" />
            </svg>
            Open data folder
          </button>
        </section>
        {/* Reset onboarding */}
        <button
          className="btn-ghost w-full py-2.5 text-xs flex items-center justify-center gap-2 text-white/30"
          onClick={() => {
            localStorage.removeItem("flowdan_launched");
            window.location.reload();
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          Run setup wizard again
        </button>
      </div>
    </div>
  );
}
