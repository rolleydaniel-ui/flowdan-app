import { Tray, Menu, nativeImage, app } from 'electron';

export class TrayManager {
  private tray: Tray | null = null;
  private isRecording = false;

  private onShowDashboard: () => void;

  constructor(callbacks: {
    onShowDashboard: () => void;
  }) {
    this.onShowDashboard = callbacks.onShowDashboard;
  }

  create(): void {
    const icon = this.createIcon(false);
    this.tray = new Tray(icon);
    this.tray.setToolTip('FlowDan - Voice Dictation');
    this.tray.on('double-click', () => this.onShowDashboard());
    this.updateMenu();
  }

  setRecording(recording: boolean): void {
    this.isRecording = recording;
    if (this.tray) {
      this.tray.setImage(this.createIcon(recording));
      this.tray.setToolTip(recording ? 'FlowDan - Recording...' : 'FlowDan - Voice Dictation');
    }
    this.updateMenu();
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  private updateMenu(): void {
    if (!this.tray) return;

    const menu = Menu.buildFromTemplate([
      {
        label: 'FlowDan',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: this.isRecording ? 'Recording...' : 'Ready',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Open FlowDan',
        click: this.onShowDashboard,
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit(),
      },
    ]);

    this.tray.setContextMenu(menu);
  }

  private createIcon(recording: boolean): Electron.NativeImage {
    const size = 32;
    const canvas = Buffer.alloc(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const cx = x - size / 2;
        const cy = y - size / 2;
        const dist = Math.sqrt(cx * cx + cy * cy);

        if (dist < size / 2 - 1) {
          if (recording) {
            canvas[idx] = 239;     canvas[idx + 1] = 68;
            canvas[idx + 2] = 68;  canvas[idx + 3] = 255;
          } else {
            canvas[idx] = 99;      canvas[idx + 1] = 102;
            canvas[idx + 2] = 241; canvas[idx + 3] = 255;
          }
        } else {
          canvas[idx] = 0; canvas[idx + 1] = 0;
          canvas[idx + 2] = 0; canvas[idx + 3] = 0;
        }
      }
    }

    return nativeImage.createFromBuffer(canvas, { width: size, height: size });
  }
}
