import { clipboard } from 'electron';
import { exec } from 'child_process';

export class TextInjectionService {
  async injectText(text: string): Promise<void> {
    // Save current clipboard contents
    const previousClipboard = clipboard.readText();

    // Set text to clipboard
    clipboard.writeText(text);

    // Small delay to ensure clipboard is set
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate Ctrl+V using PowerShell + SendKeys
    try {
      await new Promise<void>((resolve, reject) => {
        exec(
          'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^v\')"',
          { timeout: 3000 },
          (error) => {
            if (error) reject(error);
            else resolve();
          },
        );
      });
    } catch (error) {
      console.error('SendKeys paste failed:', error);
      // Clipboard still has the text, user can manually Ctrl+V
    }

    // Restore previous clipboard after a delay
    setTimeout(() => {
      clipboard.writeText(previousClipboard);
    }, 500);
  }
}
