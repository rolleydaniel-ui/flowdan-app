import { execSync } from 'child_process';

export class ActiveWindowService {
  async getActiveAppName(): Promise<string | null> {
    try {
      // Use PowerShell to get the active window title on Windows
      const result = execSync(
        'powershell -Command "(Get-Process | Where-Object { $_.MainWindowHandle -eq (Add-Type -MemberDefinition \'[DllImport(\\"user32.dll\\")]public static extern IntPtr GetForegroundWindow();\' -Name \'Win32\' -Namespace \'Native\' -PassThru)::GetForegroundWindow() }).ProcessName"',
        { encoding: 'utf-8', timeout: 2000 },
      ).trim();
      return result || null;
    } catch {
      return null;
    }
  }
}
