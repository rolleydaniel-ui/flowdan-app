import { useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import type { RecordingState, HistoryEntry } from "../../types";
import { getHistory, getHistoryCount } from "../../types/tauri";
import { FlowDanMark } from "../shared/FlowDanMark";

interface Props {
  recordingState: RecordingState;
}

export function HomePanel({ recordingState }: Props) {
  const [recent, setRecent] = useState<HistoryEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const loadStats = useCallback(async () => {
    const [items, count] = await Promise.all([
      getHistory({ limit: 5 }),
      getHistoryCount({}),
    ]);
    setRecent(items);
    setTotalCount(count);

    const words = items.reduce((sum, e) => sum + (e.num_words || 0), 0);
    const duration = items.reduce((sum, e) => sum + (e.duration_ms || 0), 0);
    setTotalWords(words);
    setTotalDuration(duration);
  }, []);

  useEffect(() => {
    loadStats();

    const unlistenLevel = listen<number>("audio-level", (e) => {
      setAudioLevel(e.payload);
    });

    const unlistenState = listen<string>("recording-state-changed", () => {
      setTimeout(loadStats, 500);
    });

    return () => {
      unlistenLevel.then((fn) => fn());
      unlistenState.then((fn) => fn());
    };
  }, [loadStats]);

  const formatTime = (ms: number) => {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts * 1000);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "short" });
  };

  const isRecording = recordingState === "recording";
  const isProcessing = recordingState === "processing";

  const bars = Array.from({ length: 32 }, (_, i) => {
    if (!isRecording) return 3;
    const wave = Math.sin(Date.now() / 200 + i * 0.4) * 0.4;
    const jitter = Math.sin(Date.now() / 100 + i * 1.5) * 0.2;
    return Math.max(3, (audioLevel * 1.8 + wave + jitter) * 36);
  });

  return (
    <div className="home-panel">
      {/* Hero */}
      <div className="hero-section">
        <div className="hero-ambient-glow" />

        <div className="hero-orb-wrap">
          <div className={`hero-orb has-border-ring ${isRecording ? 'recording' : isProcessing ? 'processing' : ''}`}>
            <div className="hero-orb-border-ring" />
            <FlowDanMark size={36} animate={isRecording || isProcessing} />
          </div>
        </div>

        <h1 className="hero-title">
          {isRecording ? "Listening..." : isProcessing ? (
            <span className="gradient-text">Processing...</span>
          ) : <span className="gradient-text">FlowDan</span>}
        </h1>
        <p className="hero-sub">
          {isRecording ? "Speak naturally, release to finish" : isProcessing ? "Applying AI formatting" : "Voice dictation powered by edge AI"}
        </p>

        {/* Waveform */}
        <div className="hero-waveform">
          {bars.map((h, i) => (
            <div
              key={i}
              className={`hero-bar ${isRecording ? 'active' : ''}`}
              style={{
                height: `${h}px`,
                /* clean bar, no glow */
              }}
            />
          ))}
        </div>

        {/* Hotkeys */}
        {!isRecording && !isProcessing && (
          <div className="hero-hotkeys">
            <div className="hotkey-group">
              <span className="kbd">Ctrl</span><span className="hotkey-plus">+</span><span className="kbd">Win</span>
              <span className="hotkey-label">Hold to dictate</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card-sm">
          <div className="stat-icon indigo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              <path d="M8 7h6" /><path d="M8 11h8" />
            </svg>
          </div>
          <div className="stat-data">
            <span className="stat-num">{totalCount}</span>
            <span className="stat-lbl">Notes</span>
          </div>
        </div>
        <div className="stat-card-sm">
          <div className="stat-icon cyan">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M17 10H3M21 6H3M21 14H3M17 18H3" />
            </svg>
          </div>
          <div className="stat-data">
            <span className="stat-num">{totalWords}</span>
            <span className="stat-lbl">Words</span>
          </div>
        </div>
        <div className="stat-card-sm">
          <div className="stat-icon amber">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-data">
            <span className="stat-num">{formatTime(totalDuration)}</span>
            <span className="stat-lbl">Recorded</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-section">
        <div className="recent-header">
          <h2 className="recent-title">Recent Activity</h2>
        </div>

        {recent.length === 0 ? (
          <div className="recent-empty">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="recent-empty-icon">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
            <p className="recent-empty-text">Hold <strong>Ctrl+Win</strong> and speak to capture your first note.</p>
          </div>
        ) : (
          <div className="recent-list">
            {recent.map((entry) => (
              <div
                key={entry.id}
                className={`recent-item group ${entry.source === "loopback" ? "source-loopback" : "source-mic"}`}
              >
                <p className="recent-text">
                  {(entry.formatted_text || entry.asr_text).slice(0, 140)}
                  {(entry.formatted_text || entry.asr_text).length > 140 ? "..." : ""}
                </p>
                <div className="recent-meta">
                  <span className="recent-time">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    {formatTimestamp(entry.timestamp)}
                  </span>
                  {entry.app_name && <span className="recent-app">{entry.app_name}</span>}
                  {entry.num_words != null && entry.num_words > 0 && (
                    <span className="recent-words">{entry.num_words} words</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
