import { useState } from "react";
import { hideDashboard } from "../../types/tauri";

interface Props {
  onComplete: () => void;
}

export function OnboardingPanel({ onComplete }: Props) {
  const [step, setStep] = useState(0);

  const Logo = () => (
    <div style={{
      width: 56, height: 56, borderRadius: 16,
      background: "linear-gradient(135deg, rgba(123,97,255,0.15) 0%, rgba(0,240,255,0.1) 100%)",
      border: "1px solid rgba(123,97,255,0.2)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 4px 24px rgba(123,97,255,0.2)",
      margin: "0 auto 20px",
    }}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="12" y="4" width="8" height="14" rx="4" fill="url(#ob-grad)" />
        <path d="M8 16v2a8 8 0 0 0 16 0v-2" stroke="#00F0FF" strokeWidth="2" strokeLinecap="round" fill="none" />
        <line x1="16" y1="26" x2="16" y2="29" stroke="#00F0FF" strokeWidth="2" strokeLinecap="round" />
        <defs>
          <linearGradient id="ob-grad" x1="12" y1="4" x2="20" y2="18" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7B61FF" />
            <stop offset="1" stopColor="#00F0FF" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );

  return (
    <div
      style={{
        width: "100vw", height: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", background: "#0a0a0c",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      {...({ "data-tauri-drag-region": true } as any)}
    >
      {/* Window controls */}
      <div style={{ position: "absolute", top: 12, right: 16, display: "flex", gap: 6, zIndex: 10 }}>
        <button
          onClick={() => hideDashboard()}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.15)", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex" }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11"><path d="M1 1l9 9M10 1l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>

      {step === 0 && (
        <div style={{ textAlign: "center", maxWidth: 500, padding: "0 24px", animation: "slide-up 0.4s ease" }}>
          <Logo />
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: "#fafafa", marginBottom: 6 }}>
            Speak. Flow. Done.
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginBottom: 36, lineHeight: 1.5 }}>
            Voice dictation that actually works. Press a key, speak naturally, and FlowDan types for you.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 36 }}>
            <div className="onboarding-feature-card">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                </svg>
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7", marginBottom: 4 }}>Voice to Text</h3>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", lineHeight: 1.4 }}>Powered by OpenAI Whisper with high accuracy</p>
            </div>
            <div className="onboarding-feature-card">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(167,139,250,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" x2="8" y1="13" y2="13" />
                  <line x1="16" x2="8" y1="17" y2="17" />
                </svg>
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7", marginBottom: 4 }}>Smart Formatting</h3>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", lineHeight: 1.4 }}>AI cleans up punctuation, capitalization & grammar</p>
            </div>
            <div className="onboarding-feature-card">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(16,185,129,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7", marginBottom: 4 }}>Auto-Paste</h3>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", lineHeight: 1.4 }}>Text is automatically pasted into your active app</p>
            </div>
          </div>

          <button className="btn-primary" onClick={() => setStep(1)} style={{ padding: "11px 32px", fontSize: 14, marginBottom: 12 }}>
            Get Started
          </button>
          <br />
          <button
            onClick={onComplete}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.18)", fontSize: 12, cursor: "pointer", padding: 4 }}
          >
            Skip setup
          </button>
        </div>
      )}

      {step === 1 && (
        <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px", animation: "slide-up 0.4s ease" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", margin: "0 auto 20px",
            background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.03) 70%)",
            border: "1px solid rgba(99,102,241,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 6 }}>Microphone Access</h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginBottom: 28, lineHeight: 1.5 }}>
            FlowDan needs access to your microphone for voice dictation. Your audio is processed and never stored.
          </p>

          <button className="btn-primary" onClick={() => setStep(2)} style={{ padding: "11px 32px", fontSize: 14, marginBottom: 10 }}>
            Allow Microphone
          </button>
          <br />
          <button onClick={() => setStep(2)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.18)", fontSize: 12, cursor: "pointer", padding: 4 }}>
            I'll do this later
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px", animation: "slide-up 0.4s ease" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            margin: "0 auto 24px", padding: "12px 20px", borderRadius: 12,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <span className="kbd" style={{ fontSize: 14, padding: "4px 12px" }}>Ctrl</span>
            <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 14 }}>+</span>
            <span className="kbd" style={{ fontSize: 14, padding: "4px 12px" }}>Win</span>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 6 }}>Hold to Record</h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginBottom: 8, lineHeight: 1.5 }}>
            Press and hold <strong style={{ color: "rgba(255,255,255,0.5)" }}>Ctrl + Win</strong> to start recording. Release to transcribe and auto-paste.
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", marginBottom: 32, lineHeight: 1.4 }}>
            Works globally in any application. FlowDan runs in the system tray.
          </p>

          <button className="btn-primary" onClick={onComplete} style={{ padding: "11px 32px", fontSize: 14 }}>
            Start Using FlowDan
          </button>
        </div>
      )}

      {/* Step indicators */}
      <div style={{ position: "absolute", bottom: 32, display: "flex", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: i === step ? 20 : 6, height: 6, borderRadius: 3,
            background: i === step ? "#6366f1" : "rgba(255,255,255,0.08)",
            transition: "all 0.3s ease",
          }} />
        ))}
      </div>
    </div>
  );
}
