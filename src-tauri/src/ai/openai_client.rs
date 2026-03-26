use reqwest::multipart;
use serde::Deserialize;
use crate::errors::AppError;

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Debug, Deserialize)]
struct ChatMessage {
    content: Option<String>,
}

pub struct OpenAIClient {
    api_key: String,
    client: reqwest::Client,
}

impl OpenAIClient {
    pub fn new(api_key: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
            client: reqwest::Client::new(),
        }
    }

    /// Transcribe audio using Whisper API
    pub async fn transcribe(&self, wav_data: Vec<u8>, language: &str) -> Result<String, AppError> {
        let file_part = multipart::Part::bytes(wav_data)
            .file_name("audio.wav")
            .mime_str("audio/wav")
            .map_err(|e| AppError::OpenAI(format!("Failed to create multipart: {}", e)))?;

        let form = multipart::Form::new()
            .text("model", "whisper-1")
            .text("language", language.to_string())
            .text("response_format", "text")
            .text("prompt", "FlowDan, DanBoard, Duelki, Elevy, Claude, Whisper, Daniel")
            .part("file", file_part);

        let response = self.client
            .post("https://api.openai.com/v1/audio/transcriptions")
            .bearer_auth(&self.api_key)
            .multipart(form)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::OpenAI(format!("Whisper API error {}: {}", status, body)));
        }

        let text = response.text().await?;
        Ok(text.trim().to_string())
    }

    /// Format text using GPT-4o-mini
    pub async fn format_text(&self, raw_text: &str, system_prompt: &str) -> Result<String, AppError> {
        if raw_text.trim().is_empty() {
            return Ok(raw_text.to_string());
        }

        let body = serde_json::json!({
            "model": "gpt-4o-mini",
            "temperature": 0.1,
            "max_tokens": 2048,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": raw_text }
            ]
        });

        let response = self.client
            .post("https://api.openai.com/v1/chat/completions")
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::OpenAI(format!("GPT API error {}: {}", status, body)));
        }

        let chat_response: ChatResponse = response.json().await?;
        let text = chat_response.choices
            .first()
            .and_then(|c| c.message.content.as_ref())
            .map(|s| s.trim().to_string())
            .unwrap_or_else(|| raw_text.to_string());

        Ok(text)
    }

    /// AI response for desktop audio (Feature 2) - uses GPT-4o
    pub async fn ai_respond(&self, transcript: &str, system_prompt: &str) -> Result<String, AppError> {
        let body = serde_json::json!({
            "model": "gpt-4o",
            "temperature": 0.7,
            "max_tokens": 1024,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": transcript }
            ]
        });

        let response = self.client
            .post("https://api.openai.com/v1/chat/completions")
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::OpenAI(format!("GPT-4o API error {}: {}", status, body)));
        }

        let chat_response: ChatResponse = response.json().await?;
        let text = chat_response.choices
            .first()
            .and_then(|c| c.message.content.as_ref())
            .map(|s| s.trim().to_string())
            .unwrap_or_else(|| "No response generated.".to_string());

        Ok(text)
    }

    /// Test if API key is valid
    pub async fn test_key(api_key: &str) -> Result<bool, AppError> {
        let client = reqwest::Client::new();
        let response = client
            .get("https://api.openai.com/v1/models")
            .bearer_auth(api_key)
            .send()
            .await?;

        Ok(response.status().is_success())
    }

    /// Full pipeline: transcribe -> format text
    pub async fn transcribe_and_format(
        &self,
        wav_data: Vec<u8>,
        language: &str,
    ) -> Result<(String, String), AppError> {
        let asr_text = self.transcribe(wav_data, language).await?;
        if asr_text.trim().is_empty() {
            return Ok((String::new(), String::new()));
        }

        let prompt = super::prompts::format_prompt(language);
        let formatted = self.format_text(&asr_text, &prompt).await?;
        Ok((asr_text, formatted))
    }
}
