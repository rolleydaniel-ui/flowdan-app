import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import type { RecordingState } from "../types";
import { getRecordingState } from "../types/tauri";

export function useRecordingState() {
  const [state, setState] = useState<RecordingState>("idle");

  useEffect(() => {
    getRecordingState().then((s) => setState(s as RecordingState));

    const unlisten = listen<string>("recording-state-changed", (event) => {
      setState(event.payload as RecordingState);
    });

    return () => { unlisten.then((fn) => fn()); };
  }, []);

  return state;
}
