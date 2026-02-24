import { useState } from "react";

type View = "sign-in" | "sign-up";

export function AccountPanel() {
  const [view, setView] = useState<View>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Initialize to true for demonstration of the new expanded V5 Pro Dashboard
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  if (isLoggedIn) {
    return (
      <div className="panel" style={{ paddingTop: 8, animation: "fade-scale-in 0.4s ease-out forwards" }}>
        <div className="panel-header" style={{ marginBottom: 24 }}>
          <div>
            <h1 className="panel-title text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Account Hub</h1>
            <p className="panel-subtitle text-white/40 mt-1">Manage your FlowDan Pro subscription and workspace</p>
          </div>
          <button onClick={() => setIsLoggedIn(false)} className="btn-ghost flex items-center gap-2 px-4 py-2 hover:bg-white/5 transition-colors border-white/10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Profile & Usage */}
          <div className="md:col-span-4 flex flex-col gap-6">
            {/* Profile Card */}
            <div className="feature-card p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-accent/30 to-cyan/30 border border-white/10 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,240,255,0.1)] relative">
                <div className="absolute inset-0 rounded-full border border-cyan/20 animate-pulse-glow" />
                <span className="text-2xl font-bold text-cyan drop-shadow-md">FD</span>
              </div>
              <h2 className="text-lg font-semibold text-white/90">Pro User</h2>
              <p className="text-xs text-white/40 mb-4 tracking-wide">founder@startup.io</p>
              <div className="tag-accent w-full justify-center">FlowDan Pro Plan</div>
            </div>

            {/* Usage Radial */}
            <div className="feature-card p-6 flex flex-col items-center justify-center relative">
              <h3 className="text-sm font-semibold text-white/80 w-full text-center mb-6">Monthly Intelligence Usage</h3>
              <div className="relative w-32 h-32 flex items-center justify-center mb-2">
                {/* SVG Radial Progress: 14h / 30h (~46%) */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.05)" strokeWidth="12" fill="none" />
                  <circle cx="64" cy="64" r="56" stroke="url(#progress-grad)" strokeWidth="12" fill="none" strokeDasharray="351" strokeDashoffset="189" strokeLinecap="round" className="transition-all duration-1000" />
                  <defs>
                    <linearGradient id="progress-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#00F0FF" />
                      <stop offset="100%" stopColor="#7B61FF" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-bold text-white tracking-tighter">14<span className="text-sm text-white/40">h</span></span>
                  <span className="text-[10px] text-white/30 uppercase tracking-widest mt-1">out of 30h</span>
                </div>
              </div>
              <p className="text-xs text-center text-white/40 mt-4 leading-relaxed">
                You have <span className="text-cyan font-medium">16 hours</span> of high-speed dictation remaining this cycle.
              </p>
            </div>
          </div>

          {/* Right Column: Settings Rows */}
          <div className="md:col-span-8 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white/80 px-2 mt-2">Workspace Configuration</h3>

            {/* API Key Row */}
            <div className="feature-card p-5 flex items-center justify-between group cursor-pointer hover:border-cyan/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 group-hover:text-cyan transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white/90">OpenAI API Key</h4>
                  <p className="text-xs text-white/40 mt-0.5">sk-proj-...8x2f (Active)</p>
                </div>
              </div>
              <button className="btn-ghost text-xs px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
            </div>

            {/* Custom Vocab Row */}
            <div className="feature-card p-5 flex items-center justify-between group cursor-pointer hover:border-accent/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 group-hover:text-accent transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white/90">Custom Vocabulary</h4>
                  <p className="text-xs text-white/40 mt-0.5">142 terms (Industry Jargon, Names)</p>
                </div>
              </div>
              <button className="btn-ghost text-xs px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">Manage</button>
            </div>

            {/* Billing Row */}
            <div className="feature-card p-5 flex items-center justify-between group cursor-pointer hover:border-white/20 mt-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 group-hover:text-white transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white/90">Billing Settings</h4>
                  <p className="text-xs text-white/40 mt-0.5">Next invoice: $12.00 on Oct 24, 2026</p>
                </div>
              </div>
              <button className="btn-ghost text-xs px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">View Portal</button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel flex flex-col items-center justify-center min-h-[500px]" style={{ paddingTop: 8, animation: "fade-scale-in 0.4s ease-out forwards" }}>
      <div className="w-full max-w-[420px] feature-card p-8 flex flex-col relative overflow-hidden mx-auto mt-12">
        {/* Decorative Glow Context */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-accent/20 rounded-full blur-[40px] pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-cyan/20 rounded-full blur-[40px] pointer-events-none" />

        <div className="text-center mb-8 relative z-10">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">{view === "sign-in" ? "Welcome back" : "Create an account"}</h1>
          <p className="text-sm text-white/40">{view === "sign-in" ? "Sign in to sync your custom vocabulary and access Pro AI models." : "Start your 7-day free FlowDan Pro trial."}</p>
        </div>

        <div className="flex flex-col gap-3 relative z-10">
          {/* Social Auth */}
          <button className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/90 text-black font-semibold text-sm hover:bg-white transition-colors shadow-[0_4px_14px_rgba(255,255,255,0.1)]">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <button className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#2D2F36]/80 hover:bg-[#383A42] border border-white/10 text-white font-medium text-sm transition-colors shadow-lg">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" /></svg>
            Continue with GitHub
          </button>

          <div className="flex items-center gap-4 my-4 opacity-40">
            <div className="h-px bg-white/20 flex-1" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">or email</span>
            <div className="h-px bg-white/20 flex-1" />
          </div>

          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setIsLoggedIn(true); }}>
            <div>
              <label className="text-[11px] font-semibold tracking-wide text-white/50 mb-1.5 block px-1 uppercase">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@startup.io"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/50 transition-all shadow-inner"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold tracking-wide text-white/50 mb-1.5 block px-1 uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/50 transition-all shadow-inner"
                required
              />
            </div>

            <button type="submit" className="w-full relative overflow-hidden group bg-gradient-to-r from-accent to-cyan rounded-xl p-[1px] mt-2 shadow-[0_4px_20px_rgba(123,97,255,0.25)] hover:shadow-[0_8px_30px_rgba(0,240,255,0.3)] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-accent to-cyan opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-[#1a1b26]/80 px-4 py-3 rounded-[11px] group-hover:bg-[#1a1b26]/20 transition-colors flex items-center justify-center">
                <span className="text-sm font-bold text-white tracking-wider">{view === "sign-in" ? "Sign In to Pro" : "Unlock 7-Day Free Trial"}</span>
              </div>
            </button>
          </form>

          <p className="text-center text-xs text-white/40 mt-6">
            {view === "sign-in" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setView(view === "sign-in" ? "sign-up" : "sign-in")} className="text-cyan hover:underline hover:text-cyan/80 font-medium transition-colors">
              {view === "sign-in" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
