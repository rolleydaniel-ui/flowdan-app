import { useState, useEffect, useCallback } from "react";
import type { DictionaryEntry } from "../types";
import { getDictionaryEntries } from "../types/tauri";

export function useDictionary(search: string, snippetsOnly: boolean) {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const items = await getDictionaryEntries({ search: search || undefined, snippetsOnly });
    setEntries(items);
    setLoading(false);
  }, [search, snippetsOnly]);

  useEffect(() => { load(); }, [load]);

  return { entries, loading, reload: load };
}
