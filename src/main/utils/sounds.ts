import { BrowserWindow } from 'electron';

export class SoundManager {
  private overlayWindow: BrowserWindow | null = null;

  setOverlayWindow(window: BrowserWindow): void {
    this.overlayWindow = window;
  }

  playStartSound(): void {
    this.playSound('start');
  }

  playStopSound(): void {
    this.playSound('stop');
  }

  private playSound(type: 'start' | 'stop'): void {
    if (this.overlayWindow) {
      this.overlayWindow.webContents.send('play-sound', type);
    }
  }
}
