import { useState, useEffect, useCallback } from "react";
import type { Settings } from "../types";
import { getSettings, updateSettings as updateSettingsApi } from "../types/tauri";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const s = await getSettings();
    setSettings(s);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const result = await updateSettingsApi(updates);
    setSettings(result);
    return result;
  }, []);

  return { settings, loading, updateSettings, reload: load };
}
