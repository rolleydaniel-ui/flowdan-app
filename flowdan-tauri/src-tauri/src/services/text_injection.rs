use enigo::{Enigo, Keyboard, Settings, Key, Direction};
use tauri_plugin_clipboard_manager::ClipboardExt;

pub async fn inject_text(app_handle: &tauri::AppHandle, text: &str) -> Result<(), String> {
    // Save current clipboard
    let prev_clipboard = app_handle.clipboard().read_text().unwrap_or_default();

    // Set text to clipboard
    app_handle.clipboard().write_text(text)
        .map_err(|e| format!("Failed to write clipboard: {}", e))?;

    // Small delay to ensure clipboard is set
    tokio::time::sleep(std::time::Duration::from_millis(50)).await;

    // Simulate Ctrl+V
    let result = std::thread::spawn(|| {
        let mut enigo = Enigo::new(&Settings::default())
            .map_err(|e| format!("Failed to create Enigo: {}", e))?;

        enigo.key(Key::Control, Direction::Press)
            .map_err(|e| format!("Failed to press Ctrl: {}", e))?;
        enigo.key(Key::Unicode('v'), Direction::Click)
            .map_err(|e| format!("Failed to press V: {}", e))?;
        enigo.key(Key::Control, Direction::Release)
            .map_err(|e| format!("Failed to release Ctrl: {}", e))?;

        Ok::<(), String>(())
    }).join().map_err(|_| "Thread panic during key simulation".to_string())?;

    result?;

    // Restore clipboard after delay
    let handle = app_handle.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        let _ = handle.clipboard().write_text(&prev_clipboard);
    });

    Ok(())
}
