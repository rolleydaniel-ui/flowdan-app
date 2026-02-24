import React, { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    widgetAPI: {
      openDashboard: () => void;
      hideWidget: () => void;
      dragStart: (x: number, y: number) => void;
      dragMove: (x: number, y: number) => void;
      onRecordingState: (cb: (state: string) => void) => void;
      getRecordingState: () => Promise<string>;
    };
  }
}

export function WidgetApp() {
  const [state, setState] = useState('idle');
  const [hovered, setHovered] = useState(false);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    window.widgetAPI.getRecordingState().then(setState);
    window.widgetAPI.onRecordingState(setState);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = false;
    startPos.current = { x: e.screenX, y: e.screenY };
    window.widgetAPI.dragStart(e.screenX, e.screenY);

    const onMouseMove = (ev: MouseEvent) => {
      const dx = Math.abs(ev.screenX - startPos.current.x);
      const dy = Math.abs(ev.screenY - startPos.current.y);
      if (dx > 3 || dy > 3) {
        isDragging.current = true;
        window.widgetAPI.dragMove(ev.screenX, ev.screenY);
      }
    };

    const onMouseUp = () => {
      if (!isDragging.current) {
        window.widgetAPI.openDashboard();
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    window.widgetAPI.hideWidget();
  }, []);

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';

  return (
    <div
      className={`widget ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''} ${hovered ? 'hovered' : ''}`}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Glow ring */}
      <div className="widget-glow" />

      {/* Main circle */}
      <div className="widget-circle">
        {isProcessing ? (
          <div className="widget-spinner" />
        ) : (
          <svg className="widget-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
              fill="currentColor"
            />
            <path
              d="M19 10v2a7 7 0 0 1-14 0v-2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.5"
            />
            <line x1="12" x2="12" y1="19" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          </svg>
        )}
      </div>
    </div>
  );
}
