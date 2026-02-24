import OpenAI, { toFile } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class OpenAIService {
  private client: OpenAI;
  private language: string;

  constructor(apiKey: string, language: string = 'pl') {
    this.client = new OpenAI({ apiKey });
    this.language = language;
  }

  /**
   * Transcribe audio using OpenAI Whisper API.
   * Accepts a Buffer of webm/opus audio data.
   */
  async transcribe(audioBuffer: Buffer): Promise<string> {
    // Write buffer to temp file (Whisper API needs a file)
    const tmpPath = path.join(os.tmpdir(), `flowdan-${Date.now()}.webm`);
    fs.writeFileSync(tmpPath, audioBuffer);

    try {
      const file = fs.createReadStream(tmpPath);
      const response = await this.client.audio.transcriptions.create({
        model: 'whisper-1',
        file,
        language: this.language,
        response_format: 'text',
        prompt: 'FlowDan, DanBoard, Duelki, Elevy, Claude, Whisper, Daniel',
      });

      return (response as unknown as string).trim();
    } finally {
      // Cleanup temp file
      try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    }
  }

  /**
   * Format raw transcript with GPT-4o-mini:
   * punctuation, capitalization, filler word removal, grammar fixes.
   */
  async formatText(rawText: string): Promise<string> {
    if (!rawText.trim()) return rawText;

    const langName = this.language === 'pl' ? 'Polish' : 'English';

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 2048,
        messages: [
          {
            role: 'system',
            content: `You are a voice dictation text formatter. Process the following speech-to-text transcript:

1. Add proper punctuation (periods, commas, question marks, etc.)
2. Fix capitalization (sentence beginnings, proper nouns)
3. Remove filler words (umm, uhh, like, you know, no wiesz, yyyy, eee, znaczy)
4. Fix obvious grammar mistakes
5. Keep the original meaning and tone exactly
6. Do NOT add, remove, or change any substantive content
7. The text is in ${langName}

Return ONLY the formatted text, nothing else.`,
          },
          {
            role: 'user',
            content: rawText,
          },
        ],
      });

      return response.choices[0]?.message?.content?.trim() || rawText;
    } catch (error) {
      console.error('OpenAI formatting failed, returning raw text:', error);
      return rawText;
    }
  }

  /**
   * Full pipeline: transcribe audio → format text.
   */
  async transcribeAndFormat(audioBuffer: Buffer): Promise<{ asrText: string; formattedText: string }> {
    const asrText = await this.transcribe(audioBuffer);
    if (!asrText.trim()) {
      return { asrText: '', formattedText: '' };
    }
    const formattedText = await this.formatText(asrText);
    return { asrText, formattedText };
  }

  static async testKey(apiKey: string): Promise<boolean> {
    try {
      const client = new OpenAI({ apiKey });
      await client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}
