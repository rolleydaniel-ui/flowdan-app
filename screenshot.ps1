Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@

$proc = Get-Process -Name "flowdan" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1
if (-not $proc) {
    $proc = Get-Process | Where-Object { $_.MainWindowTitle -eq "FlowDan" -and $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1
}

if ($proc) {
    $hwnd = $proc.MainWindowHandle
    Write-Host "Found process: $($proc.ProcessName) (PID: $($proc.Id)) HWND: $hwnd Title: $($proc.MainWindowTitle)"

    [WinAPI]::ShowWindow($hwnd, 9) | Out-Null
    [WinAPI]::SetForegroundWindow($hwnd) | Out-Null
    Start-Sleep -Milliseconds 1000

    $rect = New-Object WinAPI+RECT
    [WinAPI]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
    $w = $rect.Right - $rect.Left
    $h = $rect.Bottom - $rect.Top
    Write-Host "Window: $w x $h at ($($rect.Left), $($rect.Top))"

    if ($w -gt 0 -and $h -gt 0) {
        $bmp = New-Object System.Drawing.Bitmap($w, $h)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.CopyFromScreen($rect.Left, $rect.Top, 0, 0, (New-Object System.Drawing.Size($w, $h)))
        $g.Dispose()
        $path = "C:\Users\rolle\Desktop\flowdan-tauri-screenshot.png"
        $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        Write-Host "Screenshot saved to $path"
    } else {
        Write-Host "Window has zero size"
    }
} else {
    Write-Host "No FlowDan process with visible window found"
    Write-Host "Processes with windows:"
    Get-Process | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object ProcessName, MainWindowTitle, MainWindowHandle | Format-Table
}
