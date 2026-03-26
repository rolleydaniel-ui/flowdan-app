import { useState, useEffect, useRef, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import type { AiResponse, TranscriptChunk, MeetingChatMessage } from "../../types";

// ─── Shared Markdown Renderer ───

function renderMarkdown(text: string): JSX.Element[] {
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(<pre key={`code-${i}`}><code>{codeLines.join("\n")}</code></pre>);
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) { codeLines.push(line); continue; }
    if (!line.trim()) continue;
    if (/^[-*]\s/.test(line)) {
      elements.push(<li key={`li-${i}`}>{formatInline(line.replace(/^[-*]\s/, ""))}</li>);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      elements.push(<li key={`li-${i}`}>{formatInline(line.replace(/^\d+\.\s/, ""))}</li>);
      continue;
    }
    elements.push(<p key={`p-${i}`} style={{ margin: "2px 0" }}>{formatInline(line)}</p>);
  }
  if (inCodeBlock && codeLines.length) {
    elements.push(<pre key="code-end"><code>{codeLines.join("\n")}</code></pre>);
  }
  return elements;
}

function formatInline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2]) parts.push(<strong key={match.index}>{match[2]}</strong>);
    else if (match[3]) parts.push(<code key={match.index}>{match[3]}</code>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : [text];
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Processing Dots ───

function Dots() {
  return (
    <div className="dots">
      <span className="dot" style={{ animationDelay: "0s" }} />
      <span className="dot" style={{ animationDelay: "0.15s" }} />
      <span className="dot" style={{ animationDelay: "0.3s" }} />
    </div>
  );
}

// ─── One-shot AI Mode (original popup) ───

interface OneshotMessage {
  role: "user" | "assistant" | "transcript";
  content: string;
}

function OneshotMode() {
  const [messages, setMessages] = useState<OneshotMessage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [question, setQuestion] = useState("");
  const [visible, setVisible] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout>>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clearAutoClose = useCallback(() => {
    if (dismissTimer.current) { clearTimeout(dismissTimer.current); dismissTimer.current = undefined; }
  }, []);

  const dismiss = useCallback(() => {
    setFadeOut(true);
    setTimeout(async () => {
      setMessages([]); setProcessing(false); setFadeOut(false); setVisible(false); setQuestion("");
      try { await getCurrentWindow().hide(); } catch { /* ignore */ }
    }, 200);
  }, []);

  const scheduleAutoClose = useCallback((ms: number) => {
    clearAutoClose();
    dismissTimer.current = setTimeout(() => dismiss(), ms);
  }, [clearAutoClose, dismiss]);

  useEffect(() => {
    const unlistenProcessing = listen("ai-processing-start", () => {
      setProcessing(true); setFadeOut(false); setVisible(true); setMessages([]); clearAutoClose();
    });
    const unlistenResponse = listen<AiResponse>("ai-response", (event) => {
      setProcessing(false); setVisible(true);
      const p = event.payload;
      if (p.error) { setMessages([{ role: "assistant", content: p.error }]); scheduleAutoClose(6000); }
      else {
        const nm: OneshotMessage[] = [];
        if (p.transcript) nm.push({ role: "transcript", content: p.transcript });
        if (p.response) nm.push({ role: "assistant", content: p.response });
        setMessages(prev => [...prev, ...nm]); scheduleAutoClose(20000);
      }
    });
    return () => {
      unlistenProcessing.then(fn => fn()); unlistenResponse.then(fn => fn()); clearAutoClose();
    };
  }, [clearAutoClose, scheduleAutoClose]);

  const handleAsk = async () => {
    const q = question.trim();
    if (!q) return;
    clearAutoClose();
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setQuestion(""); setProcessing(true);
    try {
      const context = messages.filter(m => m.role !== "transcript")
        .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
      const transcript = messages.find(m => m.role === "transcript")?.content || "";
      await invoke("trigger_ai_followup", { question: q, context, transcript });
    } catch (e) {
      setProcessing(false);
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${e}` }]);
    }
  };

  if (!visible && !processing) return null;

  return (
    <div className={`ai-overlay-container ${fadeOut ? "fade-out" : ""}`}>
      <div className="ai-response-card">
        <div className="ai-header">
          <span className="ai-header-title">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" />
            </svg>
            FlowDan AI
          </span>
          <button className="ai-header-dismiss" onClick={dismiss} title="Close (Esc)">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="ai-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`ai-msg ai-msg-${msg.role}`}>
              {msg.role === "transcript" ? <div className="transcript">"{msg.content}"</div>
               : msg.role === "user" ? <div className="ai-user-msg">{msg.content}</div>
               : <div className="response">{renderMarkdown(msg.content)}</div>}
            </div>
          ))}
          {processing && <div className="ai-processing-inline"><Dots /></div>}
          <div ref={messagesEndRef} />
        </div>
        {messages.length > 0 && !processing && (
          <div className="ai-input-row">
            <input type="text" value={question} onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAsk(); if (e.key === "Escape") dismiss(); }}
              onFocus={clearAutoClose} placeholder="Ask a follow-up..." className="ai-input" autoFocus />
            <button onClick={handleAsk} className="ai-send-btn" disabled={!question.trim()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Meeting Mode (side panel) ───

function MeetingMode({ onDismiss }: { onDismiss: () => void }) {
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [chatMessages, setChatMessages] = useState<MeetingChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<"recording" | "processing" | "finished">("recording");
  const [summary, setSummary] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Timer
  useEffect(() => {
    if (status === "recording") {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [chunks]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Focus input when chat opens
  useEffect(() => {
    if (showChat) inputRef.current?.focus();
  }, [showChat]);

  // Listen to events
  useEffect(() => {
    const unsub1 = listen<TranscriptChunk>("meeting-transcript-chunk", (e) => {
      if (e.payload.text) setChunks(prev => [...prev, e.payload]);
    });
    const unsub2 = listen("meeting-processing", () => {
      setStatus("processing");
    });
    const unsub3 = listen<string>("meeting-summary", (e) => {
      setSummary(e.payload);
    });
    const unsub4 = listen("meeting-finished", () => {
      setStatus("finished");
    });
    const unsub5 = listen<string>("meeting-chat-response", (e) => {
      setChatLoading(false);
      setChatMessages(prev => [...prev, { role: "assistant", content: e.payload }]);
    });

    return () => {
      unsub1.then(fn => fn());
      unsub2.then(fn => fn());
      unsub3.then(fn => fn());
      unsub4.then(fn => fn());
      unsub5.then(fn => fn());
    };
  }, []);

  const handleStop = async () => {
    setStatus("processing");
    try { await invoke("stop_meeting_session"); } catch { /* handled via events */ }
  };

  const handleDismiss = async () => {
    try {
      await invoke("dismiss_meeting");
      await getCurrentWindow().hide();
    } catch { /* ignore */ }
    onDismiss();
  };

  const handleChat = async () => {
    const q = question.trim();
    if (!q) return;
    setChatMessages(prev => [...prev, { role: "user", content: q }]);
    setQuestion("");
    setChatLoading(true);
    try {
      await invoke("meeting_chat", { question: q });
    } catch (e) {
      setChatLoading(false);
      setChatMessages(prev => [...prev, { role: "assistant", content: `Error: ${e}` }]);
    }
  };

  const hasTranscript = chunks.length > 0;

  return (
    <div className="mp">
      {/* ── Header ── */}
      <div className="mp-header">
        <div className="mp-header-left">
          <div className="mp-logo">
            <span className="mp-logo-letter">D</span>
          </div>
          <div className="mp-header-info">
            <span className="mp-header-label">Meeting</span>
            {status === "recording" && (
              <span className="mp-timer">{formatTime(elapsed)}</span>
            )}
            {status === "processing" && (
              <span className="mp-timer mp-timer-proc">Processing</span>
            )}
            {status === "finished" && (
              <span className="mp-timer">{formatTime(elapsed)}</span>
            )}
          </div>
        </div>
        <div className="mp-header-actions">
          {status === "recording" && (
            <div className="mp-rec-indicator">
              <span className="mp-rec-dot" />
              <span className="mp-rec-label">REC</span>
            </div>
          )}
          {status === "recording" && (
            <button className="mp-btn-stop" onClick={handleStop} title="Stop (Ctrl+Shift+M)">
              <svg width="10" height="10" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" /></svg>
            </button>
          )}
          {status === "finished" && (
            <button className="mp-btn-close" onClick={handleDismiss} title="Close">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Recording indicator bar ── */}
      {status === "recording" && (
        <div className="mp-rec-bar">
          <div className="mp-rec-bar-inner" />
        </div>
      )}
      {status === "processing" && (
        <div className="mp-proc-bar">
          <div className="mp-proc-bar-inner" />
        </div>
      )}

      {/* ── Transcript area ── */}
      <div className="mp-transcript" ref={transcriptRef}>
        {!hasTranscript && status === "recording" && (
          <div className="mp-empty">
            <div className="mp-empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.15">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <p className="mp-empty-text">Listening for audio...</p>
            <p className="mp-empty-sub">First transcript in ~30s</p>
          </div>
        )}
        {!hasTranscript && status === "processing" && (
          <div className="mp-empty">
            <Dots />
            <p className="mp-empty-text" style={{ marginTop: 8 }}>Generating summary...</p>
          </div>
        )}
        {chunks.map((c, i) => (
          <div key={i} className="mp-chunk">
            <span className="mp-chunk-time">{formatTime(Math.round(c.timestamp_sec))}</span>
            <span className="mp-chunk-text">{c.text}</span>
          </div>
        ))}
      </div>

      {/* ── Summary (after stop) ── */}
      {summary && (
        <div className="mp-summary">
          <div className="mp-summary-header">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>Summary</span>
          </div>
          <div className="mp-summary-body response">{renderMarkdown(summary)}</div>
        </div>
      )}

      {/* ── Chat section ── */}
      <div className="mp-chat">
        {!showChat && !chatMessages.length ? (
          <button className="mp-chat-toggle" onClick={() => setShowChat(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Ask about this meeting
          </button>
        ) : (
          <>
            {/* Chat messages */}
            {chatMessages.length > 0 && (
              <div className="mp-chat-messages">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`mp-chat-msg mp-chat-${m.role}`}>
                    {m.role === "user"
                      ? <div className="mp-chat-user">{m.content}</div>
                      : <div className="mp-chat-ai response">{renderMarkdown(m.content)}</div>
                    }
                  </div>
                ))}
                {chatLoading && <div className="mp-chat-loading"><Dots /></div>}
                <div ref={chatEndRef} />
              </div>
            )}
            {/* Input */}
            <div className="mp-chat-input">
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleChat(); if (e.key === "Escape") setShowChat(false); }}
                placeholder="Ask a question..."
                disabled={chatLoading}
              />
              <button onClick={handleChat} disabled={!question.trim() || chatLoading}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main App: switches between modes ───

export function AiOverlayApp() {
  const [mode, setMode] = useState<"idle" | "oneshot" | "meeting">("idle");

  useEffect(() => {
    const unsub1 = listen("meeting-started", () => setMode("meeting"));
    const unsub2 = listen("ai-processing-start", () => {
      setMode(prev => prev === "meeting" ? prev : "oneshot");
    });
    const unsub3 = listen("ai-response", () => {
      setMode(prev => prev === "meeting" ? prev : "oneshot");
    });

    return () => {
      unsub1.then(fn => fn());
      unsub2.then(fn => fn());
      unsub3.then(fn => fn());
    };
  }, []);

  if (mode === "meeting") return <MeetingMode onDismiss={() => setMode("idle")} />;
  return <OneshotMode />;
}
