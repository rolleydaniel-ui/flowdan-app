pub mod state;
pub mod errors;
pub mod db;
pub mod audio;
pub mod ai;
pub mod services;
pub mod commands;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("dashboard") {
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            state::init_app_state(&app_handle)?;

            // Position overlay pill centered, above taskbar (~90% screen height)
            if let Some(overlay) = app.get_webview_window("overlay") {
                let _ = overlay.hide();
                if let Ok(Some(monitor)) = overlay.primary_monitor() {
                    let screen = monitor.size();
                    let scale = monitor.scale_factor();
                    let sw = (screen.width as f64 / scale) as i32;
                    let sh = (screen.height as f64 / scale) as i32;
                    let win_w = 240;
                    let x = (sw - win_w) / 2;
                    let y = (sh as f64 * 0.90) as i32;
                    let _ = overlay.set_position(tauri::PhysicalPosition::new(
                        (x as f64 * scale) as i32,
                        (y as f64 * scale) as i32,
                    ));
                }
            }
            if let Some(ai_overlay) = app.get_webview_window("ai-overlay") {
                let _ = ai_overlay.hide();
            }

            // Setup system tray event handler
            let handle = app.handle().clone();
            app.on_tray_icon_event(move |_tray, event| {
                if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                    if let Some(w) = handle.get_webview_window("dashboard") {
                        let _ = w.show();
                        let _ = w.unminimize();
                        let _ = w.set_focus();
                    }
                }
            });

            // Always show dashboard on start
            if let Some(w) = app.get_webview_window("dashboard") {
                let _ = w.show();
                let _ = w.set_focus();
            }

            // Setup global hotkeys via low-level keyboard hook
            let handle_for_hotkey = app.handle().clone();
            std::thread::spawn(move || {
                services::hotkey::start_hotkey_listener(handle_for_hotkey);
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
            commands::window_cmd::show_dashboard,
            commands::window_cmd::hide_dashboard,
            commands::window_cmd::close_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running FlowDan");
}
