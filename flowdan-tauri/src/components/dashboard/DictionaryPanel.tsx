import { useState, useEffect, useCallback } from "react";
import type { DictionaryEntry } from "../../types";
import { getDictionaryEntries, addDictionaryEntry, updateDictionaryEntry, deleteDictionaryEntry, exportDictionary, importDictionary } from "../../types/tauri";

export function DictionaryPanel() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [snippetsOnly, setSnippetsOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [phrase, setPhrase] = useState("");
  const [replacement, setReplacement] = useState("");
  const [isSnippet, setIsSnippet] = useState(false);
  const [language, setLanguage] = useState("");

  const load = useCallback(async () => {
    const items = await getDictionaryEntries({ search: search || undefined, snippetsOnly });
    setEntries(items);
  }, [search, snippetsOnly]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setPhrase(""); setReplacement(""); setIsSnippet(false); setLanguage("");
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!phrase.trim() || !replacement.trim()) return;
    if (editingId) {
      await updateDictionaryEntry(editingId, { phrase, replacement, is_snippet: isSnippet, language: language || undefined });
    } else {
      await addDictionaryEntry({ phrase, replacement, is_snippet: isSnippet, language: language || null });
    }
    resetForm(); load();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && phrase.trim() && replacement.trim()) {
      handleAdd();
    } else if (e.key === "Escape") {
      resetForm();
    }
  };

  const startEdit = (entry: DictionaryEntry) => {
    setEditingId(entry.id); setPhrase(entry.phrase); setReplacement(entry.replacement);
    setIsSnippet(entry.is_snippet); setLanguage(entry.language || "");
  };

  const handleDelete = async (id: string) => { await deleteDictionaryEntry(id); load(); };

  const handleExport = async () => {
    const json = await exportDictionary();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "flowdan-dictionary.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const count = await importDictionary(text);
      alert(`Imported ${count} entries`);
      load();
    };
    input.click();
  };

  return (
    <div className="panel" style={{ paddingTop: 8 }}>
      <div className="panel-header">
        <div>
          <h1 className="panel-title">Dictionary</h1>
          <p className="panel-subtitle">{entries.length} replacement{entries.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-ghost">Export</button>
          <button onClick={handleImport} className="btn-ghost">Import</button>
        </div>
      </div>

      {/* Always-visible inline add form */}
      <div className="card" style={{ marginBottom: 14, borderColor: editingId ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.08)" }}>
        <div className="flex gap-2 items-end" onKeyDown={handleKeyDown}>
          <div style={{ flex: 1 }}>
            <label className="label">Phrase (spoken)</label>
            <input type="text" value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="e.g., flowdan" className="w-full" />
          </div>
          <div style={{ display: "flex", alignItems: "center", paddingBottom: 2 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.6 }}>
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Replacement</label>
            <input type="text" value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder="e.g., FlowDan" className="w-full" />
          </div>
          <button
            onClick={handleAdd}
            className="btn-primary"
            style={{ padding: "10px 14px", whiteSpace: "nowrap" }}
            disabled={!phrase.trim() || !replacement.trim()}
          >
            {editingId ? "Update" : "Add"}
          </button>
          {editingId && (
            <button onClick={resetForm} className="btn-ghost" style={{ padding: "10px 12px" }}>Cancel</button>
          )}
        </div>
        <div className="flex items-center gap-4" style={{ marginTop: 8 }}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isSnippet} onChange={(e) => setIsSnippet(e.target.checked)} style={{ width: 14, height: 14, accentColor: "#6366f1" }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Snippet</span>
          </label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ fontSize: 11, padding: "3px 8px" }}>
            <option value="">Any language</option>
            <option value="pl">PL only</option>
            <option value="en">EN only</option>
          </select>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", marginLeft: "auto" }}>Enter to add, Esc to cancel</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2" style={{ marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.15)" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full" style={{ paddingLeft: 34 }} />
        </div>
        <button onClick={() => setSnippetsOnly(!snippetsOnly)} className={snippetsOnly ? "btn-primary text-xs" : "btn-ghost"} style={{ padding: "6px 10px" }}>Snippets</button>
      </div>

      {/* Entries */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {entries.length === 0 ? (
          <div className="empty-state" style={{ padding: "32px 0" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: "rgba(255,255,255,0.08)", marginBottom: 10 }}>
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              <path d="M8 7h6" /><path d="M8 11h4" />
            </svg>
            <p style={{ marginBottom: 8 }}>{search ? "No matching entries" : "Add word replacements for better accuracy"}</p>
            {!search && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.12)" }}>
                <span><span style={{ color: "#818cf8" }}>flowdan</span> &rarr; FlowDan</span>
                <span><span style={{ color: "#818cf8" }}>javascript</span> &rarr; JavaScript</span>
                <span><span style={{ color: "#818cf8" }}>api key</span> &rarr; API key</span>
              </div>
            )}
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="card group" style={{ padding: 10 }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "#818cf8", fontWeight: 500 }}>{entry.phrase}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.4 }}>
                        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                      </svg>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{entry.replacement}</span>
                    </div>
                    {(entry.is_snippet || entry.language || entry.frequency_used > 0) && (
                      <div className="flex items-center gap-2" style={{ marginTop: 3 }}>
                        {entry.is_snippet && <span className="tag tag-accent">snippet</span>}
                        {entry.language && <span className="tag">{entry.language.toUpperCase()}</span>}
                        {entry.frequency_used > 0 && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)" }}>Used {entry.frequency_used}x</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 1, opacity: 0.5, flexShrink: 0 }} className="group-hover:opacity-100">
                  <button onClick={() => startEdit(entry)} className="action-btn" title="Edit">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                  </button>
                  <button onClick={() => handleDelete(entry.id)} className="action-btn action-btn-danger" title="Delete">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
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
