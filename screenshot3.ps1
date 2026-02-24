Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinAPI3 {
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
    public static readonly IntPtr HWND_NOTOPMOST = new IntPtr(-2);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@

$proc = Get-Process -Name "flowdan" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1
if ($proc) {
    $hwnd = $proc.MainWindowHandle

    # Move to top-left corner and set as topmost temporarily
    [WinAPI3]::SetWindowPos($hwnd, [WinAPI3]::HWND_TOPMOST, 50, 50, 976, 669, 0) | Out-Null
    [WinAPI3]::SetForegroundWindow($hwnd) | Out-Null
    Start-Sleep -Milliseconds 1500

    $rect = New-Object WinAPI3+RECT
    [WinAPI3]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
    $w = $rect.Right - $rect.Left
    $h = $rect.Bottom - $rect.Top

    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen($rect.Left, $rect.Top, 0, 0, (New-Object System.Drawing.Size($w, $h)))
    $g.Dispose()
    $path = "C:\Users\rolle\Desktop\flowdan-tauri-clean.png"
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    # Remove topmost
    [WinAPI3]::SetWindowPos($hwnd, [WinAPI3]::HWND_NOTOPMOST, 50, 50, 976, 669, 0) | Out-Null

    Write-Host "Clean screenshot saved to $path"
} else {
    Write-Host "FlowDan not found"
}
