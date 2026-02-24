import { uIOhook, UiohookKey } from 'uiohook-napi';

export class HotkeyManager {
  private onKeyDown: (() => void) | null = null;
  private onKeyUp: (() => void) | null = null;
  private started = false;

  // Track which keys are currently held
  private keysHeld = new Set<number>();

  // Target keys: Left Ctrl + Left Meta (Windows key)
  private targetKeys = new Set([UiohookKey.Ctrl, UiohookKey.Meta]);

  register(
    _hotkey: string, // kept for interface compat, ignored
    callbacks: { onDown: () => void; onUp: () => void },
  ): boolean {
    this.onKeyDown = callbacks.onDown;
    this.onKeyUp = callbacks.onUp;

    if (!this.started) {
      uIOhook.on('keydown', (e) => {
        const wasActive = this.areTargetKeysHeld();
        this.keysHeld.add(e.keycode);
        const isActive = this.areTargetKeysHeld();

        // Just became active → fire onDown
        if (!wasActive && isActive && this.onKeyDown) {
          this.onKeyDown();
        }
      });

      uIOhook.on('keyup', (e) => {
        const wasActive = this.areTargetKeysHeld();
        this.keysHeld.delete(e.keycode);
        const isActive = this.areTargetKeysHeld();

        // Just became inactive → fire onUp
        if (wasActive && !isActive && this.onKeyUp) {
          this.onKeyUp();
        }
      });

      uIOhook.start();
      this.started = true;
      console.log('[FlowDan] Keyboard hooks active (Ctrl+Win push-to-talk)');
    }

    return true;
  }

  private areTargetKeysHeld(): boolean {
    for (const key of this.targetKeys) {
      if (!this.keysHeld.has(key)) return false;
    }
    return true;
  }

  updateHotkey(_newHotkey: string): boolean {
    // Currently hardcoded to Ctrl+Win, ignore hotkey string
    return true;
  }

  unregister(): void {
    // Keep hooks running, just clear callbacks
    this.onKeyDown = null;
    this.onKeyUp = null;
  }

  unregisterAll(): void {
    this.onKeyDown = null;
    this.onKeyUp = null;
    if (this.started) {
      uIOhook.stop();
      this.started = false;
    }
  }
}
