import React, { useState, useEffect, useCallback } from 'react';
import type { DictionaryEntry } from '../../types';

export function DictionaryApp() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [snippetsOnly, setSnippetsOnly] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [phrase, setPhrase] = useState('');
  const [replacement, setReplacement] = useState('');
  const [isSnippet, setIsSnippet] = useState(false);
  const [language, setLanguage] = useState<string>('');

  const load = useCallback(async () => {
    const items = await window.dictionaryAPI.getEntries({
      search: search || undefined,
      snippetsOnly,
    });
    setEntries(items);
  }, [search, snippetsOnly]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setPhrase('');
    setReplacement('');
    setIsSnippet(false);
    setLanguage('');
    setShowAdd(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!phrase.trim() || !replacement.trim()) return;

    if (editingId) {
      await window.dictionaryAPI.updateEntry(editingId, {
        phrase, replacement, is_snippet: isSnippet, language: language || null,
      });
    } else {
      await window.dictionaryAPI.addEntry({
        phrase, replacement, is_snippet: isSnippet, language: language || null,
      });
    }
    resetForm();
    load();
  };

  const startEdit = (entry: DictionaryEntry) => {
    setEditingId(entry.id);
    setPhrase(entry.phrase);
    setReplacement(entry.replacement);
    setIsSnippet(entry.is_snippet);
    setLanguage(entry.language || '');
    setShowAdd(true);
  };

  const handleDelete = async (id: string) => {
    await window.dictionaryAPI.deleteEntry(id);
    load();
  };

  const handleExport = async () => {
    const json = await window.dictionaryAPI.exportEntries();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flowdan-dictionary.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const count = await window.dictionaryAPI.importEntries(text);
      alert(`Imported ${count} entries`);
      load();
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-bg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Dictionary</h1>
          <p className="text-xs text-white/40 mt-1">{entries.length} entries</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary text-xs">Export</button>
          <button onClick={handleImport} className="btn-secondary text-xs">Import</button>
          <button
            onClick={() => { resetForm(); setShowAdd(true); }}
            className="btn-primary text-xs"
          >
            + Add Entry
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search dictionary..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1"
        />
        <button
          onClick={() => setSnippetsOnly(!snippetsOnly)}
          className={snippetsOnly ? 'btn-primary text-xs' : 'btn-secondary text-xs'}
        >
          Snippets Only
        </button>
      </div>

      {/* Add/Edit form */}
      {showAdd && (
        <div className="card mb-4 border-accent/30">
          <h3 className="text-sm font-semibold text-white mb-3">
            {editingId ? 'Edit Entry' : 'New Entry'}
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label">Phrase (what you say)</label>
              <input
                type="text"
                value={phrase}
                onChange={e => setPhrase(e.target.value)}
                placeholder="e.g., flowdan"
                className="w-full"
              />
            </div>
            <div>
              <label className="label">Replacement (output)</label>
              <input
                type="text"
                value={replacement}
                onChange={e => setReplacement(e.target.value)}
                placeholder="e.g., FlowDan"
                className="w-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isSnippet}
                onChange={e => setIsSnippet(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <span className="text-xs text-white/60">Snippet (multi-word replacement)</span>
            </label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="text-xs px-2 py-1"
            >
              <option value="">Any language</option>
              <option value="pl">Polski</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary text-xs">
              {editingId ? 'Update' : 'Add'}
            </button>
            <button onClick={resetForm} className="btn-secondary text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {entries.length === 0 ? (
          <div className="text-center py-12 text-white/30 text-sm">
            {search ? 'No matching entries' : 'No dictionary entries yet.'}
          </div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="card group hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-accent">{entry.phrase}</span>
                      <span className="text-white/30">→</span>
                      <span className="text-sm text-white/80">{entry.replacement}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-white/30">
                      {entry.is_snippet && (
                        <span className="bg-accent/10 text-accent px-1.5 py-0.5 rounded text-[10px]">snippet</span>
                      )}
                      {entry.language && <span>{entry.language.toUpperCase()}</span>}
                      {entry.frequency_used > 0 && <span>Used {entry.frequency_used}x</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => startEdit(entry)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 text-xs"
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
