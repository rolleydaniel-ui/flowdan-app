import { contextBridge, ipcRenderer } from 'electron';
import type { OverlayAPI, RecordingStatus } from '../types';

let audioLevelCallback: ((level: number) => void) | null = null;

const api: OverlayAPI = {
  onRecordingStateChange: (cb: (status: RecordingStatus) => void) => {
    ipcRenderer.on('recording-state', (_event, status) => cb(status));
  },
  onAudioLevel: (cb: (level: number) => void) => {
    audioLevelCallback = cb;
  },
  getRecordingState: () => ipcRenderer.invoke('recording:get-state'),
};

contextBridge.exposeInMainWorld('overlayAPI', api);

// ─── Audio capture with real-time level monitoring ───

let recorder: MediaRecorder | undefined;
let stream: MediaStream | undefined;
let audioChunks: Blob[] = [];
let analyserNode: AnalyserNode | undefined;
let audioContext: AudioContext | undefined;
let levelInterval: ReturnType<typeof setInterval> | undefined;
let isCapturing = false;
let pendingStop = false;

ipcRenderer.on('start-audio-capture', async (_event, deviceId: string | null) => {
  try {
    audioChunks = [];
    isCapturing = true;
    pendingStop = false;

    const constraints: MediaStreamConstraints = {
      audio: deviceId
        ? { deviceId: { exact: deviceId }, sampleRate: 16000, channelCount: 1 }
        : { sampleRate: 16000, channelCount: 1 },
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);

    // If stop was requested while we were waiting for getUserMedia, abort immediately
    if (pendingStop) {
      stream.getTracks().forEach(track => track.stop());
      stream = undefined;
      isCapturing = false;
      pendingStop = false;
      // Send empty audio so main process can finish
      ipcRenderer.invoke('recording:process-audio', new ArrayBuffer(0));
      return;
    }

    // Set up AnalyserNode for real-time audio level
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.5;
    source.connect(analyserNode);

    // Sample audio level every 50ms and send to renderer
    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    levelInterval = setInterval(() => {
      if (analyserNode) {
        analyserNode.getByteFrequencyData(dataArray);
        // Calculate RMS-like level from frequency data
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const level = Math.min(avg / 128, 1); // normalize to 0-1
        if (audioLevelCallback) {
          audioLevelCallback(level);
        }
      }
    }, 50);

    recorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };

    recorder.start(250); // collect chunks every 250ms
  } catch (error) {
    console.error('Failed to start audio capture:', error);
    isCapturing = false;
    // Notify main process so it doesn't stay stuck
    ipcRenderer.invoke('recording:process-audio', new ArrayBuffer(0));
  }
});

ipcRenderer.on('stop-audio-capture', async () => {
  // If start-audio-capture is still initializing (getUserMedia pending),
  // flag it so it aborts when ready
  if (isCapturing && !recorder) {
    pendingStop = true;
    return;
  }

  // Stop level monitoring
  if (levelInterval) {
    clearInterval(levelInterval);
    levelInterval = undefined;
  }

  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = undefined;
    analyserNode = undefined;
  }

  // Send final zero level
  if (audioLevelCallback) {
    audioLevelCallback(0);
  }

  if (recorder && recorder.state !== 'inactive') {
    await new Promise<void>((resolve) => {
      recorder!.onstop = () => resolve();
      recorder!.stop();
    });
  }

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = undefined;
  }

  // Combine all chunks into one blob, convert to ArrayBuffer, send to main
  // Always send something so main process can finish
  if (audioChunks.length > 0) {
    const blob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
    const arrayBuffer = await blob.arrayBuffer();
    ipcRenderer.invoke('recording:process-audio', arrayBuffer);
  } else {
    // Send empty buffer so main process exits processing state
    ipcRenderer.invoke('recording:process-audio', new ArrayBuffer(0));
  }

  audioChunks = [];
  recorder = undefined;
  isCapturing = false;
});

// ─── Sound feedback via Web Audio API ───

ipcRenderer.on('play-sound', (_event, type: 'start' | 'stop') => {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === 'start') {
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } else {
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }
});
