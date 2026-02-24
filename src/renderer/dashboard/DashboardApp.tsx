import React, { useState, useEffect } from 'react';
import { SettingsPanel } from './SettingsPanel';
import { HistoryPanel } from './HistoryPanel';
import { DictionaryPanel } from './DictionaryPanel';
import { OnboardingPanel } from './OnboardingPanel';
import { AccountPanel } from './AccountPanel';

type Tab = 'settings' | 'history' | 'dictionary' | 'account';

declare global {
  interface Window {
    dashboardAPI: {
      onRecordingState: (cb: (state: string) => void) => void;
      getRecordingState: () => Promise<string>;
    };
  }
}

// ─── Logo SVG (inline, matches assets/icons/logo.svg) ───

function LogoIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="logo-f" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#e0e7ff" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-bg)" />
      <path d="M18 14h8v36h-8V14z" fill="url(#logo-f)" opacity="0.95" />
      <path d="M18 14h22v7H18V14z" fill="url(#logo-f)" opacity="0.95" />
      <path d="M18 28h16v6H18V28z" fill="url(#logo-f)" opacity="0.85" />
      <path d="M44 22c3 2 5 6 5 10s-2 8-5 10" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <path d="M50 17c4 3.5 7 9 7 15s-3 11.5-7 15" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

// ─── Tab definitions ───

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'History',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'dictionary',
    label: 'Dictionary',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        <path d="M8 7h6" />
        <path d="M8 11h4" />
      </svg>
    ),
  },
  {
    id: 'account',
    label: 'Account',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="5" />
        <path d="M20 21a8 8 0 0 0-16 0" />
      </svg>
    ),
  },
];

// ─── Sidebar ───

function Sidebar({ activeTab, onTabChange, recordingState }: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  recordingState: string;
}) {
  const stateLabel = recordingState === 'recording' ? 'Recording'
    : recordingState === 'processing' ? 'Processing'
    : 'Ready';

  const dotClass = recordingState === 'recording' ? 'recording'
    : recordingState === 'processing' ? 'processing'
    : 'idle';

  return (
    <aside className="sidebar">
      {/* Draggable title area */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <LogoIcon size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.01em' }}>FlowDan</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', fontWeight: 500 }}>Voice Dictation</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Menu</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="sidebar-item-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Footer: Status + user avatar placeholder */}
      <div className="sidebar-footer">
        <div className="sidebar-status">
          <div className={`sidebar-status-dot ${dotClass}`} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>{stateLabel}</span>
        </div>
        <button
          onClick={() => onTabChange('account')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginTop: 10, padding: '6px 0',
            background: 'none', border: 'none', cursor: 'pointer',
            width: '100%', textAlign: 'left',
          }}
        >
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'rgba(99,102,241,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(129,140,248,0.6)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="8" r="5" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>Sign in</span>
        </button>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', marginTop: 6 }}>FlowDan v1.0.0</div>
      </div>
    </aside>
  );
}

// ─── Dashboard ───

export function DashboardApp() {
  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [recordingState, setRecordingState] = useState('idle');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    window.dashboardAPI.getRecordingState().then(setRecordingState);
    window.dashboardAPI.onRecordingState(setRecordingState);

    // Check first launch
    const launched = localStorage.getItem('flowdan_launched');
    if (!launched) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('flowdan_launched', '1');
    setShowOnboarding(false);
    setActiveTab('settings');
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
        <div className="content-titlebar" />
        <div className="content-scroll">
          {activeTab === 'settings' && <SettingsPanel />}
          {activeTab === 'history' && <HistoryPanel />}
          {activeTab === 'dictionary' && <DictionaryPanel />}
          {activeTab === 'account' && <AccountPanel />}
        </div>
      </main>
    </div>
  );
}
