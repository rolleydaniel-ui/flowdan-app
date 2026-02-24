/**
 * FlowDan Premium Brand Mark
 * Geometric "F" monogram with integrated voice wave motif.
 * Works at sizes 16px–64px.
 */
export function FlowDanMark({ size = 24, animate = false }: { size?: number; animate?: boolean }) {
  const id = `fm-${size}-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-g`} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7B61FF" />
          <stop offset="0.5" stopColor="#9B86FF" />
          <stop offset="1" stopColor="#00F0FF" />
        </linearGradient>
        <linearGradient id={`${id}-w`} x1="20" y1="8" x2="28" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00F0FF" stopOpacity="0.9" />
          <stop offset="1" stopColor="#00F0FF" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Rounded square background shape */}
      <rect x="2" y="2" width="28" height="28" rx="8" fill={`url(#${id}-g)`} opacity="0.12" />
      <rect x="2" y="2" width="28" height="28" rx="8" stroke={`url(#${id}-g)`} strokeWidth="1" opacity="0.3" fill="none" />

      {/* Stylized F letterform */}
      <path
        d="M9 7h8.5a2 2 0 0 1 0 4H13v3h5a1.5 1.5 0 0 1 0 3h-5v6.5a2 2 0 0 1-4 0V7z"
        fill={`url(#${id}-g)`}
        opacity="0.95"
      />

      {/* Voice wave arcs - right side */}
      <path d="M21 11.5a5 5 0 0 1 0 9" stroke={`url(#${id}-w)`} strokeWidth="1.8" strokeLinecap="round" fill="none">
        {animate && <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />}
      </path>
      <path d="M24.5 9a8.5 8.5 0 0 1 0 14" stroke={`url(#${id}-w)`} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.5">
        {animate && <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2s" repeatCount="indefinite" begin="0.3s" />}
      </path>
    </svg>
  );
}
