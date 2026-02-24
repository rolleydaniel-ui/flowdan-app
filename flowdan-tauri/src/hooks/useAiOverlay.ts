import { useState, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { AiResponse } from "../types";

export function useAiOverlay() {
  const [response, setResponse] = useState<AiResponse | null>(null);
  const [processing, setProcessing] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const unlistenProcessing = listen("ai-processing-start", () => {
      setProcessing(true);
      setResponse(null);
    });

    const unlistenResponse = listen<AiResponse>("ai-response", (event) => {
      setProcessing(false);
      setResponse(event.payload);

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

  const dismiss = async () => {
    setResponse(null);
    setProcessing(false);
    try {
      const win = getCurrentWindow();
      await win.hide();
    } catch { /* ignore */ }
  };

  return { response, processing, dismiss };
}
