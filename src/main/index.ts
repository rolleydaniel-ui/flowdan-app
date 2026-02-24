import { app, ipcMain, BrowserWindow, shell, powerMonitor } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { initDatabase, closeDatabase } from './database';
import { SettingsRepo } from './database/repositories/settings';
import { HistoryRepo } from './database/repositories/history';
import { DictionaryRepo } from './database/repositories/dictionary';
import { OpenAIService } from './services/openai';
import { TextInjectionService } from './services/text-injection';
import { ActiveWindowService } from './services/active-window';
import { TrayManager } from './utils/tray';
import { HotkeyManager } from './utils/hotkeys';
import { createOverlayWindow } from './windows/overlay';
import { createDashboardWindow } from './windows/dashboard';
import { registerSettingsIPC } from './ipc/settings-ipc';
import { registerHistoryIPC } from './ipc/history-ipc';
import { registerDictionaryIPC } from './ipc/dictionary-ipc';
import type { RecordingState, Settings } from '../types';

if (require('electron-squirrel-startup')) {
  app.quit();
}

app.setAppUserModelId('com.flowdan.app');

process.on('uncaughtException', (error) => {
  console.error('[FlowDan] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FlowDan] Unhandled rejection:', reason);
});

class FlowDanApp {
  private settingsRepo = new SettingsRepo();
  private historyRepo = new HistoryRepo();
  private dictionaryRepo = new DictionaryRepo();

  private textInjection = new TextInjectionService();
  private activeWindow = new ActiveWindowService();
  private hotkeyManager = new HotkeyManager();
  private trayManager!: TrayManager;

  private openai: OpenAIService | null = null;

  private overlayWindow!: BrowserWindow;
  private dashboardWindow!: BrowserWindow;

  private recordingState: RecordingState = 'idle';
  private recordingStartTime = 0;
  private processingTimeout: ReturnType<typeof setTimeout> | null = null;

  async init(): Promise<void> {
    const gotLock = app.requestSingleInstanceLock();
    if (!gotLock) {
      app.quit();
      return;
    }

    app.on('second-instance', () => {
      this.showDashboard();
    });

    await app.whenReady();
    await this.start();
  }

  private async start(): Promise<void> {
    await initDatabase();

    this.overlayWindow = createOverlayWindow();
    this.dashboardWindow = createDashboardWindow();

    this.trayManager = new TrayManager({
      onShowDashboard: () => this.showDashboard(),
    });
    this.trayManager.create();

    this.registerIPC();

    const settings = this.settingsRepo.getSettings();
    this.setupHotkey();
    this.initServices(settings);

    app.on('window-all-closed', () => { /* tray */ });

    app.on('will-quit', () => {
      this.hotkeyManager.unregisterAll();
      this.trayManager.destroy();
      closeDatabase();
    });

    powerMonitor.on('resume', () => {
      console.log('[FlowDan] System resumed from sleep, restarting hotkey hooks');
      try {
        this.hotkeyManager.unregisterAll();
      } catch (e) {
        console.error('[FlowDan] Error stopping old hooks:', e);
      }
      setTimeout(() => this.setupHotkey(), 1000);
    });

    this.createDesktopShortcut();

    // Always show dashboard on startup (product mode)
    setTimeout(() => this.showDashboard(), 500);
  }

  private showDashboard(): void {
    if (this.dashboardWindow.isMinimized()) this.dashboardWindow.restore();
    this.dashboardWindow.show();
    this.dashboardWindow.focus();
  }

  private initServices(settings: Settings): void {
    if (settings.openai_api_key) {
      this.openai = new OpenAIService(settings.openai_api_key, settings.language);
    }
  }

  private registerIPC(): void {
    registerSettingsIPC(this.settingsRepo, (s) => this.onSettingsChanged(s));
    registerHistoryIPC(this.historyRepo);
    registerDictionaryIPC(this.dictionaryRepo);

    ipcMain.handle('recording:get-state', () => this.recordingState);

    ipcMain.handle('recording:process-audio', async (_event, audioData: ArrayBuffer) => {
      await this.processAudio(Buffer.from(audioData));
    });
  }

  private setupHotkey(): void {
    try {
      this.hotkeyManager.register('Ctrl+Win', {
        onDown: () => this.startRecording(),
        onUp: () => this.stopRecording(),
      });
    } catch (error) {
      console.error('[FlowDan] Hotkey registration failed, retrying in 3s:', error);
      setTimeout(() => this.setupHotkey(), 3000);
    }
  }

