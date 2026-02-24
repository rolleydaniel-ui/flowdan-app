import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import type { RecordingState } from "../../types";
import { FlowDanMark } from "../shared/FlowDanMark";

export function WidgetApp() {
  const [state, setState] = useState<RecordingState>("idle");
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    invoke("get_recording_state").then((s) => setState(s as RecordingState));

    const unlisten = listen<string>("recording-state-changed", (event) => {
      setState(event.payload as RecordingState);
    });

    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const isRecording = state === "recording";
  const isProcessing = state === "processing";

  const handleClick = () => {
    invoke("show_dashboard").catch(() => {});
  };

  const borderColor = isRecording
    ? "rgba(239, 68, 68, 0.5)"
    : isProcessing
      ? "rgba(123, 97, 255, 0.4)"
      : hovered
        ? "rgba(123, 97, 255, 0.3)"
        : "rgba(255, 255, 255, 0.06)";

  const shadow = isRecording
    ? "0 0 20px rgba(239, 68, 68, 0.3), 0 4px 12px rgba(0,0,0,0.4)"
    : isProcessing
      ? "0 0 18px rgba(123, 97, 255, 0.25), 0 4px 12px rgba(0,0,0,0.4)"
      : hovered
        ? "0 0 16px rgba(123, 97, 255, 0.15), 0 4px 12px rgba(0,0,0,0.4)"
        : "0 4px 12px rgba(0,0,0,0.3)";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        WebkitAppRegion: "no-drag",
      } as React.CSSProperties}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        background: "rgba(12, 12, 16, 0.88)",
        backdropFilter: "blur(20px)",
        border: `1.5px solid ${borderColor}`,
        boxShadow: shadow,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: hovered ? "scale(1.08)" : "scale(1)",
        position: "relative",
        overflow: "hidden",
      }}>
        <FlowDanMark size={26} animate={isRecording} />

        {/* Recording pulse ring */}
        {isRecording && (
          <div style={{
            position: "absolute",
            inset: -2,
            borderRadius: 14,
            border: "2px solid rgba(239, 68, 68, 0.4)",
            animation: "widget-pulse 1.5s ease-in-out infinite",
          }} />
        )}

        {/* Processing spinner */}
        {isProcessing && (
          <div style={{
            position: "absolute",
            inset: -1,
            borderRadius: 13,
            border: "2px solid transparent",
            borderTopColor: "#7B61FF",
            borderBottomColor: "#00F0FF",
            animation: "widget-spin 1.2s linear infinite",
          }} />
        )}
      </div>

      <style>{`
        @keyframes widget-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes widget-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
