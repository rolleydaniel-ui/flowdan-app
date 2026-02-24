import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { RecordingState } from '../../types';
import './overlay.css';

const NUM_BARS = 7;

export function OverlayApp() {
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [barHeights, setBarHeights] = useState<number[]>(new Array(NUM_BARS).fill(0.1));
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const animFrameRef = useRef<number>();
  const levelRef = useRef(0);

  // Smooth bar animation using requestAnimationFrame
  const animateBars = useCallback(() => {
    const level = levelRef.current;
    setBarHeights(prev => {
      return prev.map((h, i) => {
        // Each bar has slightly different target based on position
        const offset = Math.sin(Date.now() / 200 + i * 0.8) * 0.15;
        const jitter = Math.sin(Date.now() / 120 + i * 1.3) * 0.08;
        const target = level > 0.02
          ? Math.max(0.1, Math.min(1, level * 1.8 + offset + jitter))
          : 0.1;
        // Smooth interpolation
        return h + (target - h) * 0.3;
      });
    });
    animFrameRef.current = requestAnimationFrame(animateBars);
  }, []);

  useEffect(() => {
    window.overlayAPI.onRecordingStateChange((status) => {
      setState(status.state);

      if (status.state === 'recording') {
        setElapsed(0);
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    });

    window.overlayAPI.onAudioLevel((level) => {
      levelRef.current = level;
      setAudioLevel(level);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Start/stop bar animation based on state
  useEffect(() => {
    if (state === 'recording') {
      animFrameRef.current = requestAnimationFrame(animateBars);
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = undefined;
      }
      setBarHeights(new Array(NUM_BARS).fill(0.1));
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [state, animateBars]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (state === 'idle') return null;

  const isActive = audioLevel > 0.05;

  return (
    <div className="overlay-container">
      <div className={`pill ${state}`}>
        {/* FlowDan mini-logo */}
        <div className={`mini-logo ${state === 'recording' && isActive ? 'active' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="fg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#818cf8" />
                <stop offset="1" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <path d="M8 6h4v20H8V6zm0 8h10v3.5H8V14z" fill="url(#fg)" opacity="0.95" />
            <path d="M22 10c1.5 1 2.5 3 2.5 6s-1 5-2.5 6" stroke="url(#fg)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <path d="M25.5 7.5c2 1.5 3.5 4.5 3.5 8.5s-1.5 7-3.5 8.5" stroke="url(#fg)" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
          </svg>
        </div>

        {state === 'recording' ? (
          <>
            {/* Voice activity bars */}
            <div className="voice-bars">
              {barHeights.map((h, i) => (
                <div
                  key={i}
                  className={`bar ${isActive ? 'active' : ''}`}
                  style={{ height: `${Math.max(3, h * 20)}px` }}
                />
              ))}
            </div>

            {/* Timer */}
            <span className="rec-time">{formatTime(elapsed)}</span>
          </>
        ) : (
          <>
            {/* Processing state */}
            <div className="dots">
              <span className="dot" style={{ animationDelay: '0s' }} />
              <span className="dot" style={{ animationDelay: '0.15s' }} />
              <span className="dot" style={{ animationDelay: '0.3s' }} />
            </div>
            <span className="proc-text">Processing</span>
          </>
        )}
      </div>
    </div>
  );
}
