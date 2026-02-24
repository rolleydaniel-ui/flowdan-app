use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::cell::RefCell;
use tauri::{Manager, Emitter};

use crate::state::{AppState, RecordingState};
use crate::audio::microphone::{MicRecorder, calculate_level};
use crate::db::settings_repo;
use crate::commands::recording_cmd::process_recorded_audio;

static CTRL_HELD: AtomicBool = AtomicBool::new(false);
static WIN_HELD: AtomicBool = AtomicBool::new(false);
static SHIFT_HELD: AtomicBool = AtomicBool::new(false);
static MIC_ACTIVE: AtomicBool = AtomicBool::new(false);
static LEVEL_EMITTER_RUNNING: AtomicBool = AtomicBool::new(false);

/// Low-level keyboard hook for push-to-talk
pub fn start_hotkey_listener(app_handle: tauri::AppHandle) {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::WindowsAndMessaging::*;

        // Store app_handle in thread-local for the hook callback
        APP_HANDLE.with(|h| {
            *h.borrow_mut() = Some(app_handle);
        });

        unsafe {
            let hook = SetWindowsHookExW(
                WH_KEYBOARD_LL,
                Some(keyboard_hook_proc),
                None,
                0,
            );

            if let Ok(hook) = hook {
                log::info!("Keyboard hook installed for push-to-talk");

                // Message loop to keep hook alive
                let mut msg = MSG::default();
                while GetMessageW(&mut msg, None, 0, 0).as_bool() {
                    let _ = TranslateMessage(&msg);
                    DispatchMessageW(&msg);
                }

                let _ = UnhookWindowsHookEx(hook);
            } else {
                log::error!("Failed to install keyboard hook");
            }
        }
    }
}

#[cfg(target_os = "windows")]
thread_local! {
    static APP_HANDLE: RefCell<Option<tauri::AppHandle>> = RefCell::new(None);
    static MIC_RECORDER: RefCell<Option<MicRecorder>> = RefCell::new(None);
}

#[cfg(target_os = "windows")]
unsafe extern "system" fn keyboard_hook_proc(
    n_code: i32,
    w_param: windows::Win32::Foundation::WPARAM,
    l_param: windows::Win32::Foundation::LPARAM,
) -> windows::Win32::Foundation::LRESULT {
    use windows::Win32::UI::WindowsAndMessaging::*;
    use windows::Win32::UI::Input::KeyboardAndMouse::*;

    if n_code >= 0 {
        let kb = *(l_param.0 as *const KBDLLHOOKSTRUCT);
        let vk = VIRTUAL_KEY(kb.vkCode as u16);
        let is_down = w_param.0 as u32 == WM_KEYDOWN || w_param.0 as u32 == WM_SYSKEYDOWN;
        let _is_up = w_param.0 as u32 == WM_KEYUP || w_param.0 as u32 == WM_SYSKEYUP;

        // Track modifier keys
        match vk {
            VK_LCONTROL | VK_RCONTROL | VK_CONTROL => {
                CTRL_HELD.store(is_down, Ordering::SeqCst);
            }
            VK_LWIN | VK_RWIN => {
                WIN_HELD.store(is_down, Ordering::SeqCst);
            }
            VK_LSHIFT | VK_RSHIFT | VK_SHIFT => {
                SHIFT_HELD.store(is_down, Ordering::SeqCst);
            }
            _ => {}
        }

        let ctrl = CTRL_HELD.load(Ordering::SeqCst);
        let win = WIN_HELD.load(Ordering::SeqCst);
        let shift = SHIFT_HELD.load(Ordering::SeqCst);

        // Ctrl+Win (no Shift): Push-to-talk (Feature 1)
        if ctrl && win && !shift {
            let was_active = MIC_ACTIVE.load(Ordering::SeqCst);
            if !was_active && is_down {
                MIC_ACTIVE.store(true, Ordering::SeqCst);
                APP_HANDLE.with(|h| {
                    if let Some(ref handle) = *h.borrow() {
                        start_mic_recording(handle);
                    }
                });
            }
        }

        // Release: stop recording
        if MIC_ACTIVE.load(Ordering::SeqCst) && (!ctrl || !win) {
            MIC_ACTIVE.store(false, Ordering::SeqCst);
            APP_HANDLE.with(|h| {
                if let Some(ref handle) = *h.borrow() {
                    stop_mic_recording(handle);
                }
            });
        }

        // Ctrl+Shift+Win: AI response (Feature 2)
        if ctrl && shift && win && is_down {
            if matches!(vk, VK_LWIN | VK_RWIN) {
                APP_HANDLE.with(|h| {
                    if let Some(ref handle) = *h.borrow() {
                        trigger_ai_response(handle);
                    }
                });
            }
        }
    }

    unsafe { CallNextHookEx(None, n_code, w_param, l_param) }
}

