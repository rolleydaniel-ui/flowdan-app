import { useState, useEffect } from "react";
import { getSettings, updateSettings, testOpenaiKey } from "../../types/tauri";
import type { Settings } from "../../types";

export function AccountPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setApiKey(s.openai_api_key || "");
    });
  }, []);

  const handleSave = async () => {
    const key = apiKey.trim();
    await updateSettings({ openai_api_key: key || null });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    const key = apiKey.trim();
    if (!key) return;
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await testOpenaiKey(key);
      setTestResult(ok ? "ok" : "fail");
    } catch {
      setTestResult("fail");
    }
    setTesting(false);
  };

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`
    : "";

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-[18px] h-[18px] border-2 border-accent/15 border-t-accent/50 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="panel pt-2">
      {saved && (
        <div className="floating-toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          API key saved
        </div>
      )}

      <div className="panel-header">
        <div>
          <h1 className="panel-title">API Key</h1>
          <p className="panel-subtitle">Connect your OpenAI account to power voice dictation</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* API Key input */}
        <section className="card">
          <div className="card-header">
            <div className="card-icon indigo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="card-title">OpenAI API Key</h2>
              <p className="card-desc">Used for Whisper transcription and GPT formatting</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                placeholder="sk-proj-..."
                className="w-full pr-10"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/25 hover:text-white/50 transition-colors"
                title={showKey ? "Hide" : "Show"}
              >
                {showKey ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex gap-2">
              <button onClick={handleSave} className="btn-primary flex-1 py-2">
                Save Key
              </button>
              <button
                onClick={handleTest}
                disabled={!apiKey.trim() || testing}
                className="btn-ghost px-4 py-2 flex items-center gap-2"
              >
                {testing ? (
                  <div className="w-3 h-3 border border-white/20 border-t-white/50 rounded-full animate-spin" />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                Test
              </button>
            </div>

            {testResult === "ok" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.12]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                <span className="text-xs text-emerald-400">API key is valid</span>
              </div>
            )}
            {testResult === "fail" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/[0.06] border border-red-500/[0.12]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span className="text-xs text-red-400">Invalid API key</span>
              </div>
            )}
          </div>
        </section>

        {/* Info */}
        <section className="card">
          <div className="card-header">
            <div className="card-icon emerald">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
              </svg>
            </div>
            <h2 className="card-title">How it works</h2>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs text-white/40 leading-relaxed">
              FlowDan uses your own OpenAI API key for all AI features. Your key is stored locally on your device and never sent anywhere except OpenAI.
            </p>
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-accent-hover font-bold mt-px">1</span>
                <span className="text-xs text-white/35">Whisper API transcribes your voice recordings</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-accent-hover font-bold mt-px">2</span>
                <span className="text-xs text-white/35">GPT-4o-mini formats and cleans up the text</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-accent-hover font-bold mt-px">3</span>
                <span className="text-xs text-white/35">AI Screen Assistant uses GPT to answer questions about screen audio</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
