use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};

/// True WASAPI loopback capture for desktop audio
/// Uses IAudioClient with AUDCLNT_STREAMFLAGS_LOOPBACK
pub struct LoopbackCapture {
    running: Arc<AtomicBool>,
    buffer: Arc<Mutex<Vec<f32>>>,
    max_samples: usize,
    pub sample_rate: u32,
    pub channels: u16,
    // Meeting session: separate 16kHz mono buffer
    session_active: Arc<AtomicBool>,
    session_buffer: Arc<Mutex<Vec<f32>>>,
    session_chunk_cursor: Arc<Mutex<usize>>,
}

impl LoopbackCapture {
    pub fn new(buffer_secs: usize) -> Self {
        let sample_rate = 48000u32;
        let channels = 2u16;
        let max_samples = sample_rate as usize * channels as usize * buffer_secs;
        Self {
            running: Arc::new(AtomicBool::new(false)),
            buffer: Arc::new(Mutex::new(Vec::with_capacity(max_samples))),
            max_samples,
            sample_rate,
            channels,
            session_active: Arc::new(AtomicBool::new(false)),
            session_buffer: Arc::new(Mutex::new(Vec::new())),
            session_chunk_cursor: Arc::new(Mutex::new(0)),
        }
    }

    pub fn start_session_capture(&self) {
        // Clear session buffer and reset cursor
        {
            let mut buf = self.session_buffer.lock().unwrap();
            buf.clear();
            // Pre-allocate for ~90 min at 16kHz mono
            buf.reserve(16000 * 60 * 90);
        }
        {
            let mut cursor = self.session_chunk_cursor.lock().unwrap();
            *cursor = 0;
        }
        self.session_active.store(true, Ordering::SeqCst);
        log::info!("Session capture started (16kHz mono buffer)");
    }

    pub fn stop_session_capture(&self) {
        self.session_active.store(false, Ordering::SeqCst);
        log::info!("Session capture stopped");
    }

    pub fn is_session_active(&self) -> bool {
        self.session_active.load(Ordering::SeqCst)
    }

    /// Take the next chunk of session audio (30s worth of 16kHz mono samples).
    /// Returns None if not enough data yet, Some(samples) otherwise.
    pub fn take_next_chunk(&self, chunk_secs: f32) -> Option<Vec<f32>> {
        let chunk_samples = (16000.0 * chunk_secs) as usize;
        let buf = self.session_buffer.lock().unwrap();
        let mut cursor = self.session_chunk_cursor.lock().unwrap();

        if buf.len() < *cursor + chunk_samples {
            return None;
        }

        let chunk = buf[*cursor..*cursor + chunk_samples].to_vec();
        *cursor += chunk_samples;
        Some(chunk)
    }

    /// Get all session audio from cursor to end (for final partial chunk)
    pub fn take_remaining(&self) -> Option<Vec<f32>> {
        let buf = self.session_buffer.lock().unwrap();
        let mut cursor = self.session_chunk_cursor.lock().unwrap();

        if buf.len() <= *cursor {
            return None;
        }

        let remaining = buf[*cursor..].to_vec();
        *cursor = buf.len();
        if remaining.len() < 3200 { // less than 0.2s at 16kHz, too short for Whisper
            return None;
        }
        Some(remaining)
    }

    pub fn session_active_flag(&self) -> Arc<AtomicBool> {
        self.session_active.clone()
    }

    pub fn session_buffer_ref(&self) -> Arc<Mutex<Vec<f32>>> {
        self.session_buffer.clone()
    }

    pub fn start(&mut self) -> Result<(), String> {
        if self.running.load(Ordering::SeqCst) {
            return Ok(());
        }

        self.running.store(true, Ordering::SeqCst);
        let running = self.running.clone();
        let buffer = self.buffer.clone();
        let max_samples = self.max_samples;
        let session_active = self.session_active.clone();
        let session_buffer = self.session_buffer.clone();

        std::thread::spawn(move || {
            if let Err(e) = wasapi_loopback_thread(running.clone(), buffer, max_samples, session_active, session_buffer) {
                log::error!("WASAPI loopback error: {}", e);
                running.store(false, Ordering::SeqCst);
            }
        });

        log::info!("WASAPI loopback capture started");
        Ok(())
    }

