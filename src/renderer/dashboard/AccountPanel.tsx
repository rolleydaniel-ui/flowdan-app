import React, { useState } from 'react';

type AuthMode = 'signin' | 'signup';

export function AccountPanel() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn] = useState(false); // Will connect to auth service in Phase 3

  // Placeholder - logged in view
  if (isLoggedIn) {
    return (
      <div className="panel">
        <div className="panel-header">
          <div>
            <h1 className="panel-title">Account</h1>
            <p className="panel-subtitle">Manage your account</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Profile */}
          <section className="card">
            <div className="flex items-center gap-4 mb-4">
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="8" r="5" />
                  <path d="M20 21a8 8 0 0 0-16 0" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>user@example.com</div>
                <span className="badge badge-amber" style={{ marginTop: 4 }}>Free Trial</span>
              </div>
            </div>
          </section>

          {/* Usage */}
          <section className="card">
            <h2 className="card-title" style={{ marginBottom: 12 }}>Usage This Month</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="stat-card">
                <div className="stat-card-value">0</div>
                <div className="stat-card-label">Minutes used</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">30</div>
                <div className="stat-card-label">Minutes left</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">7d</div>
                <div className="stat-card-label">Trial remaining</div>
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="card">
            <div className="flex gap-2">
              <button className="btn-amber text-xs" style={{ padding: '8px 16px' }}>Manage Subscription</button>
              <button className="btn-danger text-xs" style={{ padding: '8px 16px' }}>Sign Out</button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // Sign In / Sign Up view
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h1 className="panel-title">Account</h1>
          <p className="panel-subtitle">{mode === 'signin' ? 'Sign in to your account' : 'Create a new account'}</p>
        </div>
      </div>

      <div style={{ maxWidth: 400 }}>
        <section className="card">
          {/* Google Sign In */}
          <button className="google-btn" style={{ marginBottom: 0 }}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="divider">or</div>

          {/* Email/Password form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Min. 8 characters' : 'Your password'}
                className="w-full"
              />
            </div>

            <button className="btn-primary w-full" style={{ marginTop: 4 }}>
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </div>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: 12, cursor: 'pointer' }}
            >
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </section>

        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.20)', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
          Free trial includes 30 minutes of transcription over 7 days. No credit card required.
        </p>
      </div>
    </div>
  );
}
