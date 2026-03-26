import { useState, useEffect, useCallback } from "react";
import type { HistoryEntry } from "../../types";
import { getHistory, getHistoryCount, deleteHistoryEntry, archiveHistoryEntry, unarchiveHistoryEntry, clearHistory } from "../../types/tauri";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

type ViewMode = "active" | "archived";

export function HistoryPanel() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [total, setTotal] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showArchived = viewMode === "archived";

  const load = useCallback(async () => {
    const [items, count] = await Promise.all([
      getHistory({ search: search || undefined, archived: showArchived, limit: 100 }),
      getHistoryCount({ search: search || undefined, archived: showArchived }),
    ]);
    setEntries(items);
    setTotal(count);
  }, [search, showArchived]);

  useEffect(() => { load(); }, [load]);

  const copyText = async (entry: HistoryEntry) => {
    await writeText(entry.formatted_text || entry.asr_text);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDelete = async (id: string) => { await deleteHistoryEntry(id); load(); };
  const handleArchive = async (id: string) => { await archiveHistoryEntry(id); load(); };
  const handleUnarchive = async (id: string) => { await unarchiveHistoryEntry(id); load(); };

  const handleClear = async () => {
    if (confirm("Delete all history? This cannot be undone.")) {
      await clearHistory();
      load();
    }
  };

  // Stats
  const totalWords = entries.reduce((sum, e) => sum + (e.num_words || 0), 0);
  const totalDuration = entries.reduce((sum, e) => sum + (e.duration_ms || 0), 0);
  const timeSavedMin = Math.round((totalWords * 1.2) / 60);

  // Date grouping
  const getDateLabel = (ts: number): string => {
    const d = new Date(ts * 1000);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "short" });
  };

  const groupedEntries: { label: string; items: HistoryEntry[] }[] = [];
  let currentLabel = "";
  for (const entry of entries) {
    const label = getDateLabel(entry.timestamp);
    if (label !== currentLabel) {
      currentLabel = label;
      groupedEntries.push({ label, items: [] });
    }
    groupedEntries[groupedEntries.length - 1].items.push(entry);
  }

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "";
    return `${Math.round(ms / 1000)}s`;
  };

  return (
    <div className="panel pt-2">
      <div className="panel-header">
        <div>
          <h1 className="panel-title">History</h1>
          <p className="panel-subtitle">{total} transcription{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="segmented-control">
            <button
              onClick={() => setViewMode("active")}
              className={`segmented-btn ${viewMode === "active" ? "active" : ""}`}
            >Active</button>
            <button
              onClick={() => setViewMode("archived")}
              className={`segmented-btn ${viewMode === "archived" ? "active" : ""}`}
            >Archived</button>
          </div>
          {total > 0 && (
            <button onClick={handleClear} className="btn-danger" style={{ padding: "6px 10px" }}>Clear All</button>
          )}
        </div>
      </div>

      {/* Stats summary */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="stat-card p-3">
            <div className="stat-value text-xl">{total}</div>
            <div className="stat-label text-[9px]">Transcriptions</div>
          </div>
          <div className="stat-card p-3">
            <div className="stat-value text-xl">{totalWords}</div>
            <div className="stat-label text-[9px]">Words</div>
          </div>
          <div className="stat-card p-3">
            <div className="stat-value text-xl">{timeSavedMin}m</div>
            <div className="stat-label text-[9px]">Time saved</div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3.5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/15" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Search transcriptions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-[34px]"
        />
      </div>

      {/* Entries grouped by date */}
      <div className="flex flex-col">
        {entries.length === 0 ? (
          <div className="empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-white/[0.08] mb-2.5">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
            <p>{search ? "No matching entries" : "Hold Ctrl+Win to start dictating"}</p>
          </div>
        ) : (
          groupedEntries.map((group) => (
            <div key={group.label}>
              <div className="date-group-label">{group.label}</div>
              <div className="flex flex-col gap-1.5">
                {group.items.map((entry) => (
                  <div
                    key={entry.id}
                    className={`card group ${entry.source === "meeting" ? "source-meeting" : entry.source === "loopback" ? "source-loopback" : "source-mic"}`}
                    style={{ padding: 12, position: "relative", overflow: "hidden" }}
                  >
                    {/* Left color stripe */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl ${
                      entry.source === "meeting" ? "bg-indigo-400/60" : entry.source === "loopback" ? "bg-violet-400/60" : "bg-cyan/40"
                    }`} />

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-white/85 leading-relaxed mb-0.5">
                          {entry.formatted_text || entry.asr_text}
                        </p>
                        {entry.formatted_text && entry.asr_text !== entry.formatted_text && (
                          <p className="text-[11px] text-white/[0.18] font-mono overflow-hidden text-ellipsis whitespace-nowrap mb-0.5">
                            {entry.asr_text}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/[0.22]">
                          <span>{formatTimestamp(entry.timestamp)}</span>
                          {entry.app_name && <span className="tag">{entry.app_name}</span>}
                          {entry.source === "meeting" && <span className="tag tag-accent">meeting</span>}
                          {entry.source === "loopback" && <span className="tag tag-accent">desktop</span>}
                          {entry.duration_ms != null && entry.duration_ms > 0 && <span>{formatDuration(entry.duration_ms)}</span>}
                          {entry.num_words != null && entry.num_words > 0 && <span>{entry.num_words}w</span>}
                        </div>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => copyText(entry)} className="action-btn" title="Copy">
                          {copiedId === entry.id ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                          )}
                        </button>
                        <button onClick={() => showArchived ? handleUnarchive(entry.id) : handleArchive(entry.id)} className="action-btn" title={showArchived ? "Restore" : "Archive"}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {showArchived
                              ? <><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></>
                              : <><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></>
                            }
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(entry.id)} className="action-btn action-btn-danger" title="Delete">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
