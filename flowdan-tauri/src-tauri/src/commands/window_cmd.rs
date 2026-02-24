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
