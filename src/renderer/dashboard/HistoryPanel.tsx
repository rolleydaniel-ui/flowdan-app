import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { HistoryEntry } from '../../types';

export function HistoryPanel() {
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

  // Stats
  const stats = useMemo(() => {
    const totalWords = entries.reduce((sum, e) => sum + (e.num_words || 0), 0);
    const totalDuration = entries.reduce((sum, e) => sum + (e.duration_ms || 0), 0);
    const timeSavedMin = Math.round(totalWords / 40); // avg typing ~40 wpm
    return { totalWords, totalDuration, timeSavedMin };
  }, [entries]);

  // Group entries by date
  const getDateLabel = (ts: number) => {
    const d = new Date(ts * 1000);
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === now.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  };

  const groupedEntries = useMemo(() => {
    const groups: { label: string; entries: HistoryEntry[] }[] = [];
    let currentLabel = '';
    for (const entry of entries) {
      const label = getDateLabel(entry.timestamp);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, entries: [entry] });
      } else {
        groups[groups.length - 1].entries.push(entry);
      }
    }
    return groups;
  }, [entries]);

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '';
    const s = Math.round(ms / 1000);
    return `${s}s`;
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h1 className="panel-title">History</h1>
          <p className="panel-subtitle">{total} transcription{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={showArchived ? 'btn-primary text-xs' : 'btn-secondary text-xs'}
            style={{ padding: '7px 12px' }}
          >
            {showArchived ? 'Active' : 'Archived'}
          </button>
          {total > 0 && (
            <button onClick={clearAll} className="btn-danger text-xs" style={{ padding: '7px 12px' }}>Clear</button>
          )}
        </div>
      </div>

      {/* Stats summary */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-3" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-card-value">{total}</div>
            <div className="stat-card-label">Transcriptions</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{stats.totalWords.toLocaleString()}</div>
            <div className="stat-card-label">Words</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">~{stats.timeSavedMin}m</div>
            <div className="stat-card-label">Time saved</div>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.20)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Search transcriptions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full"
          style={{ paddingLeft: 36 }}
        />
      </div>

      {/* List with date groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {entries.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: 'rgba(255,255,255,0.12)', marginBottom: 12 }}>
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
            <p style={{ marginBottom: 4 }}>{search ? 'No matching entries' : 'No transcriptions yet'}</p>
            {!search && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Hold Ctrl+Win to start dictating</p>
            )}
          </div>
        ) : (
          groupedEntries.map(group => (
            <div key={group.label}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.30)',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                padding: '10px 0 6px',
              }}>
                {group.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {group.entries.map(entry => (
                  <div key={entry.id} className="card group" style={{ padding: 14 }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)', lineHeight: 1.6, marginBottom: 4 }}>
                          {entry.formatted_text || entry.asr_text}
                        </p>
                        {entry.formatted_text && entry.asr_text !== entry.formatted_text && (
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'JetBrains Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.asr_text}
                          </p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>
                          <span>{formatTime(entry.timestamp)}</span>
                          {entry.app_name && (
                            <span className="tag">{entry.app_name}</span>
                          )}
                          {entry.duration_ms != null && entry.duration_ms > 0 && <span>{formatDuration(entry.duration_ms)}</span>}
                          {entry.num_words != null && entry.num_words > 0 && <span>{entry.num_words}w</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 2, opacity: 0.5, transition: 'opacity 0.12s', flexShrink: 0 }} className="group-hover:opacity-100">
                        <button onClick={() => copyText(entry)} className="action-btn" title="Copy">
                          {copiedId === entry.id ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                          )}
                        </button>
                        <button
                          onClick={() => showArchived ? unarchiveEntry(entry.id) : archiveEntry(entry.id)}
                          className="action-btn"
                          title={showArchived ? 'Restore' : 'Archive'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {showArchived
                              ? <><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></>
                              : <><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></>
                            }
                          </svg>
                        </button>
                        <button onClick={() => deleteEntry(entry.id)} className="action-btn action-btn-danger" title="Delete">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
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
