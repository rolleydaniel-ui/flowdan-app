import { useState, useEffect, useRef, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import type { RecordingState } from "../../types";

const NUM_BARS = 12;

export function OverlayApp() {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [barHeights, setBarHeights] = useState<number[]>(new Array(NUM_BARS).fill(0.08));
  const [hidden, setHidden] = useState(false);
  const [hideUntil, setHideUntil] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const animFrameRef = useRef<number>();
  const levelRef = useRef(0);

  const animateBars = useCallback(() => {
    const level = levelRef.current;
    setBarHeights(prev =>
      prev.map((h, i) => {
        const center = (NUM_BARS - 1) / 2;
        const distFromCenter = 1 - Math.abs(i - center) / center;
        const wave = Math.sin(Date.now() / 180 + i * 0.7) * 0.12;
        const target = level > 0.02
          ? Math.max(0.08, Math.min(1, level * (1.2 + distFromCenter * 0.8) + wave))
          : 0.08;
        return h + (target - h) * 0.25;
      })
    );
    animFrameRef.current = requestAnimationFrame(animateBars);
  }, []);

  useEffect(() => {
    const unlistenState = listen<string>("recording-state-changed", (event) => {
      const newState = event.payload as RecordingState;
      setState(newState);
      if (newState === "recording") {
        setElapsed(0);
        timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
        setHidden(false);
        setShowMenu(false);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        // Ensure overlay stays full size after recording
        invoke("ensure_overlay_size").catch(() => {});
      }
    });

    const unlistenLevel = listen<number>("audio-level", (event) => {
      levelRef.current = event.payload;
      setAudioLevel(event.payload);
    });

    return () => {
      unlistenState.then((fn) => fn());
      unlistenLevel.then((fn) => fn());
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Check hide timer
  useEffect(() => {
    if (hideUntil <= 0) return;
    const check = setInterval(() => {
      if (Date.now() >= hideUntil) {
        setHidden(false);
        setHideUntil(0);
        getCurrentWindow().show().catch(() => {});
      }
    }, 5000);
    return () => clearInterval(check);
  }, [hideUntil]);

  useEffect(() => {
    if (state === "recording") {
      animFrameRef.current = requestAnimationFrame(animateBars);
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = undefined;
      }
      setBarHeights(new Array(NUM_BARS).fill(0.08));
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [state, animateBars]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Single click on idle badge toggles menu
  const handleBadgeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  // Prevent default context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleHide = () => {
    setHidden(true);
    setShowMenu(false);
    getCurrentWindow().hide().catch(() => {});
  };

  const handleHide1h = () => {
    setHidden(true);
    setHideUntil(Date.now() + 60 * 60 * 1000);
    setShowMenu(false);
    getCurrentWindow().hide().catch(() => {});
  };

  const handleCenter = async () => {
    setShowMenu(false);
    try { await invoke("center_overlay"); } catch { /* ignore */ }
  };

  const handleDrag = async () => {
    setShowMenu(false);
    try {
      await getCurrentWindow().startDragging();
    } catch { /* ignore */ }
  };

  if (hidden && state === "idle") {
    return <div className="overlay-container" />;
  }

  const isActive = audioLevel > 0.05;
  const isRecording = state === "recording";
  const isIdle = state === "idle";

  return (
    <div className="overlay-container" onContextMenu={handleContextMenu}>
      {isIdle ? (
        <>
          {showMenu ? (
            <div className="overlay-expanded-menu">
              <button className="oem-btn" onClick={handleDrag} title="Drag to move">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" />
                  <polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" />
                  <line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" />
                </svg>
              </button>
              <button className="oem-btn" onClick={handleCenter} title="Center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                </svg>
              </button>
              <button className="oem-btn" onClick={handleHide1h} title="Hide 1h">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </button>
              <button className="oem-btn" onClick={handleHide} title="Hide">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
              <div className="oem-divider" />
              <button className="oem-badge" onClick={() => setShowMenu(false)}>
                <span className="idle-badge-letter">D</span>
              </button>
            </div>
          ) : (
            <div className="idle-badge" onClick={handleBadgeClick} title="Click for options">
              <span className="idle-badge-letter">D</span>
              <div className="idle-badge-pulse" />
            </div>
          )}
        </>
      ) : (
        <div className={`pill ${isRecording ? "recording" : "processing"}`}>
          {isRecording ? (
            <>
              <div className="rec-dot" />
              <div className="voice-bars">
                {barHeights.map((h, i) => (
                  <div
                    key={i}
                    className={`bar ${isActive ? "active" : ""}`}
                    style={{ height: `${Math.max(2, h * 20)}px` }}
                  />
                ))}
              </div>
              <span className="rec-time">{formatTime(elapsed)}</span>
            </>
          ) : (
            <>
              <div className="progress-line">
                <div className="progress-line-inner" />
              </div>
              <span className="proc-text">Processing...</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
