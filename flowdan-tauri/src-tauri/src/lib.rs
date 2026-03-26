pub mod state;
pub mod errors;
pub mod db;
pub mod audio;
pub mod ai;
pub mod services;
pub mod commands;

use tauri::{Manager, Emitter};
use tauri::menu::{MenuBuilder, MenuItemBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("dashboard") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .on_window_event(|window, event| {
            // Prevent dashboard from being destroyed — hide instead of close
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "dashboard" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .setup(|app| {
            let app_handle = app.handle().clone();
            state::init_app_state(&app_handle)?;

            // Position overlay: small idle badge, centered near bottom
            if let Some(overlay) = app.get_webview_window("overlay") {
                let monitor = overlay.primary_monitor().ok().flatten();
                let (sw, sh, scale) = match monitor {
                    Some(m) => {
                        let s = m.scale_factor();
                        (m.size().width as f64 / s, m.size().height as f64 / s, s)
                    }
                    None => (1920.0, 1080.0, 1.0),
                };
                let x = (sw - 280.0) / 2.0;
                let y = sh * 0.92;
                let _ = overlay.set_position(tauri::PhysicalPosition::new(
                    (x * scale) as i32,
                    (y * scale) as i32,
                ));
                let _ = overlay.set_always_on_top(true);
                let _ = overlay.show();

                // Remove Windows system menu (Przywróć/Przenieś/Zamknij) from overlay
                #[cfg(target_os = "windows")]
                {
                    use windows::Win32::UI::WindowsAndMessaging::*;
                    use windows::Win32::Foundation::HWND;
                    let raw_hwnd = overlay.hwnd().expect("overlay hwnd");
                    let hwnd = HWND(raw_hwnd.0 as *mut _);
                    unsafe {
                        let style = GetWindowLongW(hwnd, GWL_STYLE);
                        SetWindowLongW(hwnd, GWL_STYLE, style & !WS_SYSMENU.0 as i32);
                    }
                }
            }
            if let Some(ai_overlay) = app.get_webview_window("ai-overlay") {
                let _ = ai_overlay.hide();
            }

            // Setup system tray menu
            let show = MenuItemBuilder::with_id("show", "Open Dashboard").build(app)?;
            let settings = MenuItemBuilder::with_id("settings", "Settings").build(app)?;
            let separator = tauri::menu::PredefinedMenuItem::separator(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit FlowDan").build(app)?;

            let menu = MenuBuilder::new(app)
                .item(&show)
                .item(&settings)
                .item(&separator)
                .item(&quit)
                .build()?;

            if let Some(tray) = app.tray_by_id("main") {
                let _ = tray.set_menu(Some(menu));
            } else if let Ok(tray) = tauri::tray::TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().cloned().unwrap())
                .menu(&menu)
                .tooltip("FlowDan - Voice Dictation")
                .build(app)
            {
                let _ = tray;
            }

            // Handle tray menu clicks
            let handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                match event.id().as_ref() {
                    "show" => {
                        if let Some(w) = handle.get_webview_window("dashboard") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                    "settings" => {
                        if let Some(w) = handle.get_webview_window("dashboard") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                            let _ = w.emit("navigate", "settings");
                        }
                    }
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                }
            });

            // Also open dashboard on tray double-click
            let handle2 = app.handle().clone();
            app.on_tray_icon_event(move |_tray, event| {
                if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                    if let Some(w) = handle2.get_webview_window("dashboard") {
                        let _ = w.show();
                        let _ = w.unminimize();
                        let _ = w.set_focus();
                    }
                }
            });

            // Always show dashboard on start
            if let Some(w) = app.get_webview_window("dashboard") {
                // Fix blurry taskbar icon: Tauri bug #14596 reads only 16x16 from ICO
                // Decode PNG to raw RGBA and set as window icon
                {
                    let png_bytes = include_bytes!("../icons/128x128@2x.png");
                    let decoder = png::Decoder::new(std::io::Cursor::new(png_bytes.as_ref()));
                    if let Ok(mut reader) = decoder.read_info() {
                        let mut buf = vec![0u8; reader.output_buffer_size()];
                        if let Ok(info) = reader.next_frame(&mut buf) {
                            buf.truncate(info.buffer_size());
                            let icon = tauri::image::Image::new_owned(buf, info.width, info.height);
                            let _ = w.set_icon(icon);
                        }
                    }
                }
                let _ = w.show();
                let _ = w.set_focus();
            }

            // Auto-start loopback capture if enabled in settings
            {
                let state = app_handle.state::<state::AppState>();
                let loopback_enabled = {
                    let db = state.db.lock().unwrap();
                    db::settings_repo::get_settings(&db)
                        .map(|s| s.loopback_enabled)
                        .unwrap_or(false)
                };
                if loopback_enabled {
                    let lh = app.handle().clone();
                    tauri::async_runtime::spawn(async move {
                        let state = lh.state::<state::AppState>();
                        match commands::audio_cmd::start_loopback_capture(state, lh.clone()).await {
                            Ok(()) => log::info!("Auto-started loopback capture"),
                            Err(e) => log::error!("Failed to auto-start loopback: {}", e),
                        }
                    });
                }
            }

            // Setup global hotkeys via low-level keyboard hook
            let handle_for_hotkey = app.handle().clone();
            std::thread::spawn(move || {
                services::hotkey::start_hotkey_listener(handle_for_hotkey);
            });

            // Overlay watchdog: re-show overlay every 30s to prevent it from disappearing
            let watchdog_handle = app.handle().clone();
            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(30));
                    if let Some(overlay) = watchdog_handle.get_webview_window("overlay") {
                        let _ = overlay.set_always_on_top(true);
                        let _ = overlay.show();
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::settings_cmd::get_settings,
            commands::settings_cmd::update_settings,
            commands::settings_cmd::test_openai_key,
            commands::settings_cmd::list_audio_devices,
            commands::history_cmd::get_history,
            commands::history_cmd::get_history_count,
            commands::history_cmd::delete_history_entry,
            commands::history_cmd::archive_history_entry,
            commands::history_cmd::unarchive_history_entry,
            commands::history_cmd::clear_history,
            commands::dictionary_cmd::get_dictionary_entries,
            commands::dictionary_cmd::add_dictionary_entry,
            commands::dictionary_cmd::update_dictionary_entry,
            commands::dictionary_cmd::delete_dictionary_entry,
            commands::dictionary_cmd::export_dictionary,
            commands::dictionary_cmd::import_dictionary,
            commands::recording_cmd::get_recording_state,
            commands::recording_cmd::start_mic_recording,
            commands::recording_cmd::stop_mic_recording,
            commands::audio_cmd::start_loopback_capture,
            commands::audio_cmd::stop_loopback_capture,
            commands::audio_cmd::trigger_ai_response,
            commands::audio_cmd::trigger_ai_followup,
            commands::audio_cmd::start_meeting_session,
            commands::audio_cmd::stop_meeting_session,
            commands::audio_cmd::get_meeting_state,
            commands::audio_cmd::get_meeting_transcript,
            commands::audio_cmd::meeting_chat,
            commands::audio_cmd::dismiss_meeting,
            commands::window_cmd::show_dashboard,
            commands::window_cmd::hide_dashboard,
            commands::window_cmd::close_app,
            commands::window_cmd::open_data_folder,
            commands::window_cmd::center_overlay,
            commands::window_cmd::ensure_overlay_size,
        ])
        .run(tauri::generate_context!())
        .expect("error while running FlowDan");
}
