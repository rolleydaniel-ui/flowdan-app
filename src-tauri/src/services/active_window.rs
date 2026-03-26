/// Get the name of the currently focused application using Windows API
pub fn get_active_app_name() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;
        use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ};
        use windows::Win32::Foundation::CloseHandle;

        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.0.is_null() {
                return None;
            }

            let mut pid = 0u32;
            windows::Win32::UI::WindowsAndMessaging::GetWindowThreadProcessId(hwnd, Some(&mut pid));

            if pid == 0 {
                return None;
            }

            let process = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, pid);
            if let Ok(process) = process {
                let mut name_buf = [0u16; 260];
                let mut size = name_buf.len() as u32;

                let result = windows::Win32::System::Threading::QueryFullProcessImageNameW(
                    process,
                    windows::Win32::System::Threading::PROCESS_NAME_FORMAT(0),
                    windows::core::PWSTR(name_buf.as_mut_ptr()),
                    &mut size,
                );

                let _ = CloseHandle(process);

                if result.is_ok() {
                    let path = String::from_utf16_lossy(&name_buf[..size as usize]);
                    // Extract just the exe name without extension
                    let name = std::path::Path::new(&path)
                        .file_stem()
                        .and_then(|s| s.to_str())
                        .map(|s| s.to_string());
                    return name;
                }
            }

            None
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        None
    }
}
