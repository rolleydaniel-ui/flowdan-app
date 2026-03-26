import { useState, useEffect, useRef } from "react";
import { hideDashboard, updateSettings, testOpenaiKey, listAudioDevices } from "../../types/tauri";
import { appDataDir } from "@tauri-apps/api/path";
import type { AudioDevice } from "../../types";
import { FlowDanMark } from "../shared/FlowDanMark";
import { Select } from "../shared/Select";

interface Props {
  onComplete: () => void;
}

export function OnboardingPanel({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [language, setLanguage] = useState("en");
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [micId, setMicId] = useState("");
  const [dataPath, setDataPath] = useState("");

  const TOTAL_STEPS = 4;

  useEffect(() => {
    listAudioDevices().then(setDevices).catch(() => {});
    appDataDir().then(setDataPath).catch(() => {});
  }, []);

  const goToStep = (next: number) => {
    setDirection(next > step ? "left" : "right");
    setStep(next);
  };

  const handleTestKey = async () => {
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

  const handleSaveAndNext = async (nextStep: number) => {
    const updates: Record<string, unknown> = {};
    if (apiKey.trim()) updates.openai_api_key = apiKey.trim();
    if (language) updates.language = language;
    if (micId) updates.microphone_id = micId;
    if (Object.keys(updates).length) {
      await updateSettings(updates as any);
    }
    goToStep(nextStep);
  };

  const animationStyle = direction === "left" ? "slide-left 0.35s ease" : "slide-right 0.35s ease";

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center font-sans"
      style={{ background: "#0a0a0c" }}
      {...({ "data-tauri-drag-region": true } as any)}
    >
      <div className="absolute top-3 right-4 flex gap-1.5 z-10">
        <button
          onClick={() => hideDashboard()}
          className="p-1 rounded text-white/15 hover:text-white/40 hover:bg-white/5 transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 11 11"><path d="M1 1l9 9M10 1l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Step 0: Welcome */}
      {step === 0 && (
        <div className="text-center max-w-[500px] px-6" style={{ animation: animationStyle }} key="step0">
          <div className="mx-auto mb-5 flex items-center justify-center">
            <FlowDanMark size={56} />
          </div>
          <h1 className="text-display text-white mb-1.5">
            Speak. <span className="gradient-text">Flow.</span> Done.
          </h1>
          <p className="text-body text-white/30 mb-9 leading-relaxed">
            Voice dictation that actually works. Press a key, speak naturally, and FlowDan types for you.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-9">
            <FeatureCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>}
              iconBg="rgba(99,102,241,0.08)"
              title="Voice to Text"
              desc="Powered by OpenAI Whisper with high accuracy"
            />
            <FeatureCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
              </svg>}
              iconBg="rgba(167,139,250,0.08)"
              title="Smart Formatting"
              desc="AI cleans up punctuation, capitalization & grammar"
            />
            <FeatureCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>}
              iconBg="rgba(16,185,129,0.08)"
              title="Auto-Paste"
              desc="Text is automatically pasted into your active app"
            />
          </div>

          <button className="btn-primary mb-3" onClick={() => goToStep(1)} style={{ padding: "11px 32px", fontSize: 14 }}>
            Get Started
          </button>
          <br />
          <button onClick={onComplete} className="bg-transparent border-none text-white/18 text-xs cursor-pointer p-1 hover:text-white/35 transition-colors">
            Skip setup
          </button>
        </div>
      )}

      {/* Step 1: API Key */}
      {step === 1 && (
        <div className="max-w-[440px] w-full px-6" style={{ animation: animationStyle }} key="step1">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Connect your API Key</h2>
            <p className="text-[13px] text-white/30 leading-relaxed">
              FlowDan uses your own OpenAI API key. Your key stays on your device.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
              placeholder="sk-proj-..."
              className="w-full"
              style={{ fontSize: 14 }}
            />

            <div className="flex gap-2">
              <button onClick={() => handleSaveAndNext(2)} className="btn-primary flex-1 py-2.5">
                {apiKey.trim() ? "Save & Continue" : "Skip for now"}
              </button>
              {apiKey.trim() && (
                <button onClick={handleTestKey} disabled={testing} className="btn-ghost px-4 py-2.5">
                  {testing ? "..." : "Test"}
                </button>
              )}
            </div>

            {testResult === "ok" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.12]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                <span className="text-xs text-emerald-400">Key is valid</span>
              </div>
            )}
            {testResult === "fail" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/[0.06] border border-red-500/[0.12]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span className="text-xs text-red-400">Invalid key</span>
              </div>
            )}

            {/* Warning */}
            <div className="rounded-xl p-3.5 bg-amber-500/[0.04] border border-amber-500/[0.1] mt-1">
              <div className="flex gap-2.5 items-start">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <p className="text-xs text-white/50 leading-relaxed mb-2">
                    Keep your API key private. Use a separate key for FlowDan. FlowDan uses very little credits — $5 is enough for months of use.
                  </p>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener"
                    className="text-xs text-[#818cf8] hover:text-[#a5b4fc] transition-colors flex items-center gap-1"
                    onClick={(e) => {
                      e.preventDefault();
                      import("@tauri-apps/plugin-shell").then(m => m.open("https://platform.openai.com/api-keys"));
                    }}
                  >
                    Get your API key at platform.openai.com
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Language & Microphone */}
      {step === 2 && (
        <div className="max-w-[440px] w-full px-6" style={{ animation: animationStyle }} key="step2">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Voice Settings</h2>
            <p className="text-[13px] text-white/30 leading-relaxed">
              Choose your language and microphone. You can change these anytime in Settings.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="label">Language</label>
              <Select
                value={language}
                options={[
                  { value: "pl", label: "Polski" },
                  { value: "en", label: "English" },
                  { value: "de", label: "Deutsch" },
                  { value: "fr", label: "Fran\u00e7ais" },
                  { value: "es", label: "Espa\u00f1ol" },
                  { value: "it", label: "Italiano" },
                  { value: "pt", label: "Portugu\u00eas" },
                  { value: "nl", label: "Nederlands" },
                  { value: "uk", label: "Ukrainian" },
                  { value: "cs", label: "Czech" },
                  { value: "sv", label: "Svenska" },
                  { value: "ja", label: "Japanese" },
                  { value: "ko", label: "Korean" },
                  { value: "zh", label: "Chinese" },
                  { value: "ru", label: "Russian" },
                  { value: "tr", label: "Turkish" },
                ]}
                onChange={setLanguage}
              />
            </div>

            <div>
              <label className="label">Microphone</label>
              <Select
                value={micId}
                options={[
                  { value: "", label: "System default" },
                  ...devices.map((d) => ({
                    value: d.device_id,
                    label: d.label || `Mic ${d.device_id.slice(0, 8)}`,
                  })),
                ]}
                onChange={setMicId}
              />
            </div>

            <button onClick={() => handleSaveAndNext(3)} className="btn-primary w-full py-2.5" style={{ fontSize: 14 }}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Ready + data info */}
      {step === 3 && (
        <div className="text-center max-w-[440px] px-6" style={{ animation: animationStyle }} key="step3">
          <div className="flex items-center justify-center gap-2 mx-auto mb-6 px-5 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <KeyCap label="Ctrl" active />
            <span className="text-white/15 text-sm">+</span>
            <KeyCap label="Win" active delayed />
          </div>

          <h2 className="text-xl font-bold text-white mb-1.5">You're all set!</h2>
          <p className="text-[13px] text-white/30 mb-6 leading-relaxed">
            Hold <strong className="text-white/50">Ctrl + Win</strong> to start recording. Release to transcribe and auto-paste. Works globally in any app.
          </p>

          {/* Data location */}
          {dataPath && (
            <div className="rounded-xl p-3.5 bg-white/[0.02] border border-white/[0.06] mb-6 text-left">
              <div className="flex gap-2.5 items-start">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-white/30 flex-shrink-0 mt-0.5">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <div>
                  <p className="text-[11px] text-white/40 mb-0.5">Your data is stored locally at:</p>
                  <p className="text-[10px] text-white/25 font-mono break-all">{dataPath}</p>
                </div>
              </div>
            </div>
          )}

          <button className="btn-primary" onClick={onComplete} style={{ padding: "11px 32px", fontSize: 14 }}>
            Start Using FlowDan
          </button>
        </div>
      )}

      {/* Step indicators */}
      <div className="absolute bottom-8 flex gap-1.5">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <button
            key={i}
            onClick={() => goToStep(i)}
            className="border-none cursor-pointer p-0 transition-all duration-300"
            style={{
              width: i === step ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i === step ? "#6366f1" : "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function FeatureCard({ icon, iconBg, title, desc }: { icon: JSX.Element; iconBg: string; title: string; desc: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    ref.current.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = "perspective(600px) rotateY(0deg) rotateX(0deg) translateY(0px)";
  };

  return (
    <div
      ref={ref}
      className="onboarding-feature-card"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transition: "transform 0.15s ease, border-color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease" }}
    >
      <div className="w-9 h-9 rounded-[10px] flex items-center justify-center mx-auto mb-2.5" style={{ background: iconBg }}>
        {icon}
      </div>
      <h3 className="text-[13px] font-semibold text-[#e4e4e7] mb-1">{title}</h3>
      <p className="text-[11px] text-white/[0.22] leading-snug">{desc}</p>
    </div>
  );
}

function KeyCap({ label, active, delayed }: { label: string; active?: boolean; delayed?: boolean }) {
  return (
    <span
      className="kbd text-sm px-3 py-1"
      style={{
        animation: active ? `keyPress 2s ease-in-out infinite ${delayed ? "0.3s" : "0s"}` : undefined,
      }}
    >
      {label}
      <style>{`
        @keyframes keyPress {
          0%, 40%, 100% { transform: translateY(0); box-shadow: 0 2px 0 rgba(0,0,0,0.3); }
          15%, 25% { transform: translateY(2px); box-shadow: 0 0 0 rgba(0,0,0,0.3); background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.3); }
        }
      `}</style>
    </span>
  );
}
