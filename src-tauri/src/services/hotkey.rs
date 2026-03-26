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

// Module-level so async callbacks can sync it back on error
pub static MEETING_ACTIVE: AtomicBool = AtomicBool::new(false);

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

        // Ctrl+Shift+M: Meeting toggle (M = 0x4D)
        // Unambiguous — requires specific letter key, no conflict with Ctrl+Win PTT
        static MEETING_TRIGGERED: AtomicBool = AtomicBool::new(false);
        if ctrl && shift && !win && is_down && vk.0 == 0x4D /* M */
            && !MEETING_TRIGGERED.load(Ordering::SeqCst)
        {
            MEETING_TRIGGERED.store(true, Ordering::SeqCst);
            let is_meeting = MEETING_ACTIVE.load(Ordering::SeqCst);
            APP_HANDLE.with(|h| {
                if let Some(ref handle) = *h.borrow() {
                    if !is_meeting {
                        MEETING_ACTIVE.store(true, Ordering::SeqCst);
                        start_meeting_session(handle);
                    } else {
                        MEETING_ACTIVE.store(false, Ordering::SeqCst);
                        stop_meeting_session(handle);
                    }
                }
            });
        }
        // Reset when M is released or modifiers released
        if MEETING_TRIGGERED.load(Ordering::SeqCst) && (!ctrl || !shift || (!is_down && vk.0 == 0x4D)) {
            MEETING_TRIGGERED.store(false, Ordering::SeqCst);
        }

        // Ctrl+Win (no Shift): Push-to-talk (Feature 1)
        if ctrl && win && !shift && is_down {
            let was_active = MIC_ACTIVE.load(Ordering::SeqCst);
            if !was_active {
                log::info!("PTT: Ctrl+Win detected, starting mic recording");
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
    }

    unsafe { CallNextHookEx(None, n_code, w_param, l_param) }
}

fn start_mic_recording(app_handle: &tauri::AppHandle) {
    let state = app_handle.state::<AppState>();

    // Check state = Idle, set to Recording
    // If stuck in Processing for >10s, force reset to Idle
    {
        let mut rec_state = state.recording_state.lock().unwrap();
        if *rec_state != RecordingState::Idle {
            // Check if recording_start is stale (>10s ago = stuck)
            let is_stuck = {
                let start = state.recording_start.lock().unwrap();
                start.map(|s| s.elapsed().as_secs() > 10).unwrap_or(true)
            };
            if is_stuck {
                log::warn!("PTT: recording_state was {:?} but stuck >10s, force resetting to Idle", *rec_state);
                *rec_state = RecordingState::Idle;
            } else {
                log::warn!("PTT: recording_state is {:?}, not Idle — skipping", *rec_state);
                return;
            }
        }
        *rec_state = RecordingState::Recording;
    }

    log::info!("PTT: starting mic recording");

    // Save recording start timestamp
    {
        let mut start = state.recording_start.lock().unwrap();
        *start = Some(std::time::Instant::now());
    }

    // Get microphone_id from settings
    // Use try_lock to avoid blocking the hook thread (meeting loop may hold db lock)
    let microphone_id = match state.db.try_lock() {
        Ok(db) => {
            settings_repo::get_settings(&db)
                .ok()
                .and_then(|s| s.microphone_id)
        }
        Err(_) => {
            log::warn!("PTT: db lock busy, using default mic");
            None
        }
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

    // Expand overlay to recording pill size and reposition
    let _ = app_handle.emit("recording-state-changed", "recording");
    set_overlay_size(app_handle, 280.0, 56.0);

    log::info!("Recording started (Ctrl+Win held) — mic capture active");
}

/// Resize overlay without changing position (user may have dragged it).
/// Only changes size + ensures always-on-top.
fn set_overlay_size(app_handle: &tauri::AppHandle, w: f64, h: f64) {
    if let Some(overlay) = app_handle.get_webview_window("overlay") {
        let scale = get_screen_info(&overlay).2;
        let _ = overlay.set_size(tauri::PhysicalSize::new(
            (w * scale) as u32,
            (h * scale) as u32,
        ));
        let _ = overlay.set_always_on_top(true);
        let _ = overlay.show();
    }
}

/// Get screen dimensions with fallback
fn get_screen_info(window: &tauri::WebviewWindow) -> (f64, f64, f64) {
    // Try current monitor first, then primary
    let monitor = window.current_monitor().ok().flatten()
        .or_else(|| window.primary_monitor().ok().flatten());

    match monitor {
        Some(m) => {
            let scale = m.scale_factor();
            let sw = m.size().width as f64 / scale;
            let sh = m.size().height as f64 / scale;
            (sw, sh, scale)
        }
        None => {
            log::warn!("Overlay: no monitor detected, using fallback 1920x1080");
            (1920.0, 1080.0, 1.0)
        }
    }
}

fn stop_mic_recording(app_handle: &tauri::AppHandle) {
    log::info!("PTT: stopping mic recording (keys released)");
    let state = app_handle.state::<AppState>();

    // Check state = Recording, set to Processing
    {
        let mut rec_state = state.recording_state.lock().unwrap();
        if *rec_state != RecordingState::Recording {
            log::warn!("PTT stop: recording_state is {:?}, not Recording", *rec_state);
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

        // Reset state to Idle, shrink overlay back to idle badge
        let state = handle.state::<AppState>();
        {
            let mut rec_state = state.recording_state.lock().unwrap();
            *rec_state = RecordingState::Idle;
        }
        let _ = handle.emit("recording-state-changed", "idle");
        set_overlay_size(&handle, 280.0, 56.0);
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

fn start_meeting_session(app_handle: &tauri::AppHandle) {
    log::info!("Meeting session starting (Ctrl+Shift+M toggle)");

    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        let state = handle.state::<AppState>();

        // Check if loopback is enabled
        let loopback_enabled = {
            let db = state.db.lock().unwrap();
            crate::db::settings_repo::get_settings(&db)
                .map(|s| s.loopback_enabled)
                .unwrap_or(false)
        };

        if !loopback_enabled {
            log::warn!("Meeting: AI Screen Assistant is disabled");
            MEETING_ACTIVE.store(false, Ordering::SeqCst); // sync back
            let _ = handle.emit("meeting-error", "AI Screen Assistant is disabled. Enable it in Settings.");
            return;
        }

        match crate::commands::audio_cmd::start_meeting_session_internal(&handle).await {
            Ok(()) => log::info!("Meeting session started"),
            Err(e) => {
                log::error!("Failed to start meeting: {}", e);
                MEETING_ACTIVE.store(false, Ordering::SeqCst); // sync back on failure
                let _ = handle.emit("meeting-error", format!("Error: {}", e));
            }
        }
    });
}

fn stop_meeting_session(app_handle: &tauri::AppHandle) {
    log::info!("Meeting session stopping (Ctrl+Shift+M toggle)");

    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        match crate::commands::audio_cmd::stop_meeting_session_internal(&handle).await {
            Ok(()) => {
                log::info!("Meeting session stopped");
                // MEETING_ACTIVE already set to false by hotkey handler
            }
            Err(e) => {
                log::error!("Failed to stop meeting: {}", e);
                // Force cleanup: clear session so next toggle can start fresh
                let state = handle.state::<AppState>();
                {
                    let mut session = state.meeting_session.lock().unwrap();
                    *session = None;
                }
                // MEETING_ACTIVE already false, which is correct since we cleaned up
                let _ = handle.emit("meeting-error", format!("Error: {}", e));
            }
        }
    });
}

