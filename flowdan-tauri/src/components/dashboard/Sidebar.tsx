import type { Tab } from "./DashboardApp";
import type { RecordingState } from "../../types";
import { closeApp } from "../../types/tauri";
import { FlowDanMark } from "../shared/FlowDanMark";

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  {
    id: "home",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "history",
    label: "Captures",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    id: "dictionary",
    label: "Library",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Preferences",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  recordingState: RecordingState;
}

export function Sidebar({ activeTab, onTabChange, recordingState }: SidebarProps) {
  const isRecording = recordingState === "recording";
  const isProcessing = recordingState === "processing";

  return (
    <aside className="sidebar flex flex-col justify-between h-full relative overflow-hidden bg-bg-secondary/90 border-r border-white/5 shadow-2xl">
      <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />

      <div className="flex flex-col flex-1 z-10">
        {/* Brand header */}
        <div className="sidebar-header pt-5 pb-5 px-5 flex items-center gap-2.5" data-tauri-drag-region>
          <div className="flex items-center justify-center">
            <FlowDanMark size={28} animate={isRecording} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[14px] tracking-tight text-white/90 leading-none">FlowDan</span>
            <span className="text-[9px] text-white/20 font-medium tracking-wider mt-0.5">VOICE ENGINE</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 relative group overflow-hidden ${activeTab === tab.id
                ? "text-white bg-white/5 border border-white/8"
                : "text-white/35 hover:text-white/70 hover:bg-white/[0.03] border border-transparent"
                }`}
            >
              {activeTab === tab.id && (
                <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-gradient-to-b from-[#7B61FF] to-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.5)]" />
              )}
              <span className={`flex items-center justify-center w-4 transition-colors duration-200 ${activeTab === tab.id ? "text-[#00F0FF]" : "group-hover:text-white/60"}`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 relative z-10 border-t border-white/[0.04] space-y-3">
        {/* Status */}
        <div className="flex items-center gap-2 px-1">
          <div className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${
            isRecording
              ? "bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.5)]"
              : isProcessing
                ? "bg-[#7B61FF] animate-pulse shadow-[0_0_6px_rgba(123,97,255,0.4)]"
                : "bg-[#00F0FF] shadow-[0_0_4px_rgba(0,240,255,0.3)]"
          }`} />
          <span className="text-[10px] font-medium text-white/30 tracking-wide">
            {isRecording ? "Listening" : isProcessing ? "Processing" : "Ready"}
          </span>
        </div>

        {/* User + quit */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onTabChange("account")}
            className="flex items-center gap-2 text-white/35 hover:text-white/60 transition-colors duration-150 group"
          >
            <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center group-hover:border-white/10 transition-colors">
              <span className="text-[9px] font-bold text-white/40">FD</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[11px] font-medium text-white/50 group-hover:text-white/70 transition-colors leading-tight">User</span>
              <span className="text-[9px] text-white/20 leading-tight">Free Plan</span>
            </div>
          </button>

          <button
            onClick={() => closeApp()}
            className="w-6 h-6 rounded flex items-center justify-center text-white/15 hover:text-red-400 hover:bg-red-400/10 transition-colors duration-150"
            title="Quit FlowDan"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
