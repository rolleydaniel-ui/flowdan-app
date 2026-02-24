import React, { useState, useEffect, useCallback } from 'react';
import type { HistoryEntry } from '../../types';

export function HistoryApp() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [total, setTotal] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [items, count] = await Promise.all([
      window.historyAPI.getHistory({ search: search || undefined, archived: showArchived, limit: 100 }),
      window.historyAPI.getHistoryCount({ search: search || undefined, archived: showArchived }),
    ]);
    setEntries(items);
    setTotal(count);
  }, [search, showArchived]);

  useEffect(() => { load(); }, [load]);

  const copyText = async (entry: HistoryEntry) => {
    await window.historyAPI.copyText(entry.formatted_text || entry.asr_text);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const deleteEntry = async (id: string) => {
    await window.historyAPI.deleteEntry(id);
    load();
  };

  const archiveEntry = async (id: string) => {
    await window.historyAPI.archiveEntry(id);
    load();
  };

  const unarchiveEntry = async (id: string) => {
    await window.historyAPI.unarchiveEntry(id);
    load();
  };

  const clearAll = async () => {
    if (confirm('Delete all history? This cannot be undone.')) {
      await window.historyAPI.clearHistory();
      load();
    }
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleString('pl-PL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '';
    const s = Math.round(ms / 1000);
    return `${s}s`;
  };

  return (
    <div className="min-h-screen bg-bg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">History</h1>
          <p className="text-xs text-white/40 mt-1">{total} entries</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={showArchived ? 'btn-primary text-xs' : 'btn-secondary text-xs'}
          >
            {showArchived ? 'Show Active' : 'Show Archived'}
          </button>
          <button onClick={clearAll} className="btn-danger text-xs">Clear All</button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search transcriptions..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full mb-4"
      />

      {/* List */}
      <div className="space-y-2">
        {entries.length === 0 ? (
          <div className="text-center py-12 text-white/30 text-sm">
            {search ? 'No matching entries' : 'No history yet. Start dictating!'}
          </div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="card group hover:border-white/10 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/90 leading-relaxed mb-1">
                    {entry.formatted_text || entry.asr_text}
                  </p>
                  {entry.formatted_text && entry.asr_text !== entry.formatted_text && (
                    <p className="text-xs text-white/30 font-mono truncate">
                      Raw: {entry.asr_text}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-white/30">
                    <span>{formatTimestamp(entry.timestamp)}</span>
                    {entry.app_name && <span>{entry.app_name}</span>}
                    {entry.duration_ms && <span>{formatDuration(entry.duration_ms)}</span>}
                    {entry.num_words && <span>{entry.num_words} words</span>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => copyText(entry)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 text-xs"
                    title="Copy"
                  >
                    {copiedId === entry.id ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => showArchived ? unarchiveEntry(entry.id) : archiveEntry(entry.id)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 text-xs"
                    title={showArchived ? 'Unarchive' : 'Archive'}
                  >
                    {showArchived ? 'Restore' : 'Archive'}
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 text-xs"
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
