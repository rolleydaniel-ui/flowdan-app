import React, { useState } from 'react';

interface OnboardingPanelProps {
  onComplete: () => void;
}

export function OnboardingPanel({ onComplete }: OnboardingPanelProps) {
  const [step, setStep] = useState<'welcome' | 'mic' | 'hotkey'>('welcome');
  const [micGranted, setMicGranted] = useState(false);

  const requestMic = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicGranted(true);
      setTimeout(() => setStep('hotkey'), 600);
    } catch {
      // Permission denied - still allow proceeding
      setStep('hotkey');
    }
  };

  return (
    <div style={{
      width: '100%', height: '100vh',
      background: '#09090b',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 400,
        background: 'radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Drag region */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 40, ...({ WebkitAppRegion: 'drag' } as any) }} />

      <div style={{ textAlign: 'center', maxWidth: 520, padding: '0 32px', position: 'relative' }}>

        {step === 'welcome' && (
          <>
            {/* Logo */}
            <div style={{ marginBottom: 24, display: 'inline-flex' }}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <defs>
                  <linearGradient id="ob-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366f1" />
                    <stop offset="1" stopColor="#8b5cf6" />
                  </linearGradient>
                  <linearGradient id="ob-f" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ffffff" />
                    <stop offset="1" stopColor="#e0e7ff" />
                  </linearGradient>
                </defs>
                <rect width="64" height="64" rx="16" fill="url(#ob-bg)" />
                <path d="M18 14h8v36h-8V14z" fill="url(#ob-f)" opacity="0.95" />
                <path d="M18 14h22v7H18V14z" fill="url(#ob-f)" opacity="0.95" />
                <path d="M18 28h16v6H18V28z" fill="url(#ob-f)" opacity="0.85" />
                <path d="M44 22c3 2 5 6 5 10s-2 8-5 10" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
                <path d="M50 17c4 3.5 7 9 7 15s-3 11.5-7 15" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
              </svg>
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em', marginBottom: 8 }}>
              FlowDan
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.40)', marginBottom: 36, fontWeight: 500 }}>
              Speak. Flow. Done.
            </p>

            {/* Feature cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 36 }}>
              <div className="onboarding-feature-card">
                <div className="onboarding-feature-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>Voice to Text</h3>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>Whisper AI transcribes your speech instantly</p>
              </div>

              <div className="onboarding-feature-card">
                <div className="onboarding-feature-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 3v18" />
                    <path d="M8 8l4-5 4 5" />
                    <path d="M4 14h16" />
                    <rect x="6" y="17" width="12" height="4" rx="1" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>Smart Format</h3>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>GPT-4o cleans up grammar and punctuation</p>
              </div>

              <div className="onboarding-feature-card">
                <div className="onboarding-feature-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M8 12h8" />
                    <path d="M12 8v8" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>Auto-Paste</h3>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>Text appears in any app automatically</p>
              </div>
            </div>

            <button onClick={() => setStep('mic')} className="btn-primary" style={{ padding: '12px 32px', fontSize: 14 }}>
              Get Started
            </button>
            <div style={{ marginTop: 12 }}>
              <button
                onClick={onComplete}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 12, cursor: 'pointer' }}
              >
                Skip setup
              </button>
            </div>
          </>
        )}

        {step === 'mic' && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: 16, margin: '0 auto 24px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(124,58,237,0.15))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {micGranted ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              )}
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.92)', marginBottom: 8 }}>
              {micGranted ? 'Microphone ready!' : 'Microphone Access'}
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', marginBottom: 28, lineHeight: 1.6 }}>
              {micGranted
                ? 'Your microphone is set up and ready to go.'
                : 'FlowDan needs microphone access to transcribe your voice.'
              }
            </p>

            {micGranted ? (
              <button onClick={() => setStep('hotkey')} className="btn-primary" style={{ padding: '12px 32px', fontSize: 14 }}>
                Continue
              </button>
            ) : (
              <button onClick={requestMic} className="btn-primary" style={{ padding: '12px 32px', fontSize: 14 }}>
                Allow Microphone
              </button>
            )}
          </>
        )}

        {step === 'hotkey' && (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: 16, margin: '0 auto 24px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(124,58,237,0.15))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.01" />
                <path d="M10 8h.01" />
                <path d="M14 8h.01" />
                <path d="M18 8h.01" />
                <path d="M8 12h.01" />
                <path d="M12 12h.01" />
                <path d="M16 12h.01" />
                <path d="M7 16h10" />
              </svg>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.92)', marginBottom: 8 }}>
              Push-to-Talk
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', marginBottom: 20, lineHeight: 1.6 }}>
              Hold the hotkey to record, release to transcribe.
            </p>

            <div style={{
              display: 'inline-flex', gap: 8, alignItems: 'center',
              padding: '14px 28px', borderRadius: 12,
              background: 'rgba(22,22,25,0.6)',
              border: '1px solid rgba(255,255,255,0.08)',
              marginBottom: 28,
            }}>
              <kbd style={{
                padding: '4px 10px', borderRadius: 6,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)',
                fontFamily: 'Inter',
              }}>Ctrl</kbd>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>+</span>
              <kbd style={{
                padding: '4px 10px', borderRadius: 6,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)',
                fontFamily: 'Inter',
              }}>Win</kbd>
            </div>

            <div>
              <button onClick={onComplete} className="btn-primary" style={{ padding: '12px 32px', fontSize: 14 }}>
                Start Using FlowDan
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
