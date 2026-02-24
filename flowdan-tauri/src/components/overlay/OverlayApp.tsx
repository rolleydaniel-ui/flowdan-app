import { useState, useEffect, useRef, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import type { RecordingState } from "../../types";

const NUM_BARS = 7;

export function OverlayApp() {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [barHeights, setBarHeights] = useState<number[]>(new Array(NUM_BARS).fill(0.1));
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const animFrameRef = useRef<number>();
  const levelRef = useRef(0);

  const animateBars = useCallback(() => {
    const level = levelRef.current;
    setBarHeights(prev =>
      prev.map((h, i) => {
        const offset = Math.sin(Date.now() / 200 + i * 0.8) * 0.15;
        const jitter = Math.sin(Date.now() / 120 + i * 1.3) * 0.08;
        const target = level > 0.02
          ? Math.max(0.1, Math.min(1, level * 1.8 + offset + jitter))
          : 0.1;
        return h + (target - h) * 0.3;
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
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
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

  useEffect(() => {
    if (state === "recording") {
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
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (state === "idle") return null;

  const isActive = audioLevel > 0.05;
  const isRecording = state === "recording";

  return (
    <div style={styles.container}>
      <div style={styles.pill}>
        {/* Mini logo */}
        <div style={{
          ...styles.miniLogo,
          opacity: isActive ? 1 : 0.7,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <rect x="8.5" y="2" width="7" height="11" rx="3.5" fill="url(#pg)" />
            <path d="M5.5 12v1a6.5 6.5 0 0 0 13 0v-1" stroke="#00F0FF" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="12" y1="19.5" x2="12" y2="22" stroke="#00F0FF" strokeWidth="1.8" strokeLinecap="round" />
            <defs>
              <linearGradient id="pg" x1="8.5" y1="2" x2="15.5" y2="13" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7B61FF" />
                <stop offset="1" stopColor="#00F0FF" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {isRecording ? (
          <>
            {/* Voice bars */}
            <div style={styles.voiceBars}>
              {barHeights.map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: 2.5,
                    minHeight: 3,
                    height: `${Math.max(3, h * 18)}px`,
                    borderRadius: 1.5,
                    background: isActive
                      ? "rgba(0, 240, 255, 0.7)"
                      : "rgba(255, 255, 255, 0.2)",
                    transition: "background 0.15s ease",
                  }}
                />
              ))}
            </div>
            {/* Timer */}
            <span style={styles.timer}>{formatTime(elapsed)}</span>
          </>
        ) : (
          <>
            {/* Processing dots */}
            <div style={styles.dots}>
              {[0, 0.15, 0.3].map((delay, i) => (
                <span key={i} style={{
                  ...styles.dot,
                  animationDelay: `${delay}s`,
                }} />
              ))}
            </div>
            <span style={styles.procText}>Processing</span>
          </>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-4px); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Satoshi', 'Inter', system-ui, sans-serif",
    pointerEvents: "none",
  },
  pill: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    borderRadius: 50,
    background: "rgba(12, 12, 16, 0.92)",
    backdropFilter: "blur(20px)",
    border: "none",
    boxShadow: "none",
  },
  miniLogo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    borderRadius: 6,
    flexShrink: 0,
    background: "rgba(123, 97, 255, 0.15)",
    transition: "opacity 0.2s ease",
  },
  voiceBars: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    height: 18,
  },
  timer: {
    fontSize: 12,
    fontWeight: 500,
    color: "rgba(255, 255, 255, 0.45)",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "0.5px",
  },
  dots: {
    display: "flex",
    alignItems: "center",
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: "50%",
    background: "#818cf8",
    animation: "bounce 0.8s ease-in-out infinite",
  },
  procText: {
    fontSize: 11,
    fontWeight: 500,
    color: "rgba(255, 255, 255, 0.35)",
  },
};
