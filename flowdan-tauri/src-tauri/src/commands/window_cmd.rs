use tauri::{AppHandle, Manager};
use crate::errors::AppError;

#[tauri::command]
pub fn show_dashboard(app_handle: AppHandle) -> Result<(), AppError> {
    if let Some(w) = app_handle.get_webview_window("dashboard") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
    Ok(())
}

#[tauri::command]
pub fn hide_dashboard(app_handle: AppHandle) -> Result<(), AppError> {
    if let Some(w) = app_handle.get_webview_window("dashboard") {
        let _ = w.hide();
    }
    Ok(())
}

#[tauri::command]
pub fn close_app(app_handle: AppHandle) -> Result<(), AppError> {
    app_handle.exit(0);
    Ok(())
}

#[tauri::command]
pub fn center_overlay(app_handle: AppHandle) -> Result<(), AppError> {
    if let Some(overlay) = app_handle.get_webview_window("overlay") {
        let monitor = overlay.primary_monitor().ok().flatten()
            .or_else(|| overlay.current_monitor().ok().flatten());
        if let Some(m) = monitor {
            let scale = m.scale_factor();
            let sw = m.size().width as f64 / scale;
            let sh = m.size().height as f64 / scale;
            let x = (sw - 280.0) / 2.0;
            let y = sh * 0.92;
            let _ = overlay.set_size(tauri::PhysicalSize::new(
                (280.0 * scale) as u32,
                (56.0 * scale) as u32,
            ));
            let _ = overlay.set_position(tauri::PhysicalPosition::new(
                (x * scale) as i32,
                (y * scale) as i32,
            ));
        }
    }
    Ok(())
}

#[tauri::command]
pub fn ensure_overlay_size(app_handle: AppHandle) -> Result<(), AppError> {
    if let Some(overlay) = app_handle.get_webview_window("overlay") {
        let scale = overlay.primary_monitor().ok().flatten()
            .map(|m| m.scale_factor()).unwrap_or(1.0);
        let _ = overlay.set_size(tauri::PhysicalSize::new(
            (280.0 * scale) as u32,
            (56.0 * scale) as u32,
        ));
    }
    Ok(())
}

#[tauri::command]
pub fn open_data_folder(app_handle: AppHandle) -> Result<(), AppError> {
    let app_dir = app_handle.path().app_data_dir()
        .map_err(|e| AppError::General(e.to_string()))?;
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer")
            .arg(app_dir)
            .spawn();
    }
    Ok(())
}
