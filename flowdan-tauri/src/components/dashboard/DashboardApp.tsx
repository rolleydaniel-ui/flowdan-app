import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Sidebar } from "./Sidebar";
import { HomePanel } from "./HomePanel";
import { SettingsPanel } from "./SettingsPanel";
import { HistoryPanel } from "./HistoryPanel";
import { DictionaryPanel } from "./DictionaryPanel";
import { OnboardingPanel } from "./OnboardingPanel";
import { AccountPanel } from "./AccountPanel";
import { getRecordingState, hideDashboard } from "../../types/tauri";
import type { RecordingState } from "../../types";

export type Tab = "home" | "settings" | "history" | "dictionary" | "account";

const PANEL_TITLES: Record<Tab, string> = {
  home: "Dashboard",
  settings: "Preferences",
  history: "Captures",
  dictionary: "Library",
  account: "Account",
};

export function DashboardApp() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    getRecordingState().then((s) => setRecordingState(s as RecordingState));

    const launched = localStorage.getItem("flowdan_launched");
    if (!launched) {
      setShowOnboarding(true);
    }

    const unlisten = listen<string>("recording-state-changed", (event) => {
      setRecordingState(event.payload as RecordingState);
    });

    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem("flowdan_launched", "1");
    setShowOnboarding(false);
  };

  const handleMinimize = async () => {
    try {
      await hideDashboard();
    } catch {
      const win = getCurrentWindow();
      await win.hide();
    }
  };

  const handleClose = async () => {
    try {
      await hideDashboard();
    } catch {
      const win = getCurrentWindow();
      await win.hide();
    }
  };

  if (showOnboarding) {
    return <OnboardingPanel onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="dashboard">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        recordingState={recordingState}
      />
      <main className="dashboard-content">
        <div className="content-titlebar" data-tauri-drag-region>
          <span className="titlebar-label">{PANEL_TITLES[activeTab]}</span>
          <div className="win-controls">
            <button className="win-btn" onClick={handleMinimize} title="Minimize to tray">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect y="4.5" width="10" height="1.2" rx="0.6" fill="currentColor"/>
              </svg>
            </button>
            <button className="win-btn win-btn-close" onClick={handleClose} title="Close to tray">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="content-scroll">
          {activeTab === "home" && <HomePanel recordingState={recordingState} />}
          {activeTab === "settings" && <SettingsPanel />}
          {activeTab === "history" && <HistoryPanel />}
          {activeTab === "dictionary" && <DictionaryPanel />}
          {activeTab === "account" && <AccountPanel />}
        </div>
      </main>
    </div>
  );
}
