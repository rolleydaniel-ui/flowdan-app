import { useState, useEffect, useCallback } from "react";
import type { DictionaryEntry } from "../../types";
import { getDictionaryEntries, addDictionaryEntry, updateDictionaryEntry, deleteDictionaryEntry, exportDictionary, importDictionary } from "../../types/tauri";

export function DictionaryPanel() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [snippetsOnly, setSnippetsOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDataMgmt, setShowDataMgmt] = useState(false);

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
    <div className="panel pt-2">
      <div className="panel-header">
        <div>
          <h1 className="panel-title">Dictionary</h1>
          <p className="panel-subtitle">{entries.length} replacement{entries.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowDataMgmt(!showDataMgmt)}
          className="btn-ghost flex items-center gap-1.5"
          style={{ padding: "6px 12px" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          Data
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`transition-transform duration-200 ${showDataMgmt ? "rotate-180" : ""}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Collapsible Data Management */}
      {showDataMgmt && (
        <div className="flex gap-2 mb-3.5" style={{ animation: "fade-in-up 0.2s ease" }}>
          <button onClick={handleExport} className="btn-ghost flex-1 flex items-center justify-center gap-2" style={{ padding: "8px 12px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            Export JSON
          </button>
          <button onClick={handleImport} className="btn-ghost flex-1 flex items-center justify-center gap-2" style={{ padding: "8px 12px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Import JSON
          </button>
        </div>
      )}

      {/* Always-visible inline add form */}
      <div className={`card mb-3.5 ${editingId ? "border-accent/15" : "border-white/[0.08]"}`}>
        <div className="flex gap-2 items-end" onKeyDown={handleKeyDown}>
          <div className="flex-1">
            <label className="label">Phrase (spoken)</label>
            <input type="text" value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="e.g., flowdan" className="w-full" />
          </div>
          <div className="flex items-center pb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" className="shrink-0 opacity-60">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </div>
          <div className="flex-1">
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
        <div className="flex items-center gap-4 mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isSnippet} onChange={(e) => setIsSnippet(e.target.checked)} className="w-3.5 h-3.5 accent-accent" />
            <span className="text-xs text-white/35">Snippet</span>
          </label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="text-[11px] py-0.5 px-2">
            <option value="">Any language</option>
            <option value="pl">PL only</option>
            <option value="en">EN only</option>
          </select>
          <span className="text-[10px] text-white/15 ml-auto">Enter to add, Esc to cancel</span>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex gap-2 mb-3.5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/15" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-[34px]" />
        </div>
        <button onClick={() => setSnippetsOnly(!snippetsOnly)} className={snippetsOnly ? "btn-primary text-xs" : "btn-ghost"} style={{ padding: "6px 10px" }}>Snippets</button>
      </div>

      {/* Entries */}
      <div className="flex flex-col gap-1">
        {entries.length === 0 ? (
          <div className="empty-state py-8">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-white/[0.08] mb-2.5">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              <path d="M8 7h6" /><path d="M8 11h4" />
            </svg>
            <p className="mb-2">{search ? "No matching entries" : "Add word replacements for better accuracy"}</p>
            {!search && (
              <div className="flex flex-col gap-1 text-[11px] text-white/[0.12]">
                <span><span className="text-accent/70">flowdan</span> &rarr; FlowDan</span>
                <span><span className="text-accent/70">javascript</span> &rarr; JavaScript</span>
                <span><span className="text-accent/70">api key</span> &rarr; API key</span>
              </div>
            )}
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className={`card group ${entry.is_snippet ? "border-accent/10" : ""}`} style={{ padding: 10 }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {/* Pill-style phrase */}
                      <span className="text-xs font-mono font-medium text-accent bg-accent/[0.08] border border-accent/15 px-2 py-0.5 rounded-md">{entry.phrase}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" className="shrink-0 opacity-40">
                        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                      </svg>
                      {/* Tag-style replacement */}
                      <span className="text-xs text-white/60">{entry.replacement}</span>
                    </div>
                    {(entry.is_snippet || entry.language || entry.frequency_used > 0) && (
                      <div className="flex items-center gap-2 mt-1">
                        {entry.is_snippet && <span className="tag tag-accent">snippet</span>}
                        {entry.language && <span className="tag">{entry.language.toUpperCase()}</span>}
                        {entry.frequency_used > 0 && <span className="text-[9px] text-white/15">Used {entry.frequency_used}x</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
