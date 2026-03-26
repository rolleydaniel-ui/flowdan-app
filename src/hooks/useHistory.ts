import { useState, useEffect, useCallback } from "react";
import type { HistoryEntry } from "../types";
import { getHistory, getHistoryCount } from "../types/tauri";

export function useHistory(search: string, archived: boolean) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [items, count] = await Promise.all([
      getHistory({ search: search || undefined, archived, limit: 100 }),
      getHistoryCount({ search: search || undefined, archived }),
    ]);
    setEntries(items);
    setTotal(count);
    setLoading(false);
  }, [search, archived]);

  useEffect(() => { load(); }, [load]);

  return { entries, total, loading, reload: load };
}