    pub fn stop(&mut self) {
        self.running.store(false, Ordering::SeqCst);
        log::info!("WASAPI loopback capture stopped");
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    pub fn get_buffer(&self) -> Vec<f32> {
        self.buffer.lock().unwrap().clone()
    }

    pub fn running_flag(&self) -> Arc<AtomicBool> {
        self.running.clone()
    }

    pub fn buffer_ref(&self) -> Arc<Mutex<Vec<f32>>> {
        self.buffer.clone()
    }
}

/// Downsample stereo 48kHz to mono 16kHz (simple 3:1 decimation with averaging)
fn downsample_to_16k_mono(samples: &[f32], src_rate: u32, src_channels: u16) -> Vec<f32> {
    let ratio = src_rate as f64 / 16000.0;
    let ch = src_channels as usize;
    let total_frames = samples.len() / ch;
    let out_frames = (total_frames as f64 / ratio) as usize;
    let mut out = Vec::with_capacity(out_frames);

    for i in 0..out_frames {
        let src_frame = (i as f64 * ratio) as usize;
        if src_frame * ch + ch <= samples.len() {
            // Average all channels to mono
            let mut sum = 0.0f32;
            for c in 0..ch {
                sum += samples[src_frame * ch + c];
            }
            out.push(sum / ch as f32);
        }
    }
    out
}

/// Native WASAPI loopback capture thread
fn wasapi_loopback_thread(
    running: Arc<AtomicBool>,
    buffer: Arc<Mutex<Vec<f32>>>,
    max_samples: usize,
    session_active: Arc<AtomicBool>,
    session_buffer: Arc<Mutex<Vec<f32>>>,
) -> Result<(), String> {
    use windows::Win32::Media::Audio::*;
    use windows::Win32::System::Com::*;

    unsafe {
        // Initialize COM
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        // Get default audio endpoint (render device for loopback)
        let enumerator: IMMDeviceEnumerator = CoCreateInstance(
            &MMDeviceEnumerator,
            None,
            CLSCTX_ALL,
        ).map_err(|e| format!("Failed to create device enumerator: {}", e))?;

        let device = enumerator.GetDefaultAudioEndpoint(eRender, eConsole)
            .map_err(|e| format!("Failed to get default render endpoint: {}", e))?;

        let device_id = device.GetId()
            .map_err(|e| format!("Failed to get device ID: {}", e))?;
        log::info!("WASAPI loopback device: {:?}", device_id.to_string().unwrap_or_default());

        // Activate IAudioClient
        let audio_client: IAudioClient = device.Activate(CLSCTX_ALL, None)
            .map_err(|e| format!("Failed to activate audio client: {}", e))?;

        // Get mix format
        let mix_format_ptr = audio_client.GetMixFormat()
            .map_err(|e| format!("Failed to get mix format: {}", e))?;
        let mix_format = &*mix_format_ptr;

        let sample_rate = mix_format.nSamplesPerSec;
        let channels = mix_format.nChannels;
        let bits_per_sample = mix_format.wBitsPerSample;
        let block_align = mix_format.nBlockAlign;

        log::info!("WASAPI mix format: {}Hz, {} channels, {} bits, block_align={}",
            sample_rate, channels, bits_per_sample, block_align);

        // Initialize in loopback mode
        // AUDCLNT_STREAMFLAGS_LOOPBACK = 0x00020000
        let buffer_duration = 200_000i64; // 20ms in 100ns units

        audio_client.Initialize(
            AUDCLNT_SHAREMODE_SHARED,
            AUDCLNT_STREAMFLAGS_LOOPBACK,
            buffer_duration,
            0,
            mix_format_ptr,
            None,
        ).map_err(|e| format!("Failed to initialize loopback: {}", e))?;

        // Get capture client
        let capture_client: IAudioCaptureClient = audio_client.GetService()
            .map_err(|e| format!("Failed to get capture client: {}", e))?;

        // Start capturing
        audio_client.Start()
            .map_err(|e| format!("Failed to start capture: {}", e))?;

        log::info!("WASAPI loopback stream active — capturing desktop audio");

        // Capture loop
        while running.load(Ordering::SeqCst) {
            std::thread::sleep(std::time::Duration::from_millis(10));

            let mut packet_size = capture_client.GetNextPacketSize()
                .unwrap_or(0);

            while packet_size > 0 {
                let mut data_ptr = std::ptr::null_mut();
                let mut num_frames = 0u32;
                let mut flags = 0u32;

                let hr = capture_client.GetBuffer(
                    &mut data_ptr,
                    &mut num_frames,
                    &mut flags,
                    None,
                    None,
                );

                if hr.is_err() {
                    break;
                }

                let num_samples = num_frames as usize * channels as usize;

                // Convert to f32 based on format
                if num_samples > 0 && !data_ptr.is_null() {
                    // Check if AUDCLNT_BUFFERFLAGS_SILENT
                    let is_silent = (flags & 0x2) != 0;

                    let samples: Vec<f32> = if is_silent {
                        vec![0.0f32; num_samples]
                    } else if bits_per_sample == 32 {
                        // Float32 format
                        let float_ptr = data_ptr as *const f32;
                        std::slice::from_raw_parts(float_ptr, num_samples).to_vec()
                    } else if bits_per_sample == 16 {
                        // Int16 format
                        let int_ptr = data_ptr as *const i16;
                        let int_data = std::slice::from_raw_parts(int_ptr, num_samples);
                        int_data.iter().map(|&s| s as f32 / 32768.0).collect()
                    } else {
                        // Unknown format, skip
                        vec![0.0f32; num_samples]
                    };

                    // Write to ring buffer
                    {
                        let mut buf = buffer.lock().unwrap();
                        buf.extend_from_slice(&samples);
                        if buf.len() > max_samples {
                            let excess = buf.len() - max_samples;
                            buf.drain(..excess);
                        }
                    }

                    // Also feed session buffer if active (downsampled to 16kHz mono)
                    if session_active.load(Ordering::SeqCst) {
                        let downsampled = downsample_to_16k_mono(&samples, sample_rate, channels);
                        if !downsampled.is_empty() {
                            let mut sbuf = session_buffer.lock().unwrap();
                            // Cap at ~90 min of 16kHz mono
                            const MAX_SESSION_SAMPLES: usize = 16000 * 60 * 90;
                            if sbuf.len() < MAX_SESSION_SAMPLES {
                                sbuf.extend_from_slice(&downsampled);
                            }
                        }
                    }
                }

                let _ = capture_client.ReleaseBuffer(num_frames);

                packet_size = capture_client.GetNextPacketSize()
                    .unwrap_or(0);
            }
        }

        // Cleanup
        let _ = audio_client.Stop();
        CoUninitialize();

        log::info!("WASAPI loopback thread ended cleanly");
    }

    Ok(())
}
