use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Manager, Emitter};

use crate::state::{AppState, TranscriptChunk};
use crate::audio::encoder;
use crate::ai::openai_client::OpenAIClient;
use crate::db::settings_repo;
use crate::commands::audio_cmd::get_loopback_ref;

/// Known Whisper hallucination patterns (appears on silence/noise)
const HALLUCINATION_PATTERNS: &[&str] = &[
    "napisy stworzone przez",
    "napisy tworzone przez",
    "amara.org",
    "subtitles by",
    "subtitles created by",
    "dziękuję za obejrzenie",
    "dzięki za oglądanie",
    "nie zapomnijcie zasubskrybować",
    "zasubskrybuj",
    "subscribe",
    "do zobaczenia w kolejnych",
    "do następnego razu",
    "thanks for watching",
    "thank you for watching",
    "please subscribe",
    "like and subscribe",
    "subskrybuj",
    "zafollowować",
    "zafollowuj",
    "tłumaczenie zrobione przez",
    "transkrypcja",
    "hej, co słychać",
    "cześć, witajcie",
    "serdecznie witam",
];

/// Check if text is a Whisper hallucination
fn is_hallucination(text: &str) -> bool {
    let lower = text.to_lowercase();
    for pattern in HALLUCINATION_PATTERNS {
        if lower.contains(pattern) {
            return true;
        }
    }
    let stripped = lower.trim().trim_matches(|c: char| c.is_ascii_punctuation() || c.is_whitespace());
    if stripped.is_empty() || stripped.len() < 3 {
        return true;
    }
    false
}

/// Compute RMS (root-mean-square) level of audio samples
fn compute_rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum_sq: f64 = samples.iter().map(|&s| (s as f64) * (s as f64)).sum();
    (sum_sq / samples.len() as f64).sqrt() as f32
}

/// Check if audio chunk has meaningful content (not silence)
fn has_meaningful_audio(samples: &[f32]) -> bool {
    let rms = compute_rms(samples);
    log::debug!("Chunk RMS level: {:.6}", rms);
    rms > 0.003
}

/// Background transcription loop for meeting sessions.
/// Polls the session buffer every 5s, sends 30s chunks to Whisper.
pub async fn transcription_loop(app_handle: AppHandle, cancel: Arc<AtomicBool>) {
    log::info!("Meeting transcription loop started");

    loop {
        // Sleep 5 seconds between polls
        tokio::time::sleep(std::time::Duration::from_secs(5)).await;

        if cancel.load(Ordering::SeqCst) {
            log::info!("Meeting transcription loop cancelled");
            break;
        }

        // Check if session still active
        let is_active = if let Some(loopback) = get_loopback_ref() {
            let capture = loopback.lock().unwrap();
            capture.is_session_active()
        } else {
            false
        };

        if !is_active {
            log::info!("Meeting session no longer active, loop exiting");
            break;
        }

        // Try to get 30s chunk
        let chunk_samples = if let Some(loopback) = get_loopback_ref() {
            let capture = loopback.lock().unwrap();
            capture.take_next_chunk(30.0)
        } else {
            break;
        };

        let samples = match chunk_samples {
            Some(s) => s,
            None => continue, // not enough data yet, keep waiting
        };

        // Transcribe this chunk
        transcribe_and_emit(&app_handle, samples).await;
    }

    log::info!("Meeting transcription loop ended");
}

/// Process ALL remaining audio after session stops.
/// Called from stop_meeting_session_internal, not from the loop.
pub async fn process_all_remaining(app_handle: &AppHandle) {
    // Take all remaining audio (any size >= 1 second)
    let remaining = if let Some(loopback) = get_loopback_ref() {
        let capture = loopback.lock().unwrap();
        capture.take_remaining()
    } else {
        None
    };

    if let Some(samples) = remaining {
        log::info!("Processing remaining meeting audio: {} samples ({:.1}s)",
            samples.len(), samples.len() as f32 / 16000.0);
        transcribe_and_emit(app_handle, samples).await;
    } else {
        log::info!("No remaining meeting audio to process");
    }

    // Also try to grab any full chunks that the loop didn't get to
    loop {
        let chunk = if let Some(loopback) = get_loopback_ref() {
            let capture = loopback.lock().unwrap();
            capture.take_next_chunk(30.0)
        } else {
            None
        };

        match chunk {
            Some(samples) => {
                log::info!("Processing missed 30s chunk");
                transcribe_and_emit(app_handle, samples).await;
            }
            None => break,
        }
    }

    // Final remaining
    let final_remaining = if let Some(loopback) = get_loopback_ref() {
        let capture = loopback.lock().unwrap();
        capture.take_remaining()
    } else {
        None
    };

    if let Some(samples) = final_remaining {
        log::info!("Processing final remaining: {} samples ({:.1}s)",
            samples.len(), samples.len() as f32 / 16000.0);
        transcribe_and_emit(app_handle, samples).await;
    }
}

/// Transcribe audio samples and emit as transcript chunk
async fn transcribe_and_emit(app_handle: &AppHandle, samples: Vec<f32>) {
    if !has_meaningful_audio(&samples) {
        log::debug!("Meeting: skipping silent chunk ({} samples)", samples.len());
        return;
    }

    let wav_data = match encoder::encode_wav(&samples, 16000, 1) {
        Ok(d) => d,
        Err(e) => {
            log::error!("Meeting WAV encode error: {}", e);
            return;
        }
    };

    let (api_key, language) = {
        let state = app_handle.state::<AppState>();
        let db = state.db.lock().unwrap();
        match settings_repo::get_settings(&db) {
            Ok(s) => (s.openai_api_key.unwrap_or_default(), s.language),
            Err(_) => return,
        }
    };

    if api_key.is_empty() {
        return;
    }

    let client = OpenAIClient::new(&api_key);
    match client.transcribe(wav_data, &language).await {
        Ok(text) => {
            let text = text.trim().to_string();
            if !text.is_empty() && !is_hallucination(&text) {
                let elapsed = get_elapsed_secs(app_handle);
                let chunk = TranscriptChunk {
                    text: text.clone(),
                    timestamp_sec: elapsed as f64,
                };

                {
                    let state = app_handle.state::<AppState>();
                    let mut session = state.meeting_session.lock().unwrap();
                    if let Some(ref mut s) = *session {
                        s.transcript_chunks.push(chunk.clone());
                    }
                }

                let _ = app_handle.emit("meeting-transcript-chunk", &chunk);
                log::info!("Meeting chunk @{}s: {}", elapsed, &text[..text.len().min(60)]);
            } else if !text.is_empty() {
                log::info!("Meeting: filtered hallucination: {}", &text[..text.len().min(80)]);
            }
        }
        Err(e) => {
            log::error!("Meeting Whisper error: {}", e);
        }
    }
}

fn get_elapsed_secs(app_handle: &AppHandle) -> u64 {
    let state = app_handle.state::<AppState>();
    let session = state.meeting_session.lock().unwrap();
    if let Some(ref s) = *session {
        s.started_at.elapsed().map(|d| d.as_secs()).unwrap_or(0)
    } else {
        0
    }
}
