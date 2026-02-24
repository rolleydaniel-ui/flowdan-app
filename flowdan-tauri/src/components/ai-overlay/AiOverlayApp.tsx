import { useState, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { AiResponse } from "../../types";

export function AiOverlayApp() {
  const [response, setResponse] = useState<AiResponse | null>(null);
  const [processing, setProcessing] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const unlistenProcessing = listen("ai-processing-start", () => {
      setProcessing(true);
      setResponse(null);
      setFadeOut(false);
    });

    const unlistenResponse = listen<AiResponse>("ai-response", (event) => {
      setProcessing(false);
      setResponse(event.payload);
      setFadeOut(false);

      // Auto-dismiss after 15s
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => {
        dismiss();
      }, 15000);
    });

    return () => {
      unlistenProcessing.then((fn) => fn());
      unlistenResponse.then((fn) => fn());
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  const dismiss = () => {
    setFadeOut(true);
    setTimeout(async () => {
      setResponse(null);
      setProcessing(false);
      setFadeOut(false);
      try {
        const win = getCurrentWindow();
        await win.hide();
      } catch { /* ignore */ }
    }, 300);
  };

  if (!processing && !response) return null;

  return (
    <div className={`ai-overlay-container ${fadeOut ? "fade-out" : ""}`} onClick={dismiss}>
      {processing ? (
        <div className="ai-response-card">
          <div className="ai-processing">
            <div className="dots">
              <span className="dot" style={{ animationDelay: "0s" }} />
              <span className="dot" style={{ animationDelay: "0.15s" }} />
              <span className="dot" style={{ animationDelay: "0.3s" }} />
            </div>
            <span>Analyzing audio...</span>
          </div>
        </div>
      ) : response ? (
        <div className="ai-response-card">
          {response.error ? (
            <div className="error">{response.error}</div>
          ) : (
            <>
              {response.transcript && (
                <div className="transcript">"{response.transcript}"</div>
              )}
              <div className="response">{response.response}</div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
