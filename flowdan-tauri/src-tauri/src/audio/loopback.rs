use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};
use crate::audio::buffer::RingBuffer;

/// WASAPI loopback capture for desktop audio
/// Uses the windows crate for COM/WASAPI interop
pub struct LoopbackCapture {
    running: Arc<AtomicBool>,
    buffer: Arc<Mutex<RingBuffer>>,
    sample_rate: u32,
    channels: u16,
}

impl LoopbackCapture {
    pub fn new(buffer_secs: usize) -> Self {
        // Default to 48kHz stereo, will be updated when capture starts
        let sample_rate = 48000u32;
        let channels = 2u16;
        Self {
            running: Arc::new(AtomicBool::new(false)),
            buffer: Arc::new(Mutex::new(RingBuffer::new(buffer_secs, sample_rate, channels))),
            sample_rate,
            channels,
        }
    }

    pub fn start(&mut self) -> Result<(), String> {
        if self.running.load(Ordering::SeqCst) {
            return Ok(());
        }

        self.running.store(true, Ordering::SeqCst);
        let running = self.running.clone();
        let buffer = self.buffer.clone();

        // WASAPI loopback capture runs on a dedicated thread
        std::thread::spawn(move || {
            if let Err(e) = run_wasapi_loopback(running, buffer) {
                log::error!("WASAPI loopback error: {}", e);
            }
        });

        log::info!("Loopback capture started");
        Ok(())
    }

    pub fn stop(&mut self) {
        self.running.store(false, Ordering::SeqCst);
        log::info!("Loopback capture stopped");
    }

    pub fn read_last_seconds(&self, secs: usize) -> Vec<f32> {
        self.buffer.lock().unwrap().read_last(secs, self.sample_rate, self.channels)
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }

    pub fn channels(&self) -> u16 {
        self.channels
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }
}

/// Internal WASAPI loopback capture using cpal's WASAPI host
fn run_wasapi_loopback(
    running: Arc<AtomicBool>,
    buffer: Arc<Mutex<RingBuffer>>,
) -> Result<(), String> {
    use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

    // Use cpal's WASAPI host for loopback
    let host = cpal::default_host();

    // Get default output device for loopback
    let device = host.default_output_device()
        .ok_or_else(|| "No default output device for loopback".to_string())?;

    let config = device.default_output_config()
        .map_err(|e| format!("Failed to get output config: {}", e))?;

    log::info!("Loopback config: {:?}", config);

    // For loopback, we build an input stream on the output device
    // Note: This is a simplified approach. True WASAPI loopback would use
    // IAudioClient with AUDCLNT_STREAMFLAGS_LOOPBACK.
    // For now, we use cpal which may support loopback on some platforms.

    let buf = buffer.clone();
    let r = running.clone();

    let stream = match config.sample_format() {
        cpal::SampleFormat::F32 => {
            device.build_input_stream(
                &config.into(),
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    if r.load(Ordering::SeqCst) {
                        buf.lock().unwrap().write(data);
                    }
                },
                |err| log::error!("Loopback stream error: {}", err),
                None,
            ).map_err(|e| format!("Failed to build loopback stream: {}", e))?
        }
        _ => return Err("Unsupported sample format for loopback".to_string()),
    };

    stream.play().map_err(|e| format!("Failed to start loopback: {}", e))?;

    // Keep thread alive while running
    while running.load(Ordering::SeqCst) {
        std::thread::sleep(std::time::Duration::from_millis(100));
    }

    drop(stream);
    Ok(())
}