  private broadcastRecordingState(state: RecordingState): void {
    const status = { state };
    // Only send to overlay and dashboard
    for (const win of [this.overlayWindow, this.dashboardWindow]) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('recording-state', status);
      }
    }
  }

  private startRecording(): void {
    if (this.recordingState !== 'idle') return;

    const settings = this.settingsRepo.getSettings();

    if (!settings.openai_api_key) {
      this.showDashboard();
      return;
    }

    this.recordingState = 'recording';
    this.recordingStartTime = Date.now();

    this.overlayWindow.show();
    this.broadcastRecordingState('recording');
    this.overlayWindow.webContents.send('start-audio-capture', settings.microphone_id);

    if (settings.sound_feedback) {
      this.overlayWindow.webContents.send('play-sound', 'start');
    }

    this.trayManager.setRecording(true);
    console.log('[FlowDan] Recording started (Ctrl+Win held)');
  }

  private stopRecording(): void {
    if (this.recordingState !== 'recording') return;

    const settings = this.settingsRepo.getSettings();

    this.recordingState = 'processing';
    this.broadcastRecordingState('processing');
    this.overlayWindow.webContents.send('stop-audio-capture');

    if (settings.sound_feedback) {
      this.overlayWindow.webContents.send('play-sound', 'stop');
    }

    // Safety timeout: if processAudio is never called (e.g. quick press race condition),
    // auto-reset to idle after 8 seconds
    this.processingTimeout = setTimeout(() => {
      if (this.recordingState === 'processing') {
        console.log('[FlowDan] Processing timeout - resetting to idle (no audio received)');
        this.finishRecording();
      }
    }, 8000);

    console.log('[FlowDan] Recording stopped (keys released), processing...');
  }

  private isProcessingAudio = false;

  private async processAudio(audioBuffer: Buffer): Promise<void> {
    // Clear safety timeout - we got audio data
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }

    if (this.isProcessingAudio) {
      console.log('[FlowDan] processAudio already running, skipping duplicate');
      this.finishRecording();
      return;
    }
    this.isProcessingAudio = true;

    try {
      const settings = this.settingsRepo.getSettings();
      const durationMs = Date.now() - this.recordingStartTime;

      console.log(`[FlowDan] Audio: ${audioBuffer.length} bytes, ${durationMs}ms`);

      if (!this.openai || audioBuffer.length < 1000) {
        console.log('[FlowDan] Audio too small or no API key');
        return;
      }

      const { asrText, formattedText } = await this.openai.transcribeAndFormat(audioBuffer);
      console.log(`[FlowDan] "${asrText}" → "${formattedText}"`);

      if (!asrText.trim()) return;

      const finalText = this.dictionaryRepo.applyReplacements(formattedText);
      const appName = await this.activeWindow.getActiveAppName();

      if (settings.auto_paste) {
        await this.textInjection.injectText(finalText);
      }

      this.historyRepo.add({
        asr_text: asrText,
        formatted_text: finalText,
        language: settings.language,
        app_name: appName,
        duration_ms: durationMs,
        num_words: finalText.split(/\s+/).length,
      });

      console.log('[FlowDan] Text pasted & saved to history');
    } catch (error) {
      console.error('[FlowDan] Failed:', error);
    } finally {
      this.isProcessingAudio = false;
      this.finishRecording();
    }
  }

  private finishRecording(): void {
    this.recordingState = 'idle';
    this.broadcastRecordingState('idle');
    this.overlayWindow.hide();
    this.trayManager.setRecording(false);
  }

  private onSettingsChanged(settings: Settings): void {
    this.initServices(settings);
    app.setLoginItemSettings({ openAtLogin: settings.auto_start });
  }

  private createDesktopShortcut(): void {
    if (process.platform !== 'win32') return;
    if (!app.isPackaged) return;

    const shortcutPath = path.join(app.getPath('desktop'), 'FlowDan.lnk');
    if (fs.existsSync(shortcutPath)) return;

    try {
      const created = shell.writeShortcutLink(shortcutPath, {
        target: process.execPath,
        description: 'FlowDan - Voice Dictation',
        appUserModelId: 'com.flowdan.app',
      });
      if (created) {
        console.log('[FlowDan] Desktop shortcut created');
      }
    } catch (error) {
      console.error('[FlowDan] Failed to create desktop shortcut:', error);
    }
  }
}

const flowdan = new FlowDanApp();
flowdan.init();
