import { useState, useEffect, useCallback } from "react";
import type { HistoryEntry } from "../../types";
import { getHistory, getHistoryCount, deleteHistoryEntry, archiveHistoryEntry, unarchiveHistoryEntry, clearHistory } from "../../types/tauri";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

export function HistoryPanel() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [total, setTotal] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
  const timeSavedMin = Math.round((totalWords * 1.2) / 60); // ~1.2s per word typing vs speaking

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
    <div className="panel" style={{ paddingTop: 8 }}>
      <div className="panel-header">
        <div>
          <h1 className="panel-title">History</h1>
          <p className="panel-subtitle">{total} transcription{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={showArchived ? "btn-primary text-xs" : "btn-ghost"}
            style={{ padding: "6px 10px" }}
          >
            {showArchived ? "Show Active" : "Archived"}
          </button>
          {total > 0 && (
            <button onClick={handleClear} className="btn-danger" style={{ padding: "6px 10px" }}>Clear All</button>
          )}
        </div>
      </div>

      {/* Stats summary */}
      {entries.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
          <div className="stat-card" style={{ padding: 12 }}>
            <div className="stat-value" style={{ fontSize: 20 }}>{total}</div>
            <div className="stat-label" style={{ fontSize: 9 }}>Transcriptions</div>
          </div>
          <div className="stat-card" style={{ padding: 12 }}>
            <div className="stat-value" style={{ fontSize: 20 }}>{totalWords}</div>
            <div className="stat-label" style={{ fontSize: 9 }}>Words</div>
          </div>
          <div className="stat-card" style={{ padding: 12 }}>
            <div className="stat-value" style={{ fontSize: 20 }}>{timeSavedMin}m</div>
            <div className="stat-label" style={{ fontSize: 9 }}>Time saved</div>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.15)" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Search transcriptions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
          style={{ paddingLeft: 34 }}
        />
      </div>

      {/* Entries grouped by date */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {entries.length === 0 ? (
          <div className="empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: "rgba(255,255,255,0.08)", marginBottom: 10 }}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {group.items.map((entry) => (
                  <div key={entry.id} className="card group" style={{ padding: 12 }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, marginBottom: 3 }}>
                          {entry.formatted_text || entry.asr_text}
                        </p>
                        {entry.formatted_text && entry.asr_text !== entry.formatted_text && (
                          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                            {entry.asr_text}
                          </p>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 10, color: "rgba(255,255,255,0.22)" }}>
                          <span>{formatTimestamp(entry.timestamp)}</span>
                          {entry.app_name && <span className="tag">{entry.app_name}</span>}
                          {entry.source === "loopback" && <span className="tag tag-accent">desktop</span>}
                          {entry.duration_ms != null && entry.duration_ms > 0 && <span>{formatDuration(entry.duration_ms)}</span>}
                          {entry.num_words != null && entry.num_words > 0 && <span>{entry.num_words}w</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 1, opacity: 0.5, flexShrink: 0 }} className="group-hover:opacity-100">
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