fn start_mic_recording(app_handle: &tauri::AppHandle) {
    let state = app_handle.state::<AppState>();

    // Check state = Idle, set to Recording
    {
        let mut rec_state = state.recording_state.lock().unwrap();
        if *rec_state != RecordingState::Idle {
            return;
        }
        *rec_state = RecordingState::Recording;
    }

    // Save recording start timestamp
    {
        let mut start = state.recording_start.lock().unwrap();
        *start = Some(std::time::Instant::now());
    }

    // Get microphone_id from settings
    let microphone_id = {
        let db = state.db.lock().unwrap();
        settings_repo::get_settings(&db)
            .ok()
            .and_then(|s| s.microphone_id)
    };

    // Create and start MicRecorder
    let mut recorder = MicRecorder::new();
    if let Err(e) = recorder.start(microphone_id.as_deref()) {
        log::error!("Failed to start mic recording: {}", e);
        let mut rec_state = state.recording_state.lock().unwrap();
        *rec_state = RecordingState::Idle;
        return;
    }

    // Get shared samples buffer for level emitter
    let samples_arc = recorder.samples_arc();
    let sample_rate = recorder.sample_rate();
    let channels = recorder.channels();

    // Store recorder in thread_local
    MIC_RECORDER.with(|r| {
        *r.borrow_mut() = Some(recorder);
    });

    // Start audio level emitter thread
    LEVEL_EMITTER_RUNNING.store(true, Ordering::SeqCst);
    let emitter_handle = app_handle.clone();
    std::thread::spawn(move || {
        audio_level_emitter(emitter_handle, samples_arc, sample_rate, channels);
    });

    // Show overlay at bottom-center of screen
    let _ = app_handle.emit("recording-state-changed", "recording");
    if let Some(overlay) = app_handle.get_webview_window("overlay") {
        if let Ok(monitor) = overlay.current_monitor() {
            if let Some(monitor) = monitor {
                let screen = monitor.size();
                let scale = monitor.scale_factor();
                let w = 260.0;
                let h = 52.0;
                let x = (screen.width as f64 / scale - w) / 2.0;
                let y = screen.height as f64 / scale - h - 32.0;
                let _ = overlay.set_position(tauri::PhysicalPosition::new(
                    (x * scale) as i32,
                    (y * scale) as i32,
                ));
            }
        }
        let _ = overlay.show();
    }

    log::info!("Recording started (Ctrl+Win held) — mic capture active");
}

fn stop_mic_recording(app_handle: &tauri::AppHandle) {
    let state = app_handle.state::<AppState>();

    // Check state = Recording, set to Processing
    {
        let mut rec_state = state.recording_state.lock().unwrap();
        if *rec_state != RecordingState::Recording {
            return;
        }
        *rec_state = RecordingState::Processing;
    }

    // Stop level emitter
    LEVEL_EMITTER_RUNNING.store(false, Ordering::SeqCst);

    // Take recorder from thread_local and stop it
    let recording_data = MIC_RECORDER.with(|r| {
        r.borrow_mut().take().map(|mut rec| rec.stop())
    });

    let (samples, sample_rate, channels) = match recording_data {
        Some(data) => data,
        None => {
            log::error!("No recorder found in thread_local");
            let mut rec_state = state.recording_state.lock().unwrap();
            *rec_state = RecordingState::Idle;
            let _ = app_handle.emit("recording-state-changed", "idle");
            return;
        }
    };

    // Calculate duration from recording_start
    let duration_ms = {
        let mut start = state.recording_start.lock().unwrap();
        let dur = start.take()
            .map(|s| s.elapsed().as_millis() as i64)
            .unwrap_or(0);
        dur
    };

    let _ = app_handle.emit("recording-state-changed", "processing");

    log::info!("Recording stopped (keys released), {} samples, {}ms — processing...", samples.len(), duration_ms);

    // Spawn async pipeline
    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        match process_recorded_audio(&handle, samples, sample_rate, channels, duration_ms).await {
            Ok(()) => {
                log::info!("Audio pipeline completed successfully");
            }
            Err(e) => {
                log::error!("Audio pipeline error: {}", e);
            }
        }

        // Reset state to Idle, hide overlay
        let state = handle.state::<AppState>();
        {
            let mut rec_state = state.recording_state.lock().unwrap();
            *rec_state = RecordingState::Idle;
        }
        let _ = handle.emit("recording-state-changed", "idle");
        if let Some(overlay) = handle.get_webview_window("overlay") {
            let _ = overlay.hide();
        }
    });
}

/// Emits "audio-level" events every 50ms while recording
fn audio_level_emitter(
    app_handle: tauri::AppHandle,
    samples: Arc<Mutex<Vec<f32>>>,
    sample_rate: u32,
    channels: u16,
) {
    while LEVEL_EMITTER_RUNNING.load(Ordering::SeqCst) {
        let level = calculate_level(&samples, sample_rate, channels);
        let _ = app_handle.emit("audio-level", level);
        std::thread::sleep(std::time::Duration::from_millis(50));
    }
    // Emit zero level when stopped
    let _ = app_handle.emit("audio-level", 0.0f32);
}

fn trigger_ai_response(app_handle: &tauri::AppHandle) {
    let _ = app_handle.emit("ai-trigger", ());
    log::info!("AI response triggered (Ctrl+Shift+Win)");
}
